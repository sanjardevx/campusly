import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

// Needs the Docker Postgres + Redis (docker compose up -d)
describe('AppResolver (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('health reports Postgres and Redis as up', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .send({ query: '{ health { status postgres redis } }' })
      .expect(200);

    expect(res.body).toEqual({
      data: { health: { status: 'ok', postgres: true, redis: true } },
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
