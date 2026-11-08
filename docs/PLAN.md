# Campusly — Build plan

How Campusly was built, step by step: the MVP (steps 1–13), deployment and the second-phase features (steps 14–21), then the full demo school, the live AI tutor and the finish (steps 22–25). Each step was tested and deployed before the next one. The decisions behind it are in [DECISIONS.md](DECISIONS.md).

---

## Overview

| Step | Focus |
|---|---|
| 1 | Setup: repo, folders, Nest + Next skeletons, docker-compose, packages, Prisma init, config, base modules |
| 2 | Database: full MVP `schema.prisma`, migration, `PrismaService`, seed |
| 3 | Auth: login / refresh / logout, rotation, rate limit, global guards, temp-password rules |
| 4 | Admin: ID generator, create student/teacher/parent, lists, CSV import, settings, AcademicYear/Period |
| 5 | Courses: course = subject × class, teachers, enrollment, modules (weeks), lessons |
| 6 | Media: S3 presigned upload, confirm, CloudFront signed URL, lesson progress |
| 7 | Assignments: create, submit (attempts), grade, publish, grade categories |
| 8 | Attendance, student overview, period grades, announcements, isolation tests |
| 9 | Frontend base: layouts, Apollo + auth, theme, i18n, login, password screens |
| 10 | Admin UI |
| 11 | Teacher UI |
| 12 | Student UI |
| 13 | Parent UI, mini landing + demo login, mobile pass |
| 14 | Backend deploy: Docker image, compose + Caddy, EC2, RDS, SSM, nightly demo reset |
| 15 | MVP live: domain DNS, Vercel, CORS, smoke test, budget alerts, admin Activity log |
| 16 | Telegram bot: account linking, password reset link |
| 17 | Quiz engine: MC / True-False / Number, timer, 1 attempt, auto-grade → gradebook |
| 18 | AI Study Tutor backend: course material → pgvector, Claude Haiku 5.5, SSE chat, limits; connect the UI |
| 19 | Public website + minimal CMS: News & Events, Programs, Our team, Enquiries |
| 20 | Public website, part 2: Mock tests, Open Courses, Honor Students; motion, sticky navbar, portal showcase, partners |
| 21 | Q&A, student / parent calendar page, bug fixes |
| 22 | Full school data: 1A–11B × 15 students, subjects by level, ~30 teachers, demo accounts in 9A / 11A |
| 23 | Partial nightly reset (only 9A / 11A + demo traces), demo rules, ADMIN out of the demo, prod switch |
| 24 | Demo entry ("Live demo" on the sign-in page), demo bar, Programs (IELTS / SAT / TOPIK / IT / Sport), footer disclaimer, real photos |
| 25 | AI tutor live, final smoke test, screenshots, OG image, uptime monitor, README, public-repo prep |

---

## Step 1 — Setup

**Goal:** an empty but working skeleton — Postgres + Redis in Docker, API answers `health` at `localhost:3000/graphql`, Next opens at `localhost:3001`, everything pushed.

- [x] GitHub repo `campusly` (private), `develop` + `master` branches, `.gitignore`, README.
- [x] `backend/`: Nest monorepo with `apps/campusly-api` + `apps/campusly-batch`.
- [x] `frontend/`: Next.js, Pages Router, TypeScript, no Tailwind, no `src/`, port 3001, `"packageManager": "pnpm@12.11.2"`.
- [x] Root `docker-compose.yml`: `postgres` (`pgvector/pgvector:pg17`, 5432, named volume) and `redis` (`redis:7-alpine`, 6379). `docker compose up -d`; connect with DBeaver and Redis Insight.
- [x] Backend packages (NestJS 11 majors, Prisma 7.10.0 + `@prisma/adapter-pg`): `@nestjs/graphql @nestjs/apollo @apollo/server @as-integrations/express5 graphql @nestjs/config @nestjs/jwt prisma @prisma/client class-validator class-transformer bcryptjs cookie-parser helmet ioredis @nestjs/bullmq bullmq dayjs uuid zod`; dev: `@types/bcryptjs @types/cookie-parser`. (AWS SDK, csv-parse, dataloader, pino, Sentry are added when they are needed.)
- [x] `prisma init`; `.env` + `.env.example` (`DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`, `PORT_API`); config validated with `zod`.
- [x] Base setup:
  - `main.ts`: `ValidationPipe({ whitelist: true })`, CORS only for `FRONTEND_URL` with credentials, `helmet`, `cookie-parser`; **no** `graphql-upload`, **no** `uploads/` static folder.
  - `app.module.ts`: GraphQL (Apollo, `autoSchemaFile`), `formatError` returns `extensions.code`.
  - `libs/`: `enums` (Role, UserStatus + `registerEnumType`), `types/common.ts`, `config.ts`, `interceptor/Logging.interceptor.ts` with redaction.
  - `health` query: `SELECT 1` on Postgres + `PING` on Redis.
