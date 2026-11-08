import { Inject, Injectable, Logger } from '@nestjs/common';
import { extractText, getDocumentProxy } from 'unpdf';
import { v7 as uuidv7 } from 'uuid';
import { Prisma } from '../../../../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TUTOR_INDEX_BATCH, TUTOR_PDF_LIMITS } from '../../libs/config';
import { errorReason } from '../../libs/utils/error-reason';
import { StorageService } from '../media/storage.service';
import { LLM_PROVIDER, type LlmProvider } from './llm/llm.provider';
import { TutorLimitsService } from './tutor-limits.service';
import { chunkText, sha256, toVectorLiteral } from './tutor-text';

/** One thing the tutor can read: a lesson's text, an assignment's text, or one PDF */
interface Source {
  key: string;
  hash: string;
  courseId: string;
  lessonId: string | null;
  assignmentId: string | null;
  kind: 'LESSON' | 'ASSIGNMENT' | 'FILE';
  title: string;
  /** When its lesson / assignment was created: the newest material is indexed first */
  createdAt: Date;
  /** Text sources carry the text; files are downloaded only when they need indexing */
  text?: string;
  file?: { s3Key: string; size: bigint };
}

/** A piece ready to embed; `page` only for PDFs */
interface Piece {
  text: string;
  page: number | null;
}

/**
 * Keeps the tutor's search index (DocumentChunk) in step with the course material. The batch
 * runs `sync()` every few minutes: every published lesson / assignment (not quizzes, not
 * tutor-OFF) and their PDFs are compared by hash with what is indexed, and only new or changed
 * sources are cut into pieces and embedded. Sources that disappeared lose their pieces.
 * Students see only what is visible to them: that is checked again at question time.
 */
@Injectable()
export class TutorIndexService {
  private readonly logger = new Logger('TutorIndex');
  /** Files that gave no text (scans, broken PDFs): not downloaded again until the batch restarts */
  private readonly skipped = new Set<string>();

  constructor(
    private readonly prismaService: PrismaService,
    private readonly storageService: StorageService,
    private readonly limits: TutorLimitsService,
    @Inject(LLM_PROVIDER) private readonly llm: LlmProvider | null,
  ) {}

  public get isEnabled(): boolean {
    return this.llm !== null;
  }

  /** `courseId`: only that course (tests; later a "re-read the materials now" button) */
  public async sync(
    courseId?: string,
  ): Promise<{ indexed: number; removed: number }> {
    if (!this.llm) return { indexed: 0, removed: 0 };
    const sources = await this.loadSources(courseId);
    const indexed = await this.prismaService.$queryRaw<
      { sourceKey: string; sourceHash: string }[]
    >`SELECT DISTINCT "sourceKey", "sourceHash" FROM document_chunks
      WHERE ${courseId ?? null}::uuid IS NULL OR "courseId" = ${courseId ?? null}::uuid`;
    const current = new Map(indexed.map((r) => [r.sourceKey, r.sourceHash]));

    // Gone (unpublished, removed, quiz, tutor OFF, archived course): drop their pieces
    const wanted = new Set(sources.map((s) => s.key));
    const gone = [...current.keys()].filter((key) => !wanted.has(key));
    if (gone.length) {
      await this.prismaService.documentChunk.deleteMany({
        where: { sourceKey: { in: gone } },
      });
    }

    const todo = sources
      .filter((s) => current.get(s.key) !== s.hash)
      .filter((s) => !this.skipped.has(`${s.key}:${s.hash}`))
      .slice(0, TUTOR_INDEX_BATCH);
    let done = 0;
    for (const source of todo) {
      try {
        await this.indexSource(this.llm, source);
        done++;
      } catch (err) {
        // One bad file must not stop the others; it is tried again on the next run
        this.logger.warn(`Could not index ${source.key}: ${errorReason(err)}`);
      }
    }
    return { indexed: done, removed: gone.length };
  }

