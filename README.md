# Campusly

School LMS for students, teachers and parents — NestJS, GraphQL, Prisma, Next.js.

## Run locally

```bash
docker compose up -d                 # Postgres 17 + Redis 7

cd backend
cp .env.example .env                 # then fill in the JWT secrets and SEED_PASSWORD
pnpm install                         # also runs `prisma generate`
pnpm prisma migrate dev              # create the tables
pnpm prisma db seed                  # demo data (wipes the local DB first)
pnpm dev                             # API: http://localhost:3000/graphql

cd ../frontend
cp .env.example .env.local
pnpm install
pnpm dev                             # web: http://localhost:3001
```

## Demo accounts

Every seeded account uses the password you set in `SEED_PASSWORD` (`backend/.env`). It is never stored in git.

| Role | Login ID | Name | Notes |
|---|---|---|---|
| Admin | `simon` | Simon | |
| Teacher | `26200001` | Nilufar Karimova | Algebra · 9A, Algebra · 9B |
| Teacher | `26200002` | John Smith | English · 9A |
| Teacher | `26200003` | Bobur Aliyev | Physics · 9A |
| Student | `26100042` | Aziz Karimov | 9A, Homework 5 graded but not published yet |
| Student | `26100043` | Madina Karimova | 9B, Aziz's sister |
| Student | `26100033` | Jasurbek Tursunov | Temporary password, 2 sign-ins left |
| Student | `26100038` | Shakhzoda Ibragimova | Temporary password expired → must set a new one |
| Student | `26100037` | Sarvar Kadyrov | Blocked |
| Parent | `901112233` | Farrukh Karimov | Father of Aziz and Madina (login = last 9 phone digits) |
| Parent | `901114455` | Gulchehra Karimova | Mother of Aziz and Madina |

The seed has 20 students in 9A/9B, 20 parents, 4 courses with 8 weeks each, assignments with grades, attendance and announcements. "Today" in the demo data is 2026-10-17.

## Docs

- [docs/PLAN.md](docs/PLAN.md) — 14-day plan
- [docs/DECISIONS.md](docs/DECISIONS.md) — architecture decisions