- [x] Frontend packages: `@mui/material @emotion/react @emotion/styled @mui/icons-material @apollo/client graphql next-i18next i18next react-i18next jwt-decode dayjs sweetalert2`. One page that renders the `health` result.
- [x] `.github/workflows/ci.yml`: install → lint → typecheck for backend and frontend.

---

## Step 2 — Database

**Goal:** the whole MVP schema migrated and filled with realistic demo data.

- [x] `schema.prisma` with all MVP tables from DECISIONS.md §5 (UUID v7, `Timestamptz`, `Decimal`, `@@unique`, indexes on FKs, `@@map` to snake_case).
- [x] `prisma migrate dev --name init`.
- [x] `database/prisma.service.ts` + `database.module.ts`. Global `omit` for sensitive fields.
- [x] `prisma/seed.ts` (password from an env variable; Nilufar Karimova is the Algebra teacher): settings + academic year 2026–27 with 4 quarters; 1 admin, 3 teachers, 2 classes (9A, 9B), 20 students, their parents (incl. one parent with 2 children), 4 courses with weeks, lessons, assignments, some submissions, grades and attendance. Use the same demo names as the Stitch design (e.g. Aziz Karimov `26100042`, Nilufar Karimova).
- [x] `health` now also reports the migration state.

**Done when:** tables and seed data are visible in DBeaver; `pnpm prisma db seed` is repeatable.
---

## Step 3 — Auth

**Goal:** secure login for all 4 roles.

- [x] `components/auth/`: `AuthController` (REST) `POST /auth/login | /auth/refresh | /auth/logout`, `AuthService`.
- [x] Access JWT (15 min, `{ sub, role, sid }`), refresh token (random, sha256 in DB, httpOnly cookie `Path=/auth`), rotation + reuse detection + 10 s grace, role-based refresh lifetime.
- [x] Redis rate limit on login; uniform `INVALID_CREDENTIALS`.
- [x] Temp-password rule: decrement `tempPasswordUsesLeft` on each sign-in, check `tempPasswordExpiresAt`, set `mustChangePassword` when the limit is reached; return a `tempPasswordWarning` in the login response.
- [x] Global `JwtAuthGuard` + `RolesGuard`; decorators `@Public`, `@Roles`, `@CurrentUser` (the user goes to `req.user`).
- [x] `PASSWORD_CHANGE_REQUIRED`: only `me`, `changePassword`, `logout` work while `mustChangePassword` is true.
- [x] GraphQL `me` query and `changePassword` mutation (revokes other sessions via `sid`, returns a new access token).
- [x] e2e tests: login success / wrong password / rate limit / refresh rotation / reuse detection (+ blocked, logout, temp password); CI runs them with Postgres + Redis services.

**Done when:** login → refresh → logout works in Postman; e2e tests pass.
---

## Step 4 — Admin: users and school setup

- [x] ID generator (atomic upsert on `id_counters`) — unit test with parallel calls.
- [x] `createStudent` (generate ID + temp password; find-or-create parent by phone; link `ParentStudent`), `createTeacher`, `linkParent` (find-or-create by phone, re-activates an unlinked row), `unlinkParent` (sets `revokedAt`).
- [x] User lists with filters + pagination: students / teachers / parents.
- [x] `resetPassword`, `blockUser` / `unblockUser` (revokes tokens).
- [x] CSV import (`csv-parse`): validate rows, preview (ready / link parent / errors), import in a transaction, return login-slip data.
- [x] `SchoolSetting` get/update; `AcademicYear` and `Period` CRUD.
- [x] `AccessPolicy` (scope + assert methods, table-driven isolation test); `AuditLog` helper used by every admin mutation.

**Done when:** an admin can create a student with a parent, and both can log in with the printed temp passwords.
**Prerequisite:** AWS account ready by tonight.
---

## Step 5 — Courses

