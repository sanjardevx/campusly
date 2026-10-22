import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { setupApp } from './../src/app.setup';

// Needs the Docker Postgres + Redis (docker compose up -d)

/** Folders are named <timestamp>_<name>, so the last one in sort order is the newest */
const latestMigration = readdirSync(
  join(__dirname, '../../../prisma/migrations'),
)
  .filter((name) => /^\d{14}_/.test(name))
  .sort()
  .at(-1);
describe('AppResolver (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('health reports Postgres, Redis and the latest migration', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ health { status postgres redis migration } }' })
      .expect(200);

    expect(res.body).toEqual({
      data: {
        health: {
          status: 'ok',
          postgres: true,
          redis: true,
          // The newest migration folder: the database is fully migrated
          migration: latestMigration,
        },
      },
    });
  });

  it('protected query without a token returns UNAUTHENTICATED (global guard + our error code)', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ me { id } }' });
    const body = res.body as {
      data: unknown;
      errors: { message: string; extensions: unknown }[];
    };

    expect(body.data).toBeNull();
    expect(body.errors[0]).toMatchObject({
      message: 'Please sign in',
      extensions: { code: 'UNAUTHENTICATED' },
    });
  });

  it('returns an error code, not only a message', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ unknownField }' });
    const body = res.body as { errors: { extensions: unknown }[] };

    expect(body.errors[0].extensions).toEqual({
      code: 'GRAPHQL_VALIDATION_FAILED',
    });
  });
});
