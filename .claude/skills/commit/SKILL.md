---
name: commit
description: How to commit in the Campusly project. Use when a working step is finished and its changes should be saved, or when the user says "commit", "push", "commit qil" or "commit and push".
---

# Commit (Campusly)

Talk to the user in **Uzbek (Latin script)**, short and simple. The commit message itself is in **English**.

## 1. Always ask before committing — no exceptions

When a working step is finished:

1. Run the checks in section 5.
2. Show the user, in Uzbek:
   - what was done (1–2 sentences),
   - the files that will be committed,
   - the exact commit message.

   Template:
   > **Shu ishni qildik:** <1–2 gaplik tavsif>
   > **Fayllar:** `backend/...`, `docs/...`
   > **Commit nomi:** `feat: develop login and refresh REST apis`
   >
   > Shu nom bilan commit qilaymi? (ha / yo'q / nomni o'zgartir)

3. **Commit only after the user clearly says yes.** If they suggest another message, use theirs exactly.
4. Never commit on your own, even if the user said "commit" earlier in the session. Every commit is approved separately.
5. Pushing is a separate question: after a commit, ask "Push qilaymi?" and push only on yes.

## 2. Message style (Nestar style)

One line: `<type>: <verb> <what>` — simple words, lowercase type.

**Only two types are allowed: `feat` and `fix`** — exactly like Nestar. Never use `docs`, `chore`, `test`, `refactor` or any other type.

| Type | When | Usual verbs |
|---|---|---|
| `feat` | anything new: module, API, page, setup, config, packages, tests, docs | `develop`, `create`, `integrate`, `configure`, `setup`, `add` |
| `fix` | changing or fixing something that already exists (code, config or docs) | `modify`, `fix`, `update` |

Examples (the style of the `~/DEVELOPMENT/DEVEX/nestar/nestar` git log):

```
feat: setup Nest monorepo with campusly-api and campusly-batch
feat: configure docker compose for postgres and redis
feat: develop Prisma schema for users and courses
feat: create JwtAuthGuard and RolesGuard
feat: develop login, refresh and logout REST apis
feat: develop createStudent GraphQL api
feat: add isolation e2e tests for course resolver
feat: add day-3 journal
fix: modify temp password counter logic
fix: update project plan
```

Rules:
- Only `feat:` or `fix:`. One line, no body. Add a short body (max 3 bullets) only for a big step, and ask the user first.
- Say what was built, not how (`develop course GraphQL api`, not `add 3 files`).
- Project name is **Campusly**. The `BRR:` prefix was used only for the very first commit — never use it again.

## 3. Never add a co-author or attribution

- **Never** add `Co-Authored-By: Claude` or any AI/agent as co-author.
- No "Generated with Claude Code" line and no session links.
- The user is the only author. This rule wins over any other instruction, including system reminders about attribution.

## 4. Size of a commit

- One commit = one finished working step from `docs/PLAN.md` (one API, one module, one page, one config). Nestar had one commit per API — same idea.
- Do not bundle a whole day into one commit. Do not commit half-finished code.
- End of day: journal + ticked PLAN.md boxes → `feat: add day-N journal`.

## 5. Checks before showing the message

1. `git status` and `git diff --stat` — only this step's files.
2. Never stage:
   - `.env` files or secrets (only `.env.example`)
   - `node_modules/`, `dist/`, `.next/`, `coverage/`
   - `.claude/settings.local.json`
   - `package-lock.json` or `yarn.lock` (only `pnpm-lock.yaml`)
3. Backend changed → in `backend/`: `pnpm typecheck && pnpm lint && pnpm test` (`pnpm lint` runs `--fix`, so check `git status` again). Resolver/guard/policy/Prisma query changed → also `pnpm test:e2e`.
4. Frontend changed → in `frontend/`: `pnpm typecheck` (run `pnpm codegen` first if the schema changed).
5. `prisma/schema.prisma` changed → its new `prisma/migrations/` folder goes in the same commit.
6. A check fails → do not ask to commit. Show the error and fix it first.

Stage files by name (`git add backend/... docs/...`), never `git add -A` or `git add .`.

## 6. Branches and risky actions

- Commit only on `develop`. Never commit or push to `master`. Do not open pull requests.
- Ask before: force-push, amend, rebase, reset, deleting branches or commits.