- [x] `Group` (class) + members; `Course` = subject × class with automatic enrollment of the class's students; split-group courses choose students.
- [x] `CourseTeacher`, `Enrollment` sync when a student joins/leaves a class.
- [x] `GradeCategory` created with school default weights for each new course.
- [x] `Module` (week) and `Lesson` CRUD with publish/hide.
- [x] Queries: `myCourses` (student), `teachingCourses` (teacher), `courseDetail` — all scoped through `AccessPolicy`.

---

## Step 6 — Media

- [x] S3 bucket (private) + CloudFront with OAC + key group.
- [x] `createUpload` (policy check, file type/size check, server-generated key, `MediaAsset UPLOADING`, presigned PUT) → `confirmUpload` (`HeadObject`, `READY`).
- [x] `lessonVideo(lessonId)`: `assertCanViewCourse`, CloudFront signed URL (~3 h), `resumeAt`.
- [x] `updateLessonProgress` (heartbeat), complete at 90%.
- [x] Batch cron: mark `UPLOADING` assets older than 24 h as `FAILED`.

---

## Step 7 — Assignments and grading

- [x] `Assignment` CRUD (category, `maxScore`, `dueAt`, `allowLate`, `maxAttempts`, accepted file types, `tutorMode`, optional `finalAnswer`); item type `EXAM` (offline, grade only).
- [x] `submitAssignment` with attempts and files (validate every `assetId` belongs to the student), statuses `DRAFT / SUBMITTED / LATE`, submission comments.
- [x] `gradeSubmission` (teacher of the course only), `giveZeroToMissing`, `publishGrades`.
- [x] One mapper hides score/feedback until `gradesPublishedAt`.
- [x] Quarter % from weighted categories (published grades only).

---

## Step 8 — Attendance, overview, period grades, announcements

- [x] `ClassSession` by date + `markAttendance` (bulk; every `studentId` must be enrolled), default `PRESENT`.
- [x] `studentOverview(studentId?)` with `resolveStudentScope` — shared by student, parent and admin.
- [x] `PeriodGrade`: live computation + `publishPeriodGrades` snapshot + manual `finalScore` override; annual grade.
- [x] Announcements: course or school-wide, pinned, `AnnouncementRead`, `eventDate`. (Attachments moved to later: no table for them yet.)
- [x] **Isolation test table** (DECISIONS.md §8): student vs other course, parent vs other child, teacher vs other teacher's course, unpublished grades, roster access.
- [x] Export the GraphQL schema for frontend codegen.

---

## Step 9 — Frontend base

- [x] layouts (Student, Teacher, Parent, Admin), `apollo/client.ts`, `apollo/store.ts`, `libs/auth`.
- [x] Apollo: access token in a module variable, auth link, `TokenRefreshLink` filled in (single-flight refresh), `errorLink` handles `UNAUTHENTICATED` and `PASSWORD_CHANGE_REQUIRED`; `clearStore()` on logout.
- [x] MUI theme from the design tokens; Plus Jakarta Sans via `next/font`.
- [x] `next-i18next` with `en` (default), `uz`, `ru`, `ko`; language switcher; error codes translated.
- [x] Pages: student/parent sign-in (tabs), teacher sign-in, temp-password banner, "Set a new password".
- [x] Role-based route guard; silent refresh + `me` on app start.
- [x] GraphQL Codegen setup.

---

## Step 10 — Admin UI

- [x] Users page: Students / Teachers / Parents tabs, filters, pagination, bulk actions (reset password, print login slips, block).
- [x] Add Student drawer (generate ID + password, parent step, link existing parent).
- [x] Import CSV (3 steps: upload → check → import & login slips PDF/print view).
- [x] Classes & Courses page + Add Course drawer.
- [x] Settings page (school info, academic year/periods, grading thresholds).
- [x] Records page: class lists, grades and attendance journals, report cards (CSV + print, every export audited).
- [x] Admin dashboard: KPI tiles, attendance donut, students needing attention (attendance), school calendar (holidays, events, deadlines, starts), recent activity, quick actions.

---

## Step 11 — Teacher UI

- [x] Dashboard: "Attendance to take", "Needs grading", my courses, recent announcements.
- [x] Course edit mode: weeks, lessons, upload video/file (with upload/processing states), New Homework drawer.
- [x] Grading table + single-submission view + publish grades.
- [x] Gradebook (category weights modal, quarter tabs, publish quarter grades).
- [x] Attendance page, announcements page + drawer.

---

## Step 12 — Student UI

- [x] Dashboard: "This week", To Do, my courses with progress.
- [x] Course page (weeks), lesson page with video player (resume, progress heartbeat, ID watermark).
- [x] Homework page (not submitted / submitted / graded states, upload).
- [x] Grades page (quarters + final, % and 5-point mark), announcements.