  private async indexSource(llm: LlmProvider, source: Source): Promise<void> {
    const pieces = await this.readPieces(source);
    if (pieces.length === 0) {
      this.skipped.add(`${source.key}:${source.hash}`);
    }
    const rows: Prisma.Sql[] = [];
    let tokens = 0;
    for (const [order, piece] of pieces.entries()) {
      // The title goes into the embedded text: "Factoring — …" is found by "factoring"
      const embedding = await llm.embed(`${source.title}\n${piece.text}`);
      tokens += embedding.tokens;
      rows.push(
        Prisma.sql`(${uuidv7()}::uuid, ${source.courseId}::uuid, ${source.lessonId}::uuid,
          ${source.assignmentId}::uuid, ${source.key}, ${source.hash}, ${source.title},
          ${source.kind}, ${piece.page ? String(piece.page) : ''}, ${order}, ${piece.text},
          ${toVectorLiteral(embedding.vector)}::vector)`,
      );
    }
    await this.limits.addCost(llm.name, { embedTokens: tokens });
    // Old pieces out, new pieces in, in one transaction: a question never sees half of each
    await this.prismaService.$transaction(async (tx) => {
      await tx.documentChunk.deleteMany({ where: { sourceKey: source.key } });
      if (rows.length === 0) return;
      await tx.$executeRaw`
        INSERT INTO document_chunks ("id", "courseId", "lessonId", "assignmentId", "sourceKey",
          "sourceHash", "title", "kind", "locator", "order", "text", "embedding")
        VALUES ${Prisma.join(rows)}`;
    });
  }

  private async readPieces(source: Source): Promise<Piece[]> {
    if (source.text !== undefined) {
      return chunkText(source.text).map((text) => ({ text, page: null }));
    }
    const { s3Key, size } = source.file!;
    if (Number(size) > TUTOR_PDF_LIMITS.maxMb * 1024 * 1024) return [];
    const bytes = await this.storageService.download(s3Key);
    const pdf = await getDocumentProxy(bytes);
    if (pdf.numPages > TUTOR_PDF_LIMITS.maxPages) return [];
    const { text } = await extractText(pdf, { mergePages: false });
    return text.flatMap((pageText, i) =>
      chunkText(pageText).map((piece) => ({ text: piece, page: i + 1 })),
    );
  }

  /** Everything that should be in the index right now (only courses that are not drafts or archived) */
  private async loadSources(courseId?: string): Promise<Source[]> {
    const activeCourse = { status: 'ACTIVE' as const, id: courseId };
    const pdf = { status: 'READY' as const, mimeType: 'application/pdf' };
    const fileSelect = {
      id: true,
      s3Key: true,
      size: true,
      originalName: true,
    };

    const lessons = await this.prismaService.lesson.findMany({
      where: { publishedAt: { not: null }, module: { course: activeCourse } },
      select: {
        id: true,
        title: true,
        body: true,
        createdAt: true,
        module: { select: { courseId: true } },
        resources: {
          where: { asset: pdf },
          select: { id: true, title: true, asset: { select: fileSelect } },
        },
      },
    });
    const assignments = await this.prismaService.assignment.findMany({
      where: {
        publishedAt: { not: null },
        type: { not: 'QUIZ' },
        tutorMode: { not: 'OFF' },
        course: activeCourse,
      },
      select: {
        id: true,
        courseId: true,
        title: true,
        instructions: true,
        createdAt: true,
        files: {
          where: { removedAt: null, asset: pdf },
          select: { id: true, asset: { select: fileSelect } },
        },
      },
    });

    const sources: Source[] = [];
    const file = (
      key: string,
      base: Pick<
        Source,
        'courseId' | 'lessonId' | 'assignmentId' | 'createdAt'
      >,
      title: string,
      asset: { id: string; s3Key: string | null; size: bigint },
    ) => {
      if (!asset.s3Key) return;
      sources.push({
        key,
        hash: asset.id,
        ...base,
        kind: 'FILE',
        title,
        file: { s3Key: asset.s3Key, size: asset.size },
      });
    };

    for (const lesson of lessons) {
      const base = {
        courseId: lesson.module.courseId,
        lessonId: lesson.id,
        assignmentId: null,
        createdAt: lesson.createdAt,
      };
      const text = `${lesson.title}\n\n${lesson.body ?? ''}`;
      sources.push({
        key: `lesson:${lesson.id}`,
        hash: sha256(text),
        ...base,
        kind: 'LESSON',
        title: lesson.title,
        text,
      });
      for (const r of lesson.resources) {
        file(
          `lesson-file:${r.id}`,
          base,
          r.title || r.asset!.originalName,
          r.asset!,
        );
      }
    }
    for (const a of assignments) {
      const base = {
        courseId: a.courseId,
        lessonId: null,
        assignmentId: a.id,
        createdAt: a.createdAt,
      };
      const text = `${a.title}\n\n${a.instructions ?? ''}`;
      sources.push({
        key: `assignment:${a.id}`,
        hash: sha256(text),
        ...base,
        kind: 'ASSIGNMENT',
        title: a.title,
        text,
      });
      for (const f of a.files) {
        file(`assignment-file:${f.id}`, base, f.asset.originalName, f.asset);
      }
    }
    // Newest first: a teacher's new material (and the demo classes rebuilt every night) is
    // searchable within minutes, while an old backlog waits for the next runs
    return sources.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }
}
