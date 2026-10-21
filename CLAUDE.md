# CLAUDE.md — Campusly

Campusly is a K-12 learning platform (LMS) for one private school: roles ADMIN, TEACHER, STUDENT, PARENT.
It is a learning platform, **not** a school-management system (no timetable, rooms or homeroom).

- **Decisions:** [docs/DECISIONS.md](docs/DECISIONS.md) — read before designing anything. Do not contradict it silently.
- **Plan:** [docs/PLAN.md](docs/PLAN.md) — 14-day MVP. "Start day N" means: read PLAN.md + DECISIONS.md, then work through that day.
- **Journal:** `docs/journal/day-N.md` — written at the end of each day. **Local only** (git-ignored): never stage or commit it.

## Who you are working with

The developer is a bootcamp graduate building this as a portfolio project and must explain the **logic** of every part in job interviews.
They know NestJS + GraphQL + Mongoose (Nestar) and Express (Burak); Postgres, Prisma, Redis, S3 and Docker are new to them.

- **Reply in Uzbek (Latin script).** Code, identifiers, comments, commit messages and docs are in English.
- Keep explanations short and plain. They need the idea and the logic, not every detail.

## Teaching format (required before every implementation step)

Before writing code for a step, explain in 3 short parts:

1. **What we will do** — a mini plan of 3–5 bullets.
2. **Nestar → Campusly → why** — how Nestar did it, how we do it here, and which problem the change solves.
3. **Flow** — for logic or APIs, describe the request path, e.g.
   `request → JwtAuthGuard checks the token → RolesGuard checks the role → service loads the course → AccessPolicy checks ownership → response`.

Then implement in **small steps**. After each step: run it, show the result (query, test, screenshot of DB), then move on.
Never write a whole day of code in one go. If the step is trivial (installing a package), one line of "why" is enough.

## Commands

```bash
# infrastructure (repo root) — Docker Desktop must be running
docker compose up -d          # start Postgres + Redis
docker compose ps             # status
docker compose down -v        # stop and DELETE local data (fresh start)

# backend/
pnpm dev                      # campusly-api with watch (http://localhost:3000/graphql)
pnpm dev:batch                # campusly-batch worker
pnpm typecheck && pnpm lint
pnpm test                     # unit tests
pnpm test:e2e                 # e2e + isolation tests (needs Docker DB)
                              # pnpm dev / test:e2e rewrite backend/schema.gql (commit it; CI checks it)
pnpm prisma migrate dev --name <change>
pnpm prisma db seed
pnpm prisma studio

# frontend/
pnpm dev                      # http://localhost:3001
pnpm codegen                  # libs/gql types from ../backend/schema.gql (commit them; CI checks it)
```

Package manager is **pnpm 12.11.2** (corepack). Never use npm or yarn, never commit a second lockfile.

## Architecture map

```
backend/
  apps/campusly-api/src/
    main.ts, app.module.ts
    components/<module>/<module>.{module,resolver,service}.ts   # auth, user, course, lesson, media,
                                                                # assignment, attendance, grade, announcement
    components/auth/{guards,decorators,policies}/               # JwtAuthGuard, RolesGuard, @Public, @Roles,
                                                                # @CurrentUser, AccessPolicy
    libs/{dto/<module>, enums, types, config.ts, interceptor, utils}
    database/{prisma.service.ts, database.module.ts}
  apps/campusly-batch/src/                                      # BullMQ jobs, cron
  prisma/{schema.prisma, migrations/, seed.ts}
frontend/                                                       # Next.js Pages Router, like nestar-next
  pages/{index, login, student/, teacher/, parent/, _admin/}
  apollo/{client.ts, store.ts, <module>/{query,mutation}.ts}
  libs/{components, hooks, auth, enums, types, config.ts}
  public/locales/{en,uz,ru,ko}/
```

Reference implementations to port from: `~/DEVELOPMENT/DEVEX/nestar/nestar` (backend) and `~/DEVELOPMENT/DEVEX/nestar/nestar-next` (frontend).

## Code conventions

- Follow Nestar style: thin resolvers, logic in services, DTOs in `libs/dto/<module>/` with `class-validator`, enums with `registerEnumType`.
- Prisma replaces Mongoose: `this.prismaService.course.findMany(...)`. No repository layer, no generic base classes.
- Prefer simple, explicit code the developer can explain. Add a library only after saying why it is needed.
- Errors: throw Nest HTTP exceptions with a **code** (`INVALID_CREDENTIALS`, `NOT_FOUND`, `FORBIDDEN`, ...). Never compare error message strings.
- Frontend: MUI + design tokens from DECISIONS.md §13; every user-facing string goes through i18n (`en` default, plus `uz`, `ru`, `ko`).

## Non-negotiable rules

Security and data:
- Guards are global; new endpoints are protected unless explicitly `@Public()`.
- Every service method that takes an ID checks ownership through `AccessPolicy`. The client sends IDs only; ownership comes from the DB. Validate IDs inside input arrays too.
- Lists: `where: { AND: [policy.scope(user), filters] }` — never spread user filters into the scope.
- Access token in memory only (never localStorage). Refresh token = httpOnly cookie, `Path=/auth`, no `Domain`.
- Never log passwords or tokens. Never return `passwordHash` or temp-password fields.
- Student/parent views never show unpublished grades. Parents never see AI tutor conversations.
- No hard deletes — use `status` + `AuditLog`.
- IDs come from the atomic `id_counters` upsert, never `MAX() + 1`.
- Times are `Timestamptz` (UTC); business rules use `Asia/Tashkent`.

Process:
- Every new resolver gets at least one "foreign user" case in the isolation e2e tests.
- Never run `prisma db push` or `migrate reset` against anything but the local Docker DB.
- Never commit `.env` files or secrets; keep `.env.example` up to date when adding a variable.
- Commits: follow the `commit` skill (`.claude/skills/commit/SKILL.md`). One commit per finished step, Nestar style — only `feat:` (anything new) or `fix:` (changing existing things), e.g. `feat: develop login REST api`. No `docs`/`chore`/`test` types. **Always show the message and ask the developer before every commit and every push.** Never add `Co-Authored-By` or any AI attribution. Work on `develop`; never push to `master`.
- Do not install Turborepo, `graphql-upload`, or add school-management features (timetable, rooms).
- If a needed decision is not in DECISIONS.md, ask the developer, then record the answer there (with a Decision log line).

## Before the repo goes public

The repo is private while it is being built. When the developer makes it public (end of the project):
- Rewrite `docs/PLAN.md` and `docs/DECISIONS.md` as clean project docs: remove the "Nestar did X" comparisons and the time box (14 days, day-by-day deadlines).
- Purge `docs/journal/` from the git history (it was tracked until 2026-10-19).
- `CLAUDE.md` and `.claude/` stay.

## End of day checklist

1. Everything from the day runs; tests pass; `pnpm typecheck` is clean.
2. Tick the day's boxes in `docs/PLAN.md`.
3. Write `docs/journal/day-N.md` (local only, git-ignored): done (3–5 lines), deferred, 3 interview questions with short answers.
4. Propose the commit (commit skill), commit and push to `develop` only after the developer approves.
