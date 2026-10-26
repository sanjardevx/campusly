import './telegram-env';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { TelegramClient } from '../src/components/telegram/telegram.client';
import { PrismaService } from '../src/database/prisma.service';
import { RedisService } from '../src/database/redis.service';

// Needs Docker Postgres + Redis. Creates its own users ("e2e-tg-…"), fakes the Telegram API
// (no network) and removes everything afterwards, so it works on the empty CI database.
const PASSWORD = 'E2e-Telegram-Password-1';
const NEW_PASSWORD = 'E2e-Telegram-New-Password-2';
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET!;
const PARENT_LOGIN = '990001177'; // the last 9 digits of +998 99 000-11-77
const USERS = [
  { loginId: 'e2e-tg-student', role: 'STUDENT' },
  { loginId: 'e2e-tg-teacher', role: 'TEACHER' },
  { loginId: PARENT_LOGIN, role: 'PARENT' },
] as const;
// Telegram chat / user ids (in private chats they are the same number)
const PARENT_CHAT = 9_000_000_001;
const STUDENT_CHAT = 9_000_000_002;
const STRANGER_CHAT = 9_000_000_003;

interface Sent {
  chatId: string;
  text: string;
  markup?: unknown;
}
interface GqlBody<T> {
  data: T | null;
  errors?: { extensions: { code: string } }[];
}

describe('Telegram bot (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let redis: RedisService;
  const sent: Sent[] = [];
  const tokens: Record<string, string> = {};
  const ids: Record<string, string> = {};

  const fakeTelegram = {
    isEnabled: true,
    sendMessage: (chatId: string, text: string, markup?: unknown) => {
      sent.push({ chatId, text, markup });
      return Promise.resolve();
    },
  };

  /** What Telegram would POST for one message in a private chat */
  const update = (chat: number, message: object, secret = SECRET) =>
    request(app.getHttpServer())
      .post('/telegram/webhook')
      .set('X-Telegram-Bot-Api-Secret-Token', secret)
      .send({
        update_id: Date.now(),
        message: {
          chat: { id: chat, type: 'private' },
          from: { id: chat, language_code: 'en' },
          ...message,
        },
      });

  const lastTo = (chat: number) =>
    sent.filter((m) => m.chatId === String(chat)).at(-1);

  const chatIdOf = async (userId: string) =>
    (
      await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { telegramChatId: true },
      })
    ).telegramChatId;

  async function gql<T>(token: string, query: string) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query });
    return res.body as GqlBody<T>;
  }

  const login = (loginId: string, password: string) =>
    request(app.getHttpServer())
      .post('/auth/login')
      .send({ loginId, password });

  async function cleanUp() {
    const users = await prisma.user.findMany({
      where: { loginId: { in: USERS.map((u) => u.loginId) } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
    await prisma.oneTimeToken.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    const keys = await redis.keys('reset:*');
    if (keys.length) await redis.del(...keys);
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TelegramClient)
      .useValue(fakeTelegram)
      .compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    redis = app.get(RedisService);
    const failKeys = await redis.keys('login:fail:*');
    if (failKeys.length) await redis.del(...failKeys);

    await cleanUp();
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    for (const u of USERS) {
      const user = await prisma.user.create({
        data: {
          loginId: u.loginId,
          role: u.role,
          passwordHash,
          firstName: 'E2e',
          lastName: u.role,
        },
      });
      ids[u.role] = user.id;
      const res = await login(u.loginId, PASSWORD);
      tokens[u.role] = (res.body as { accessToken: string }).accessToken;
    }
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  it('refuses a webhook call without the right secret', async () => {
    await update(PARENT_CHAT, { text: '/start' }, 'wrong-secret').expect(403);
    await request(app.getHttpServer())
      .post('/telegram/webhook')
      .send({ update_id: 1 })
      .expect(403);
  });

  it('/start offers the "share my phone" button', async () => {
    await update(PARENT_CHAT, { text: '/start' }).expect(200);
    expect(lastTo(PARENT_CHAT)?.markup).toMatchObject({
      keyboard: [[{ request_contact: true }]],
    });
  });

  it('a forwarded contact of someone else links nobody (foreign user)', async () => {
    await update(STRANGER_CHAT, {
      contact: { phone_number: '+998990001177', user_id: PARENT_CHAT },
    }).expect(200);
    expect(lastTo(STRANGER_CHAT)?.text).toMatch(/your own phone number/);
    expect(await chatIdOf(ids.PARENT)).toBeNull();
  });

  it('a parent links by sharing their own contact', async () => {
    await update(PARENT_CHAT, {
      contact: { phone_number: '998990001177', user_id: PARENT_CHAT },
    }).expect(200);
    expect(lastTo(PARENT_CHAT)?.text).toMatch(/connected to Campusly/);
    expect(await chatIdOf(ids.PARENT)).toBe(String(PARENT_CHAT));
  });

  it('a student links with the one-time portal link; the code works once', async () => {
    const res = await gql<{ createTelegramLink: { url: string } }>(
      tokens.STUDENT,
      'mutation { createTelegramLink { url expiresAt } }',
    );
    const url = res.data!.createTelegramLink.url;
    expect(url).toMatch(/^https:\/\/t\.me\/campusly_e2e_bot\?start=[\w-]{32}$/);
    const code = new URL(url).searchParams.get('start')!;

    await update(STUDENT_CHAT, { text: `/start ${code}` }).expect(200);
    expect(await chatIdOf(ids.STUDENT)).toBe(String(STUDENT_CHAT));

    await update(STRANGER_CHAT, { text: `/start ${code}` }).expect(200);
    expect(lastTo(STRANGER_CHAT)?.text).toMatch(/expired or was already used/);
    expect(await chatIdOf(ids.STUDENT)).toBe(String(STUDENT_CHAT));
  });

  it('a teacher cannot use the Telegram queries (foreign user)', async () => {
    for (const query of [
      '{ telegramStatus { linked } }',
      'mutation { createTelegramLink { url } }',
    ]) {
      const res = await gql(tokens.TEACHER, query);
      expect(res.errors?.[0].extensions.code).toBe('FORBIDDEN');
    }
  });

  it('/reset sends a one-time link that sets a new password and signs out every session', async () => {
    await update(STRANGER_CHAT, { text: '/reset' }).expect(200);
    expect(lastTo(STRANGER_CHAT)?.text).toMatch(/not connected/);

    await update(STUDENT_CHAT, { text: '/reset' }).expect(200);
    const text = lastTo(STUDENT_CHAT)!.text;
    const token = /reset-password\?token=([\w-]+)/.exec(text)![1];

    const oldSession = await login('e2e-tg-student', PASSWORD);
    const oldCookie = oldSession.headers['set-cookie'];

    await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, newPassword: NEW_PASSWORD })
      .expect(204);

    await login('e2e-tg-student', PASSWORD).expect(401);
    await login('e2e-tg-student', NEW_PASSWORD).expect(200);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', oldCookie)
      .expect(401);

    // The same link a second time
    const again = await request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, newPassword: 'Another-Password-3' })
      .expect(400);
    expect((again.body as { code: string }).code).toBe('RESET_LINK_INVALID');

    const audit = await prisma.auditLog.count({
      where: { actorId: ids.STUDENT, action: 'user.telegramReset' },
    });
    expect(audit).toBe(1);
  });

  it('/unlink disconnects the chat', async () => {
    await update(PARENT_CHAT, { text: '/unlink' }).expect(200);
    expect(await chatIdOf(ids.PARENT)).toBeNull();
  });
});