---

## Step 13 — Parent UI, landing, mobile

- [x] Parent dashboard with child switcher (child in URL), grades, attendance, missing assignments, announcements.
- [x] Logged-out home: mini landing + login + per-role "Demo login" buttons (`DEMO_MODE`).
- [x] Mobile pass for student and parent pages.
- [x] Domain DNS ready (done in step 15).

---

## Step 14 — Backend deploy

- [x] Backend Dockerfile (multi-stage) for api and batch; `docker-compose.prod.yml` (api, batch, redis, caddy) — following lessons 166–169, Caddy instead of Nginx; the image is built on EC2.
- [x] EC2 t4g.small: UFW, Docker, 2 GB swap, IAM role (no access keys on the box).
- [x] RDS Postgres 17 (with pgvector), SSM parameters → `.env.production`, `prisma migrate deploy`, seed demo.
- [x] Batch: nightly demo reset (cron).
- [x] The API answers `health` on EC2.

---

## Step 15 — MVP live

- [x] DNS: `campusly.uz` → Vercel, `api.campusly.uz` → EC2, `media.campusly.uz` → CloudFront (ACM certificate in us-east-1).
- [x] Frontend on Vercel (root `frontend/`), env vars; production CORS on the API and S3; the refresh cookie works across `campusly.uz` ↔ `api.campusly.uz`.
- [x] Smoke test all 4 roles on `campusly.uz`; AWS budget alerts on (zero-spend + monthly $35, DECISIONS §12).
- [x] Admin **Activity log** page — read-only `auditLogs(filter, page)` (action, user, date), with the before → after of each change (the rows are already written by every admin action).
- [x] Simple deploy script on EC2 (`git pull` + `docker compose up -d --build`); every later step ends with a deploy. CD: after CI passes on `develop`, GitHub Actions runs it through OIDC + SSM Run Command.

**Done when:** the demo works end-to-end on the real domain.

---

## Step 16 — Telegram bot

