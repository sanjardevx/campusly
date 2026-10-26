import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SITE_CAROUSEL_MAX } from '../../libs/config';
import type { SiteHome, SitePersonPublic } from '../../libs/dto/site/site';
import type { SiteLocale } from '../../libs/enums/site.enum';
import { fromDbDate } from '../../libs/utils/date';
import { SiteImages } from './site-images';
import { inLocale } from './site-text';

/** The home page grid shows this many programs */
const HOME_PROGRAMS = 6;

/**
 * The public home page in one query (@Public): numbers, the News & Events slider, Programs &
 * clubs, Our team and the school contact. Only published, not archived content, in the
 * visitor's language (missing translations fall back to English). The Next.js page calls it
 * when it rebuilds (ISR), not on every visit.
 */
@Injectable()
export class SitePublicService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly images: SiteImages,
  ) {}

  public async home(locale: SiteLocale): Promise<SiteHome> {
    const now = new Date();
    const live = {
      status: 'PUBLISHED' as const,
      archivedAt: null,
      publishedAt: { lte: now },
    };
    const [students, teachers, programRows, carousel, people, settings] =
      await Promise.all([
        this.prismaService.user.count({
          where: { role: 'STUDENT', status: 'ACTIVE' },
        }),
        this.prismaService.user.count({
          where: { role: 'TEACHER', status: 'ACTIVE' },
        }),
        this.prismaService.siteProgram.findMany({
          where: { showOnSite: true, archivedAt: null },
          include: { photo: { select: { s3Key: true } } },
          orderBy: { order: 'asc' },
        }),
        this.prismaService.sitePost.findMany({
          where: { ...live, carouselOrder: { not: null } },
          include: { cover: { select: { s3Key: true } } },
          orderBy: { carouselOrder: 'asc' },
          take: SITE_CAROUSEL_MAX,
        }),
        this.prismaService.sitePerson.findMany({
          where: { showOnSite: true, archivedAt: null },
          include: { photo: { select: { s3Key: true } } },
          orderBy: [{ isDirector: 'desc' }, { order: 'asc' }],
        }),
        this.prismaService.schoolSetting.findUnique({ where: { id: 1 } }),
      ]);
    // Nothing chosen for the slider: the latest three published posts
    const posts = carousel.length
      ? carousel
      : await this.prismaService.sitePost.findMany({
          where: live,
          include: { cover: { select: { s3Key: true } } },
          orderBy: { publishedAt: 'desc' },
          take: 3,
        });

    const person = (p: (typeof people)[number]): SitePersonPublic => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      role: inLocale(p.role, locale) ?? '',
      note: inLocale(p.note, locale),
      photoUrl: this.images.url({ asset: p.photo, path: p.photoPath }),
    });
    const director = people.find((p) => p.isDirector);

    return {
      stats: {
        students,
        teachers,
        programs: programRows.length,
        founded: settings?.foundedYear ?? null,
      },
      posts: posts.map((p) => ({
        id: p.id,
        type: p.type,
        title: inLocale(p.title, locale) ?? '',
        summary: inLocale(p.summary, locale) ?? '',
        body: inLocale(p.body, locale),
        coverUrl: this.images.url({ asset: p.cover, path: p.coverPath }),
        date: p.eventDate
          ? fromDbDate(p.eventDate)
          : (p.publishedAt ?? p.createdAt).toISOString().slice(0, 10),
        startTime: p.startTime,
        endTime: p.endTime,
        place: inLocale(p.place, locale),
      })),
      programs: programRows.slice(0, HOME_PROGRAMS).map((p) => ({
        id: p.id,
        category: p.category,
        name: inLocale(p.name, locale) ?? '',
        gradeFrom: p.gradeFrom,
        gradeTo: p.gradeTo,
        levelNote: inLocale(p.levelNote, locale),
        days: p.days,
        startTime: p.startTime,
        endTime: p.endTime,
        description: inLocale(p.description, locale) ?? '',
        photoUrl: this.images.url({ asset: p.photo, path: p.photoPath }),
        videoUrl: p.videoUrl,
      })),
      director: director ? person(director) : null,
      team: people.filter((p) => !p.isDirector).map(person),
      contact: {
        schoolName: settings?.schoolName ?? 'Campusly School',
        phone: settings?.contactPhone ?? null,
        officeHours: settings?.officeHours ?? null,
        address: settings?.siteAddress ?? null,
        metro: settings?.siteMetro ?? null,
        email: settings?.siteEmail ?? null,
        telegramUrl: settings?.telegramUrl ?? null,
        instagramUrl: settings?.instagramUrl ?? null,
        youtubeUrl: settings?.youtubeUrl ?? null,
      },
    };
  }
}
