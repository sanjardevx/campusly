import type { ApolloClient } from '@apollo/client';
import { CREATE_SUBMISSION_UPLOAD } from '@/apollo/student/mutation';
import { CONFIRM_UPLOAD, CREATE_UPLOAD } from '@/apollo/teacher/mutation';
import type { MediaKind } from '@/libs/gql/graphql';

/**
 * The server's UPLOAD_RULES (backend libs/config.ts), repeated here only to stop a wrong file before
 * any request. The server checks again: these numbers are not the security rule.
 */
export const UPLOAD_LIMITS: Record<Exclude<MediaKind, 'OTHER'>, { types: string[]; maxBytes: number }> = {
  VIDEO: { types: ['video/mp4'], maxBytes: 2 * 1024 ** 3 },
  DOCUMENT: {
    types: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    maxBytes: 50 * 1024 ** 2,
  },
  IMAGE: { types: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 10 * 1024 ** 2 },
};

/** `accept` for an <input type="file"> */
export const acceptFor = (...kinds: (keyof typeof UPLOAD_LIMITS)[]) => kinds.flatMap((k) => UPLOAD_LIMITS[k].types).join(',');

export const kindOf = (file: File): keyof typeof UPLOAD_LIMITS | null =>
  (Object.keys(UPLOAD_LIMITS) as (keyof typeof UPLOAD_LIMITS)[]).find((k) => UPLOAD_LIMITS[k].types.includes(file.type)) ?? null;

/** Client-side check: an error code for the UI, or null */
export function checkFile(file: File, allowed: (keyof typeof UPLOAD_LIMITS)[]): 'FILE_TYPE' | 'FILE_TOO_LARGE' | null {
  const kind = kindOf(file);
  if (!kind || !allowed.includes(kind)) return 'FILE_TYPE';
  if (file.size > UPLOAD_LIMITS[kind].maxBytes) return 'FILE_TOO_LARGE';
  return null;
}

/** A video's length in seconds, read by the browser (the 90 % rule on the server uses it) */
function videoDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    const done = (value?: number) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.preload = 'metadata';
    video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? Math.round(video.duration) : undefined);
    video.onerror = () => done(undefined);
    video.src = url;
  });
}

/** PUT to S3 with progress (fetch has no upload progress, XMLHttpRequest does) */
function put(url: string, file: File, onProgress: (percent: number) => void, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    // The presigned URL signs the type: it must be exactly the one sent to createUpload
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`S3 ${xhr.status}`)));
    xhr.onerror = () => reject(new Error('NETWORK_ERROR'));
    xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'));
    signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(file);
  });
}

export type UploadPhase = 'PREPARING' | 'UPLOADING' | 'CHECKING' | 'READY' | 'FAILED';

/**
 * DECISIONS §11: the file never passes through our server.
 *   createUpload (server checks, presigned PUT) → PUT to S3 → confirmUpload (server asks S3) → READY
 * Returns the asset id; `onPhase` drives the UI states (uploading %, checking, ready).
 */
export async function uploadCourseFile(
  client: ApolloClient,
  courseId: string,
  file: File,
  onPhase: (phase: UploadPhase, percent?: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  const kind = kindOf(file);
  if (!kind) throw new Error('FILE_TYPE');
  onPhase('PREPARING');
  const durationSec = kind === 'VIDEO' ? await videoDuration(file) : undefined;
  const { data } = await client.mutate({
    mutation: CREATE_UPLOAD,
    variables: { input: { courseId, kind, fileName: file.name, mimeType: file.type, size: file.size, durationSec } },
  });
  const ticket = data!.createUpload;
  onPhase('UPLOADING', 0);
  await put(ticket.uploadUrl, file, (p) => onPhase('UPLOADING', p), signal);
  onPhase('CHECKING');
  await client.mutate({ mutation: CONFIRM_UPLOAD, variables: { assetId: ticket.assetId } });
  onPhase('READY');
  return ticket.assetId;
}

/** "pdf" → "application/pdf": an assignment lists the extensions it accepts (server MIME_EXTENSIONS) */
export const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/**
 * A student's file for one assignment: the same three steps as uploadCourseFile, but the ticket
 * comes from createSubmissionUpload, so the file can only be attached to this assignment.
 */
export async function uploadSubmissionFile(
  client: ApolloClient,
  assignmentId: string,
  file: File,
  onPhase: (phase: UploadPhase, percent?: number) => void,
  signal?: AbortSignal,
): Promise<string> {
  const kind = kindOf(file);
  if (kind !== 'DOCUMENT' && kind !== 'IMAGE') throw new Error('FILE_TYPE');
  onPhase('PREPARING');
  const { data } = await client.mutate({
    mutation: CREATE_SUBMISSION_UPLOAD,
    variables: { input: { assignmentId, kind, fileName: file.name, mimeType: file.type, size: file.size } },
  });
  const ticket = data!.createSubmissionUpload;
  onPhase('UPLOADING', 0);
  await put(ticket.uploadUrl, file, (p) => onPhase('UPLOADING', p), signal);
  onPhase('CHECKING');
  await client.mutate({ mutation: CONFIRM_UPLOAD, variables: { assetId: ticket.assetId } });
  onPhase('READY');
  return ticket.assetId;
}