- [x] Webhook endpoint (`@Public()` + secret token header).
- [x] Account linking: a parent shares their phone contact (matched to the parent login); a student links with a one-time code.
- [x] Password reset through a one-time link (`OneTimeToken`); the "Reset in Telegram" button from Settings starts it.
- [ ] ~~Notifications through BullMQ~~ — cut (developer's choice, 2026-10-27): the bot only links accounts and resets passwords.
- [x] e2e + isolation tests; deploy.

---

## Step 17 — Quiz engine

- [x] `QuizQuestion`, `QuizAttempt`, `QuizAnswer` tables + migration.
- [x] Teacher editor: MC / True-False / Number questions, time limit (the "Quiz" item in the Add menu stops being "coming soon").
- [x] Student: timer, 1 attempt, time checked on the server, auto-grade → `Submission` score → gradebook.
- [x] Results go out through the existing "publish grades" flow.
- [x] Isolation tests; deploy.

---

## Step 18 — AI Study Tutor backend

- [x] Ingest lesson PDFs → chunks → Bedrock embeddings → pgvector (`DocumentChunk`).
- [x] `LlmProvider` + Bedrock Claude Haiku 5.5; SSE chat endpoint.
  - Deploy: Claude through the Anthropic API (Bedrock Claude blocked on the account): `ANTHROPIC_API_KEY` (SSM SecureString) + `TUTOR_PROVIDER=anthropic`; `iam-ec2-policy.json` gets InvokeModel on Titan Embeddings V2 (and the Bedrock Claude statement for later) — deploy README §14.
- [x] Help levels 1–4 and the assignment's `tutorMode`; off during quizzes.
- [x] Daily limit per student + global budget (Redis).
- [x] The `useTutor` stub calls the real API; a test proves parents cannot read tutor conversations; deploy.

---

## Step 19 — Public website + minimal CMS

- [x] CMS tables: News & Events, Programs, Our team, Enquiries + migration.
- [x] Admin CMS pages: list + drawer, publish / archive (no hard delete, audited).
- [x] Public pages from Stitch "Campusly Public": home, news, programs, team, contact form.
- [x] Enquiry form: rate limit, admin inbox.
- [x] Deploy (site content arrives with the nightly demo reset, 03:00 Tashkent).

---

## Step 20 — Public website, part 2

- [x] CMS tables + admin pages: Mock tests (date, start time, seats, price, contact person or phone; past tests drop off the site), Open Courses (YouTube lessons, publishing needs a lesson), Honor Students (a real student, the class at that time, shown only with the parent's consent and as a short name "Madina A.") + migrations, audited, archive instead of delete.
- [x] Their sections on the home page, in 4 languages; e2e tests for the new APIs.
- [x] Motion: Lenis smooth scroll, reveal on scroll, typewriter headline, numbers counting up, hover lifts; nothing moves with reduced motion.
- [x] Facilities section, team in rows of 4 + 3, admission timeline after the Jahon School reference that fills while scrolling.
- [x] Sticky glass navbar with the section links (a bottom sheet on phones).
- [x] Portal showcase: a MacBook and iPhones playing screenshots of the real portal (student / parent, 4 languages, `frontend/scripts/capture-portal-shots.mjs`); partners marquee.
- [x] Lighter site green (#2F7A63), faster hero slides.
- [x] Deploy (migrations + API; the site content arrives with the nightly demo reset, 03:00 Tashkent).

---

## Step 21 — Q&A, calendar, finish

- [x] Q&A: a student asks under a lesson, the teacher answers (`CourseQuestion`); the teacher dashboard card goes live.
- [x] Calendar page for students and parents (the `studentCalendar` API already exists).
- [x] Bug fixes; final smoke test of all 4 roles.

**Done when:** every step 15–21 feature works on `campusly.uz`.

---

## Step 22 — Full school data

- [x] Subjects by level (grades 1–4 / 5–9 / 10–11); ~30 teachers with realistic loads.
- [x] Classes 1A–11B, 15 students each (330), ~260 parents (siblings share a parent); invented Uzbek names.
- [x] Full data for every class: weeks, lessons, homework, quizzes, grades (bell curve), attendance (~93 %), late / missing work, announcements, Q&A.
- [x] Demo accounts: student in 9A, student in 11A, one parent with both of them, one teacher with many courses in 9A and 11A only. ADMIN is no longer a demo account.
- [x] `createMany`; the full seed runs in under 2 minutes; admin, teacher and Records pages checked with 330 students (pagination, speed).

---

## Step 23 — Partial reset and demo rules

- [x] Nightly reset rewrites only the 9A / 11A course data and the demo accounts' traces (submissions, attempts, tutor chats, reads, questions), moved to the current week; admin data and every other class stay untouched.
- [x] Demo accounts may write inside 9A / 11A; demo students may retake quizzes and resubmit homework; a small daily tutor limit for demo accounts; upload, password change, Telegram and admin stay blocked.
- [x] ADMIN removed from the demo login (API input + frontend).
- [x] e2e: the reset leaves admin rows and other classes untouched; a demo account cannot write outside 9A / 11A; blocked actions refuse.
- [x] Prod switch: one last full seed → the admin password is changed → from then on admin content persists.

---

## Step 24 — Demo entry and public site

- [x] "Live demo" on the sign-in page (`/portal` → `/login`; the public site links there): Student 9A / 11A, Parent, Teacher; `?demo=` deep link.
- [x] Demo bar: role switcher + "what to try" list.
- [x] Programs: IELTS, SAT, TOPIK, IT, Sport (4 languages) — public site only, the portal does not change.
- [x] Footer disclaimer: "Campusly is a portfolio project; the school and its people are fictional."
- [x] The developer's photos in `frontend/public/site`, as JPG under the same names (prod rows point at those paths and prod is not seeded again).

---

## Step 25 — Finish

- [x] AI tutor live on the Anthropic API (prepaid credit, auto-reload off), then tuned: answers start in about 2 s, the newest course material is indexed first.
- [x] Bug fixes; final smoke test of all 4 roles and the demo; the demo moves to the real school calendar (quarter 1 graded, quarter 2 running).
- [x] Logo and favicon, link-preview image, 404 / 500 pages; portal screenshots taken again; uptime monitor.
- [x] README for every reader (demo, features, architecture, stack), MIT license.
- [x] Public-repo prep: history checked for secrets, docs cleaned up.

**Done when:** the demo and the full school work on `campusly.uz`, and the repo is ready to go public.

---

## Backlog

Only if needed after the school's feedback:

- HLS (MediaConvert) + multipart upload — MP4 is enough for now.
- Socket.IO notifications — Telegram covers notifications.
- Tutor: PPTX ingestion (PDF only for now).
- Manual `finalScore` override UI; parent "More" page (notifications, Telegram, report a problem); longer refresh grace window for interrupted `/auth/refresh` calls.
