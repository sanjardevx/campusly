# Campusly

[![License: MIT](https://img.shields.io/badge/License-MIT-2F7A63.svg)](LICENSE)
[![Live demo](https://img.shields.io/badge/Live_demo-campusly.uz-1F4E43.svg)](https://campusly.uz)

**A learning platform for a private K-12 school** — one portal for students, teachers and parents, a public school website the school edits itself, and an AI study tutor that helps students with hints from their own course material.

![Campusly School website](docs/images/site-home.webp)

## Try it

Open **[campusly.uz](https://campusly.uz)** → **Campusly Portal** → **Live demo**. One click, no password: look around as a student (grade 9 or 11), a parent or a teacher.

The demo is an invented school with real-looking data: classes, lessons, homework, grades and attendance follow the real school calendar, and everything is reset every night, so feel free to click, submit and grade.

## What it does

**For students** — every course organised by school week: lessons with notes, PDFs and videos, homework with file upload, timed quizzes that grade themselves, grades and attendance per quarter, a calendar of what is due, school and course announcements, a place to ask the teacher questions, and an **AI Study Tutor** that gives step-by-step hints (never the final answer) from the course's own material.

**For teachers** — build each week's lessons, homework and quizzes; grade submissions with feedback; a gradebook with category weights and quarter grades; attendance; announcements; one inbox for students' questions.

**For parents** — each child's grades, attendance, calendar and announcements in one place, on a phone first. Parents see only published grades, and never a child's tutor conversations.

**For the school** — user and class management, school settings and calendar, an activity log, and a built-in editor for the public website: news and events, programs and clubs, the team, mock tests, free open courses, honor students and admission enquiries.

Available in **English, Uzbek, Russian and Korean**, with a Telegram bot for account linking and notifications.

| Student portal | On a phone | Parent portal |
|---|---|---|
| ![Student home](frontend/public/site/portal/en/student-web1.webp) | ![Student home on a phone](frontend/public/site/portal/en/student-phone1.webp) | ![Parent overview](frontend/public/site/portal/en/parent-web1.webp) |

## Architecture

```mermaid
flowchart LR
  user([Browser]) --> web["Web app<br/>Next.js · Vercel"]
  web -- "GraphQL · REST · streaming" --> api

  subgraph server ["Backend · Docker Compose on AWS"]
    api["API<br/>NestJS · GraphQL"]
    batch["Worker<br/>scheduled jobs + queues"]
    redis[("Redis")]
  end

  api --> pg[("PostgreSQL<br/>+ pgvector")]
  batch --> pg
  api --> redis
  batch --> redis
  api --> s3[("Private file storage<br/>S3 + CloudFront")]
  api --> llm["AI tutor<br/>Claude Haiku"]
  api --> emb["Embeddings<br/>Amazon Bedrock"]
  batch --> emb
  api --> tg["Telegram bot"]
```

- **Two backend programs, one codebase:** the API answers the web app; the worker runs scheduled jobs (nightly demo reset, indexing course material for the tutor, closing timed-out quizzes) and queued notifications. Both share one database schema.
- **Web app:** server-rendered public website (rebuilt from the CMS every few minutes) and a client-side portal that talks to the API over GraphQL.
- **Delivery:** every push runs type checks, linting and the full test suite against a real database; when it passes, the backend deploys itself to AWS and the web app to Vercel.

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, MUI 9, Apollo Client 4, GraphQL Codegen, next-i18next |
| Backend | NestJS 11, GraphQL (Apollo Server, code-first), Prisma 7, PostgreSQL 17 + pgvector, Redis 7, BullMQ |
| AI | Claude Haiku 5.5 (Anthropic API), Amazon Titan Text Embeddings V2 (Bedrock), retrieval with pgvector |
| Cloud & DevOps | AWS (EC2, RDS, S3, CloudFront, Bedrock), Docker Compose, Caddy, Vercel, GitHub Actions |
| Testing | Jest — 75 unit tests and 363 end-to-end tests, including access-isolation tests for every API operation |

## Engineering highlights

- **Secure by default.** Every API operation requires a signed-in user with the right role unless it is explicitly public, and every record is checked for ownership in one place: a student only ever reaches their own courses, a parent only their own children. Automated tests try every operation as the "wrong" user.
- **Careful sign-in.** Short-lived access tokens kept in memory, refresh tokens in an httpOnly cookie that rotates on every use and detects reuse of a stolen token.
- **Records are never lost.** Nothing is hard-deleted (archive + activity log), grades stay hidden from students and parents until the teacher publishes them, and quarter grades are a published snapshot computed by small, unit-tested functions.
- **An AI tutor that teaches.** Course material is split into pieces and indexed with embeddings; a student's question finds the closest material *of that course they are allowed to see*, and the model streams a short hint at one of four help levels. Daily limits and a school-wide budget keep costs predictable, and no names are sent to the model.
- **A demo that stays true.** The demo school is generated on the real calendar (one quarter finished and graded, the next one running) and rebuilt every night, so the live demo always looks like a school in the middle of its year.

## Run it locally

Needs Node 24, pnpm (`corepack enable`) and Docker.

```bash
docker compose up -d                 # PostgreSQL + Redis

cd backend
cp .env.example .env                 # fill in your own local values
pnpm install
pnpm prisma migrate dev              # create the tables
pnpm prisma db seed                  # generate the demo school (wipes the local database)
pnpm dev                             # API on http://localhost:3000/graphql

cd ../frontend
cp .env.example .env.local
pnpm install
pnpm dev                             # web app on http://localhost:3001
```

Backend tests: `pnpm test` (unit) and `pnpm test:e2e` (needs the Docker database). The AI tutor stays off locally unless a provider is configured; `TUTOR_PROVIDER=fake` gives canned answers without any API key.

## Project structure

```
backend/
  apps/campusly-api/      GraphQL + REST API (NestJS)
  apps/campusly-batch/    worker: scheduled jobs and queues
  prisma/                 database schema, migrations, demo-school generator
frontend/
  pages/                  public website, sign-in, student / teacher / parent / admin portals
  libs/components/        UI by area
  public/locales/         en, uz, ru, ko
docs/                     product and architecture decisions, build plan
```

## License

The code is released under the [MIT License](LICENSE). Photos and school content on the demo website are for demonstration only and are not covered by the license.
