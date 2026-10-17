# Campusly — 14-Day MVP Plan

Time box: 2 weeks, ~85 hours. **L** = long day (8 h), **S** = short day (3–4 h).
Decisions live in [DECISIONS.md](DECISIONS.md). Working rules for the agent live in [../CLAUDE.md](../CLAUDE.md).

When the user says **"start day N"**: read this file and DECISIONS.md, then follow the teaching format in CLAUDE.md.

**End of every day:**
1. Everything from the day runs locally (and its tests pass).
2. Commit + push to `develop` via the `commit` skill — always after the developer approves the message.
3. Write `docs/journal/day-N.md`: what was done (3–5 lines), what was deferred, and 3 interview questions with short answers.
4. Tick the checkboxes below.

**No buffer.** If behind schedule, cut in this order: CSV import → announcement read receipts → mobile polish → PeriodGrade publish.

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
| 14 | S | Deploy (EC2 + RDS + S3/CloudFront + Vercel) → demo ready |

**External prerequisites:** AWS account ready by the end of day 4 (S3 on day 6). Domain DNS ready by day 13.

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

- [ ] `components/auth/`: `AuthController` (REST) `POST /auth/login | /auth/refresh | /auth/logout`, `AuthService`.
- [ ] Access JWT (15 min, `{ sub, role }`), refresh token (random, sha256 in DB, httpOnly cookie `Path=/auth`), rotation + reuse detection + 10 s grace, role-based refresh lifetime.
- [ ] Redis rate limit on login; uniform `INVALID_CREDENTIALS`.
- [ ] Temp-password rule: decrement `tempPasswordUsesLeft` on each sign-in, check `tempPasswordExpiresAt`, set `mustChangePassword` when the limit is reached; return a `tempPasswordWarning` in the login response.
- [ ] Global `JwtAuthGuard` + `RolesGuard`; decorators `@Public`, `@Roles`, `@CurrentUser` (port of Nestar's guards; user goes to `req.user`, not `req.body`).
- [ ] `PASSWORD_CHANGE_REQUIRED`: only `me`, `changePassword`, `logout` work while `mustChangePassword` is true.
- [ ] GraphQL `me` query and `changePassword` mutation (revokes other sessions).
- [ ] e2e tests: login success / wrong password / rate limit / refresh rotation / reuse detection.

**Done when:** login → refresh → logout works in Postman; e2e tests pass.
**Interview:** Access vs refresh token? What happens if a refresh token is stolen? Why is the access token not in localStorage?

---

## Day 4 (L) — Admin: users and school setup

- [ ] ID generator (atomic upsert on `id_counters`) — unit test with parallel calls.
- [ ] `createStudent` (generate ID + temp password; find-or-create parent by phone; link `ParentStudent`), `createTeacher`, `createOrLinkParent`, `unlinkParent` (sets `revokedAt`).
- [ ] User lists with filters + pagination (Nestar "Inquiry" input style): students / teachers / parents.
- [ ] `resetPassword`, `blockUser` / `unblockUser` (revokes tokens).
- [ ] CSV import (`csv-parse`): validate rows, preview (ready / link parent / errors), import in a transaction, return login-slip data.
- [ ] `SchoolSetting` get/update; `AcademicYear` and `Period` CRUD.
- [ ] `AccessPolicy` skeleton; `AuditLog` helper used by every admin mutation.

**Done when:** an admin can create a student with a parent, and both can log in with the printed temp passwords.
**Prerequisite:** AWS account ready by tonight.
**Interview:** What if two admins create a student at the same moment? How does the CSV import avoid half-imported data?

---

## Day 5 (S) — Courses

- [ ] `Group` (class) + members; `Course` = subject × class with automatic enrollment of the class's students; split-group courses choose students.
- [ ] `CourseTeacher`, `Enrollment` sync when a student joins/leaves a class.
- [ ] `GradeCategory` created with school default weights for each new course.
- [ ] `Module` (week) and `Lesson` CRUD with publish/hide.
- [ ] Queries: `myCourses` (student), `teachingCourses` (teacher), `courseDetail` — all scoped through `AccessPolicy`.

**Interview:** What happens if a student sends another course's ID?

---

## Day 6 (S) — Media

- [ ] S3 bucket (private) + CloudFront with OAC + key group.
- [ ] `createUpload` (policy check, file type/size check, server-generated key, `MediaAsset UPLOADING`, presigned PUT) → `confirmUpload` (`HeadObject`, `READY`).
- [ ] `lessonVideo(lessonId)`: `assertCanViewCourse`, CloudFront signed URL (~3 h), `resumeAt`.
- [ ] `updateLessonProgress` (heartbeat), complete at 90%.
- [ ] Batch cron: mark `UPLOADING` assets older than 24 h as `FAILED`.

**Interview:** Why doesn't the file go through our server? What is a signed URL and why does it expire?

---

## Day 7 (S) — Assignments and grading

- [ ] `Assignment` CRUD (category, `maxScore`, `dueAt`, `allowLate`, `maxAttempts`, accepted file types, `tutorMode`, optional `finalAnswer`); item type `EXAM` (offline, grade only).
- [ ] `submitAssignment` with attempts and files (validate every `assetId` belongs to the student), statuses `DRAFT / SUBMITTED / LATE`, submission comments.
- [ ] `gradeSubmission` (teacher of the course only), `giveZeroToMissing`, `publishGrades`.
- [ ] One mapper hides score/feedback until `gradesPublishedAt`.
- [ ] Quarter % from weighted categories (published grades only).

**Interview:** How does a student not see an unpublished grade? How is the quarter percentage calculated?

---

## Day 8 (L) — Attendance, overview, period grades, announcements

- [ ] `ClassSession` by date + `markAttendance` (bulk; every `studentId` must be enrolled), default `PRESENT`.
- [ ] `studentOverview(studentId?)` with `resolveStudentScope` — shared by student, parent and admin.
- [ ] `PeriodGrade`: live computation + `publishPeriodGrades` snapshot + manual `finalScore` override; annual grade.
- [ ] Announcements: course or school-wide, pinned, attachments, `AnnouncementRead`, `eventDate`.
- [ ] **Isolation test table** (DECISIONS.md §8): student vs other course, parent vs other child, teacher vs other teacher's course, unpublished grades, roster access.
- [ ] Export the GraphQL schema for frontend codegen.

**Interview:** How do you prove a parent cannot see another child's data?

---

## Day 9 (L) — Frontend base

- [ ] Port from `nestar-next`: layouts (Student, Teacher, Parent, Admin), `apollo/client.ts`, `apollo/store.ts`, `libs/auth`.
- [ ] Apollo: access token in a module variable, auth link, `TokenRefreshLink` filled in (single-flight refresh), `errorLink` handles `UNAUTHENTICATED` and `PASSWORD_CHANGE_REQUIRED`; `clearStore()` on logout.
- [ ] MUI theme from the design tokens; Plus Jakarta Sans via `next/font`.
- [ ] `next-i18next` with `en` (default), `uz`, `ru`, `ko`; language switcher; error codes translated.
- [ ] Pages: student/parent sign-in (tabs), teacher sign-in, temp-password banner, "Set a new password".
- [ ] Role-based route guard; silent refresh + `me` on app start.
- [ ] GraphQL Codegen setup.

**Interview:** Where is the access token stored and why? What happens when it expires mid-session?

---

## Day 10 (L) — Admin UI

- [ ] Users page: Students / Teachers / Parents tabs, filters, pagination, bulk actions (reset password, print login slips, block).
- [ ] Add Student drawer (generate ID + password, parent step, link existing parent).
- [ ] Import CSV (3 steps: upload → check → import & login slips PDF/print view).
- [ ] Classes & Courses page + Add Course drawer.
- [ ] Settings page (school info, academic year/periods, grading thresholds).

---

## Day 11 (L) — Teacher UI

- [ ] Dashboard: "Attendance to take", "Needs grading", my courses, recent announcements.
- [ ] Course edit mode: weeks, lessons, upload video/file (with upload/processing states), New Homework drawer.
- [ ] Grading table + single-submission view + publish grades.
- [ ] Gradebook (category weights modal, quarter tabs, publish quarter grades).
- [ ] Attendance page, announcements page + drawer.

---

## Day 12 (S) — Student UI

- [ ] Dashboard: "This week", To Do, my courses with progress.
- [ ] Course page (weeks), lesson page with video player (resume, progress heartbeat, ID watermark).
- [ ] Homework page (not submitted / submitted / graded states, upload).
- [ ] Grades page (quarters + final, % and 5-point mark), announcements.

---

## Day 13 (S) — Parent UI, landing, mobile

- [ ] Parent dashboard with child switcher (child in URL), grades, attendance, missing assignments, announcements.
- [ ] Logged-out home: mini landing + login + per-role "Demo login" buttons (`DEMO_MODE`).
- [ ] Mobile pass for student and parent pages.
- [ ] Domain DNS ready.

---

## Day 14 (S) — Deploy

- [ ] Backend Dockerfile (multi-stage) for api and batch; `docker-compose.prod.yml` (api, batch, redis, caddy) on EC2 — following lessons 166–169, Caddy instead of Nginx.
- [ ] RDS Postgres (with pgvector), SSM parameters, `prisma migrate deploy`, seed demo.
- [ ] Frontend on Vercel (root `frontend/`), env vars, custom domain.
- [ ] Smoke test all 4 roles on `campusly.uz`; AWS budget alerts on.

**Done when:** the demo works end-to-end on the real domain.

---

## After day 14 (in order)

1. Telegram bot — password reset + notifications
2. Quiz engine
3. AI Study Tutor
4. Website CMS + public site
5. Q&A and calendar
6. HLS (MediaConvert) + multipart upload
7. Socket.IO notifications
