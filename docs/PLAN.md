# Campusly — Plan (MVP days 1–14, phase 2 days 15–20)

Time box: days 1–13 built the MVP (~85 hours); days 14–20 are all **L** days: deploy first, then the phase 2 features in a **minimal working version**, each deployed the same day. **L** = long day (8 h), **S** = short day (3–4 h).
The project must be finished by **day 20** (re-planned 2026-10-26; the old phase 2 estimate was ~18 days).
Decisions live in [DECISIONS.md](DECISIONS.md). Working rules for the agent live in [../CLAUDE.md](../CLAUDE.md).

When the user says **"start day N"**: read this file and DECISIONS.md, then follow the teaching format in CLAUDE.md.

**End of every day:**
1. Everything from the day runs locally (and its tests pass).
2. Commit + push to `develop` via the `commit` skill — always after the developer approves the message.
3. Write `docs/journal/day-N.md` (local only, git-ignored): what was done (3–5 lines), what was deferred, and 3 interview questions with short answers.
4. Tick the checkboxes below.

**No buffer.** If days 15–20 fall behind, cut in this order: Q&A → CMS reduced to News + Enquiries → quiz Number questions → Telegram notifications (password reset stays). Cut items go to the [Backlog](#backlog-after-day-20).

---

## Overview

| Day | Type | Focus |
|---|---|---|
| 1 | L | Setup: repo, folders, Nest + Next skeletons, docker-compose, packages, Prisma init, config, Nestar base |
| 2 | L | Database: full MVP `schema.prisma`, migration, `PrismaService`, seed |
| 3 | L | Auth: login / refresh / logout, rotation, rate limit, global guards, temp-password rules |
| 4 | L | Admin: ID generator, create student/teacher/parent, lists, CSV import, settings, AcademicYear/Period |
| 5 | S | Courses: course = subject × class, teachers, enrollment, modules (weeks), lessons |
| 6 | S | Media: S3 presigned upload, confirm, CloudFront signed URL, lesson progress |
| 7 | S | Assignments: create, submit (attempts), grade, publish, grade categories |
| 8 | L | Attendance, student overview, period grades, announcements, isolation tests |
| 9 | L | Frontend base: layouts, Apollo + auth, theme, i18n, login, password screens |
| 10 | L | Admin UI |
| 11 | L | Teacher UI |
| 12 | S | Student UI |
| 13 | S | Parent UI, mini landing + demo login, mobile pass |
| 14 | L | Backend deploy: Docker image, compose + Caddy, EC2, RDS, SSM, nightly demo reset |
| 15 | L | MVP live: domain DNS, Vercel, CORS, smoke test, budget alerts, admin Activity log |
| 16 | L | Telegram bot: account linking, password reset link, notifications (BullMQ) |
| 17 | L | Quiz engine: MC / True-False / Number, timer, 1 attempt, auto-grade → gradebook |
| 18 | L | AI Study Tutor backend: PDF → pgvector, Bedrock Haiku 5.5, SSE chat, limits; connect the UI |
| 19 | L | Public website + minimal CMS: News & Events, Programs, Our team, Enquiries |
| 20 | L | Q&A, student / parent calendar page, final fixes, README, public-repo prep → **done** |

**External prerequisites:** AWS account ready by the end of day 4 (S3 on day 6). Domain `campusly.uz` active with DNS access by day 15 (if not, days 15 and 16 swap). Bedrock Anthropic model access requested on day 14 (needed on day 18). Telegram bot token from BotFather by day 16.

---

## Day 1 (L) — Setup

**Goal:** an empty but working skeleton — Postgres + Redis in Docker, API answers `health` at `localhost:3000/graphql`, Next opens at `localhost:3001`, everything pushed.

- [x] GitHub repo `campusly` (private), `develop` + `master` branches, `.gitignore`, README.
- [x] `backend/`: Nest monorepo with `apps/campusly-api` + `apps/campusly-batch` (like `nestar-api` + `nestar-batch`).
- [x] `frontend/`: Next.js, Pages Router, TypeScript, no Tailwind, no `src/`, port 3001, `"packageManager": "pnpm@12.11.2"`.
- [x] Root `docker-compose.yml`: `postgres` (`pgvector/pgvector:pg17`, 5432, named volume) and `redis` (`redis:7-alpine`, 6379). `docker compose up -d`; connect with DBeaver and Redis Insight.
- [x] Backend packages (NestJS 11 majors, Prisma 7.10.0 + `@prisma/adapter-pg`): `@nestjs/graphql @nestjs/apollo @apollo/server @as-integrations/express5 graphql @nestjs/config @nestjs/jwt prisma @prisma/client class-validator class-transformer bcryptjs cookie-parser helmet ioredis @nestjs/bullmq bullmq dayjs uuid zod`; dev: `@types/bcryptjs @types/cookie-parser`. (AWS SDK, csv-parse, dataloader, pino, Sentry are added on the day they are needed.)
- [x] `prisma init`; `.env` + `.env.example` (`DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`, `PORT_API`); config validated with `zod`.
- [x] Port the Nestar base and fix its problems:
  - `main.ts`: `ValidationPipe({ whitelist: true })`, CORS only for `FRONTEND_URL` with credentials, `helmet`, `cookie-parser`; **no** `graphql-upload`, **no** `uploads/` static folder.
  - `app.module.ts`: GraphQL (Apollo, `autoSchemaFile`), `formatError` returns `extensions.code`.
  - `libs/`: `enums` (Role, UserStatus + `registerEnumType`), `types/common.ts`, `config.ts`, `interceptor/Logging.interceptor.ts` with redaction.
  - `health` query: `SELECT 1` on Postgres + `PING` on Redis.
- [x] Frontend packages: `@mui/material @emotion/react @emotion/styled @mui/icons-material @apollo/client graphql next-i18next i18next react-i18next jwt-decode dayjs sweetalert2`. One page that renders the `health` result.
- [x] `.github/workflows/ci.yml`: install → lint → typecheck for backend and frontend.
- [x] `docs/journal/day-1.md`.

**Interview:** Why Docker for local dev? Why Postgres instead of Mongo? Why validate env at startup?

---

## Day 2 (L) — Database

**Goal:** the whole MVP schema migrated and filled with realistic demo data.

- [x] `schema.prisma` with all MVP tables from DECISIONS.md §5 (UUID v7, `Timestamptz`, `Decimal`, `@@unique`, indexes on FKs, `@@map` to snake_case).
- [x] `prisma migrate dev --name init`.
- [x] `database/prisma.service.ts` + `database.module.ts` (replaces Nestar's Mongoose `database.module`). Global `omit` for sensitive fields.
- [x] `prisma/seed.ts` (password from `SEED_PASSWORD`, admin login `simon`, Nilufar Karimova is the Algebra teacher): settings + academic year 2026–27 with 4 quarters; 1 admin, 3 teachers, 2 classes (9A, 9B), 20 students, their parents (incl. one parent with 2 children), 4 courses with weeks, lessons, assignments, some submissions, grades and attendance. Use the same demo names as the Stitch design (e.g. Aziz Karimov `26100042`, Nilufar Karimova).
- [x] `health` now also reports the migration state.

**Done when:** tables and seed data are visible in DBeaver; `pnpm prisma db seed` is repeatable.
**Interview:** Why is `ParentStudent` many-to-many? Why no hard deletes? Why is `loginId` not the primary key?

---

## Day 3 (L) — Auth (most important day)

**Goal:** secure login for all 4 roles.

- [x] `components/auth/`: `AuthController` (REST) `POST /auth/login | /auth/refresh | /auth/logout`, `AuthService`.
- [x] Access JWT (15 min, `{ sub, role, sid }`), refresh token (random, sha256 in DB, httpOnly cookie `Path=/auth`), rotation + reuse detection + 10 s grace, role-based refresh lifetime.
- [x] Redis rate limit on login; uniform `INVALID_CREDENTIALS`.
- [x] Temp-password rule: decrement `tempPasswordUsesLeft` on each sign-in, check `tempPasswordExpiresAt`, set `mustChangePassword` when the limit is reached; return a `tempPasswordWarning` in the login response.
- [x] Global `JwtAuthGuard` + `RolesGuard`; decorators `@Public`, `@Roles`, `@CurrentUser` (port of Nestar's guards; user goes to `req.user`, not `req.body`).
- [x] `PASSWORD_CHANGE_REQUIRED`: only `me`, `changePassword`, `logout` work while `mustChangePassword` is true.
- [x] GraphQL `me` query and `changePassword` mutation (revokes other sessions via `sid`, returns a new access token).
- [x] e2e tests: login success / wrong password / rate limit / refresh rotation / reuse detection (+ blocked, logout, temp password); CI runs them with Postgres + Redis services.

**Done when:** login → refresh → logout works in Postman; e2e tests pass.
**Interview:** Access vs refresh token? What happens if a refresh token is stolen? Why is the access token not in localStorage?

---

## Day 4 (L) — Admin: users and school setup

- [x] ID generator (atomic upsert on `id_counters`) — unit test with parallel calls.
- [x] `createStudent` (generate ID + temp password; find-or-create parent by phone; link `ParentStudent`), `createTeacher`, `linkParent` (find-or-create by phone, re-activates an unlinked row), `unlinkParent` (sets `revokedAt`).
- [x] User lists with filters + pagination (Nestar "Inquiry" input style): students / teachers / parents.
- [x] `resetPassword`, `blockUser` / `unblockUser` (revokes tokens).
- [x] CSV import (`csv-parse`): validate rows, preview (ready / link parent / errors), import in a transaction, return login-slip data.
- [x] `SchoolSetting` get/update; `AcademicYear` and `Period` CRUD.
- [x] `AccessPolicy` (scope + assert methods, table-driven isolation test); `AuditLog` helper used by every admin mutation.

**Done when:** an admin can create a student with a parent, and both can log in with the printed temp passwords.
**Prerequisite:** AWS account ready by tonight.
**Interview:** What if two admins create a student at the same moment? How does the CSV import avoid half-imported data?

---

## Day 5 (S) — Courses

- [x] `Group` (class) + members; `Course` = subject × class with automatic enrollment of the class's students; split-group courses choose students.
- [x] `CourseTeacher`, `Enrollment` sync when a student joins/leaves a class.
- [x] `GradeCategory` created with school default weights for each new course.
- [x] `Module` (week) and `Lesson` CRUD with publish/hide.
- [x] Queries: `myCourses` (student), `teachingCourses` (teacher), `courseDetail` — all scoped through `AccessPolicy`.

**Interview:** What happens if a student sends another course's ID?

---

## Day 6 (S) — Media

- [x] S3 bucket (private) + CloudFront with OAC + key group.
- [x] `createUpload` (policy check, file type/size check, server-generated key, `MediaAsset UPLOADING`, presigned PUT) → `confirmUpload` (`HeadObject`, `READY`).
- [x] `lessonVideo(lessonId)`: `assertCanViewCourse`, CloudFront signed URL (~3 h), `resumeAt`.
- [x] `updateLessonProgress` (heartbeat), complete at 90%.
- [x] Batch cron: mark `UPLOADING` assets older than 24 h as `FAILED`.

**Interview:** Why doesn't the file go through our server? What is a signed URL and why does it expire?

---

## Day 7 (S) — Assignments and grading

- [x] `Assignment` CRUD (category, `maxScore`, `dueAt`, `allowLate`, `maxAttempts`, accepted file types, `tutorMode`, optional `finalAnswer`); item type `EXAM` (offline, grade only).
- [x] `submitAssignment` with attempts and files (validate every `assetId` belongs to the student), statuses `DRAFT / SUBMITTED / LATE`, submission comments.
- [x] `gradeSubmission` (teacher of the course only), `giveZeroToMissing`, `publishGrades`.
- [x] One mapper hides score/feedback until `gradesPublishedAt`.
- [x] Quarter % from weighted categories (published grades only).

**Interview:** How does a student not see an unpublished grade? How is the quarter percentage calculated?

---

## Day 8 (L) — Attendance, overview, period grades, announcements

- [x] `ClassSession` by date + `markAttendance` (bulk; every `studentId` must be enrolled), default `PRESENT`.
- [x] `studentOverview(studentId?)` with `resolveStudentScope` — shared by student, parent and admin.
- [x] `PeriodGrade`: live computation + `publishPeriodGrades` snapshot + manual `finalScore` override; annual grade.
- [x] Announcements: course or school-wide, pinned, `AnnouncementRead`, `eventDate`. (Attachments moved to later: no table for them yet.)
- [x] **Isolation test table** (DECISIONS.md §8): student vs other course, parent vs other child, teacher vs other teacher's course, unpublished grades, roster access.
- [x] Export the GraphQL schema for frontend codegen.

**Interview:** How do you prove a parent cannot see another child's data?

---

## Day 9 (L) — Frontend base

- [x] Port from `nestar-next`: layouts (Student, Teacher, Parent, Admin), `apollo/client.ts`, `apollo/store.ts`, `libs/auth`.
- [x] Apollo: access token in a module variable, auth link, `TokenRefreshLink` filled in (single-flight refresh), `errorLink` handles `UNAUTHENTICATED` and `PASSWORD_CHANGE_REQUIRED`; `clearStore()` on logout.
- [x] MUI theme from the design tokens; Plus Jakarta Sans via `next/font`.
- [x] `next-i18next` with `en` (default), `uz`, `ru`, `ko`; language switcher; error codes translated.
- [x] Pages: student/parent sign-in (tabs), teacher sign-in, temp-password banner, "Set a new password".
- [x] Role-based route guard; silent refresh + `me` on app start.
- [x] GraphQL Codegen setup.

**Interview:** Where is the access token stored and why? What happens when it expires mid-session?

---

## Day 10 (L) — Admin UI

- [x] Users page: Students / Teachers / Parents tabs, filters, pagination, bulk actions (reset password, print login slips, block).
- [x] Add Student drawer (generate ID + password, parent step, link existing parent).
- [x] Import CSV (3 steps: upload → check → import & login slips PDF/print view).
- [x] Classes & Courses page + Add Course drawer.
- [x] Settings page (school info, academic year/periods, grading thresholds).
- [x] Records page: class lists, grades and attendance journals, report cards (CSV + print, every export audited).
- [x] Admin dashboard: KPI tiles, attendance donut, students needing attention (attendance), school calendar (holidays, events, deadlines, starts), recent activity, quick actions.

---

## Day 11 (L) — Teacher UI

- [x] Dashboard: "Attendance to take", "Needs grading", my courses, recent announcements.
- [x] Course edit mode: weeks, lessons, upload video/file (with upload/processing states), New Homework drawer.
- [x] Grading table + single-submission view + publish grades.
- [x] Gradebook (category weights modal, quarter tabs, publish quarter grades).
- [x] Attendance page, announcements page + drawer.

---

## Day 12 (S) — Student UI

- [x] Dashboard: "This week", To Do, my courses with progress.
- [x] Course page (weeks), lesson page with video player (resume, progress heartbeat, ID watermark).
- [x] Homework page (not submitted / submitted / graded states, upload).
- [x] Grades page (quarters + final, % and 5-point mark), announcements.

---

## Day 13 (S) — Parent UI, landing, mobile

- [x] Parent dashboard with child switcher (child in URL), grades, attendance, missing assignments, announcements.
- [x] Logged-out home: mini landing + login + per-role "Demo login" buttons (`DEMO_MODE`).
- [x] Mobile pass for student and parent pages.
- [ ] Domain DNS ready. → moved to day 15 (`campusly.uz` is registered at aHOST, waiting for activation).

---

## Day 14 (L) — Backend deploy

- [x] Backend Dockerfile (multi-stage) for api and batch; `docker-compose.prod.yml` (api, batch, redis, caddy) — following lessons 166–169, Caddy instead of Nginx; the image is built on EC2.
- [x] EC2 t4g.small: UFW, Docker, 2 GB swap, IAM role (no access keys on the box).
- [x] RDS Postgres 17 (with pgvector), SSM parameters → `.env.production`, `prisma migrate deploy`, seed demo.
- [x] Batch: nightly demo reset (cron).
- [x] The API answers `health` on EC2.

**Developer:** request Bedrock Anthropic model access in the AWS console today (approval can take time; needed on day 18).

---

## Day 15 (L) — MVP live

- [x] DNS: `campusly.uz` → Vercel, `api.campusly.uz` → EC2, `media.campusly.uz` → CloudFront (ACM certificate in us-east-1).
- [x] Frontend on Vercel (root `frontend/`), env vars; production CORS on the API and S3; the refresh cookie works across `campusly.uz` ↔ `api.campusly.uz`.
- [x] Smoke test all 4 roles on `campusly.uz`; AWS budget alerts on (zero-spend + monthly $35, DECISIONS §12).
- [x] Admin **Activity log** page — read-only `auditLogs(filter, page)` (action, user, date), with the before → after of each change (the rows are already written by every admin action).
- [x] Simple deploy script on EC2 (`git pull` + `docker compose up -d --build`); every later day ends with a deploy. CD: after CI passes on `develop`, GitHub Actions runs it through OIDC + SSM Run Command.

**Done when:** the demo works end-to-end on the real domain. If the domain is not active yet, swap days 15 and 16 (the refresh cookie needs the frontend and the API under one site).

---

## Day 16 (L) — Telegram bot

- [x] Webhook endpoint (`@Public()` + secret token header).
- [x] Account linking: a parent shares their phone contact (matched to the parent login); a student links with a one-time code.
- [x] Password reset through a one-time link (`OneTimeToken`); the "Reset in Telegram" button from Settings starts it.
- [ ] ~~Notifications through BullMQ~~ — cut (developer's choice, 2026-10-27): the bot only links accounts and resets passwords.
- [x] e2e + isolation tests; deploy.

**Developer:** bot token from BotFather.

---

## Day 17 (L) — Quiz engine

- [x] `QuizQuestion`, `QuizAttempt`, `QuizAnswer` tables + migration.
- [x] Teacher editor: MC / True-False / Number questions, time limit (the "Quiz" item in the Add menu stops being "coming soon").
- [x] Student: timer, 1 attempt, time checked on the server, auto-grade → `Submission` score → gradebook.
- [x] Results go out through the existing "publish grades" flow.
- [x] Isolation tests; deploy.

---

## Day 18 (L) — AI Study Tutor backend

- [x] Ingest lesson PDFs → chunks → Bedrock embeddings → pgvector (`DocumentChunk`).
- [x] `LlmProvider` + Bedrock Claude Haiku 5.5; SSE chat endpoint.
  - Deploy: Claude through the Anthropic API (Bedrock Claude blocked on the account): `ANTHROPIC_API_KEY` (SSM SecureString) + `TUTOR_PROVIDER=anthropic`; `iam-ec2-policy.json` gets InvokeModel on Titan Embeddings V2 (and the Bedrock Claude statement for later) — deploy README §14.
- [x] Help levels 1–4 and the assignment's `tutorMode`; off during quizzes.
- [x] Daily limit per student + global budget (Redis).
- [x] The `useTutor` stub calls the real API; a test proves parents cannot read tutor conversations; deploy.

---

## Day 19 (L) — Public website + minimal CMS

- [x] CMS tables: News & Events, Programs, Our team, Enquiries + migration.
- [x] Admin CMS pages: list + drawer, publish / archive (no hard delete, audited).
- [x] Public pages from Stitch "Campusly Public": home, news, programs, team, contact form.
- [x] Enquiry form: rate limit, admin inbox.
- [x] Deploy (site content arrives with the nightly demo reset, 03:00 Tashkent).

---

## Day 20 (L) — Q&A, calendar, finish

- [ ] Q&A: a student asks under a lesson, the teacher answers (`CourseQuestion`); the teacher dashboard card goes live.
- [ ] Calendar page for students and parents (the `studentCalendar` API already exists).
- [ ] AI tutor live: buy the Anthropic API key ($5 prepaid, auto-reload off) → test call → SSM `ANTHROPIC_API_KEY` + `TUTOR_PROVIDER=anthropic` together → deploy → smoke-test the tutor on campusly.uz (deploy README §14).
- [ ] Bug fixes; final smoke test of all 4 roles.
- [ ] README: architecture diagram, demo accounts, screenshots.
- [ ] Public-repo prep (see CLAUDE.md "Before the repo goes public"; purging the journal history only after the developer approves).

**Done when:** every day 15–20 feature works on `campusly.uz`, and the repo is ready to go public.

---

## Backlog (after day 20)

Only if needed after the school's feedback:

- HLS (MediaConvert) + multipart upload — MP4 is enough for now.
- Socket.IO notifications — Telegram covers notifications.
- Public site: Mock tests, Open Courses, Honor Students.
- Tutor: PPTX ingestion (PDF only for now).
- Manual `finalScore` override UI; parent "More" page (notifications, Telegram, report a problem); longer refresh grace window for interrupted `/auth/refresh` calls.
