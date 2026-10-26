import './tutor-env';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';
import { RedisService } from '../src/database/redis.service';
import { SITE_CAROUSEL_MAX } from '../src/libs/config';

// Needs Docker Postgres + Redis. Works next to the seeded demo content: everything it creates is
// tagged "E2E Site" and removed after.
const PASSWORD = 'E2e-Site-Password-1';
const TAG = 'E2E Site';

type Key = 'admin' | 'teacher' | 'student' | 'parent';
interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}
interface PublicPost {
  id: string;
  title: string;
  summary: string;
}

const POST_FIELDS = 'id status carouselPosition title { en uz ru ko }';
const en = (text: string) => ({ en: `${TAG} ${text}` });

describe('Public website CMS: admin content, public home, enquiries (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let redis: RedisService;
  const token = {} as Record<Key, string>;

  async function gql<T>(query: string, variables: object = {}, as?: Key) {
    const req = request(app.getHttpServer()).post('/graphql');
    if (as) req.set('Authorization', `Bearer ${token[as]}`);
    const res = await req.send({ query, variables });
    return res.body as GqlBody<T>;
  }
  const code = (body: GqlBody<unknown>) => body.errors?.[0].extensions.code;

  const savePost = (input: object, as: Key = 'admin') =>
    gql<{
      saveSitePost: {
        id: string;
        status: string;
        carouselPosition: number | null;
      };
    }>(
      `mutation($i: SaveSitePostInput!) { saveSitePost(input: $i) { ${POST_FIELDS} } }`,
      {
        i: {
          type: 'NEWS',
          title: en('post'),
          summary: { en: 'Short text', ko: '짧은 글' },
          publish: 'NOW',
          ...input,
        },
      },
      as,
    );
  const home = async (locale: string) =>
    (
      await gql<{
        siteHome: {
          posts: PublicPost[];
          team: { name: string; role: string }[];
        };
      }>(
        `query($l: SiteLocale!) { siteHome(locale: $l) { posts { id title summary } team { name role } } }`,
        { l: locale },
      )
    ).data!.siteHome;
  const submit = (input: object) =>
    gql<{ submitEnquiry: boolean }>(
      `mutation($i: SubmitEnquiryInput!) { submitEnquiry(input: $i) }`,
      {
        i: {
          parentName: `${TAG} Parent`,
          phone: '90 111 22 33',
          locale: 'ko',
          ...input,
        },
      },
    );

  async function cleanUp() {
    const users = await prisma.user.findMany({
      where: { lastName: TAG },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    await prisma.sitePost.deleteMany({
      where: { title: { path: ['en'], string_starts_with: TAG } },
    });
    await prisma.siteProgram.deleteMany({
      where: { name: { path: ['en'], string_starts_with: TAG } },
    });
    await prisma.sitePerson.deleteMany({ where: { lastName: TAG } });
    await prisma.enquiry.deleteMany({
      where: { parentName: { startsWith: TAG } },
    });
    await prisma.mediaAsset.deleteMany({ where: { ownerId: { in: ids } } });
    await prisma.auditLog.deleteMany({ where: { actorId: { in: ids } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    for (const key of await redis.keys('enquiry:ip:*')) await redis.del(key);
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    redis = app.get(RedisService);
    await cleanUp();

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    for (const [key, role] of [
      ['admin', 'ADMIN'],
      ['teacher', 'TEACHER'],
      ['student', 'STUDENT'],
      ['parent', 'PARENT'],
    ] as const) {
      await prisma.user.create({
        data: {
          loginId: `e2e-site-${key}`,
          role,
          passwordHash,
          firstName: key,
          lastName: TAG,
        },
      });
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ loginId: `e2e-site-${key}`, password: PASSWORD });
      token[key] = (res.body as { accessToken: string }).accessToken;
    }
  });

  afterAll(async () => {
    await cleanUp();
    await app.close();
  });

  it('only admins may read or change the CMS (foreign users)', async () => {
    for (const who of ['teacher', 'student', 'parent'] as const) {
      expect(code(await gql('{ adminSitePosts { id } }', {}, who))).toBe(
        'FORBIDDEN',
      );
      expect(
        code(await gql('{ adminEnquiries(input: {}) { new } }', {}, who)),
      ).toBe('FORBIDDEN');
      expect(code(await savePost({}, who))).toBe('FORBIDDEN');
    }
    // Signed out: the CMS asks for a token, the home page does not
    expect(code(await gql('{ adminSitePosts { id } }'))).toBe(
      'UNAUTHENTICATED',
    );
    expect(
      (await gql('{ siteHome(locale: en) { stats { students } } }')).errors,
    ).toBeUndefined();
  });

  it('a published post shows on the home page in the visitor’s language, English when missing', async () => {
    const saved = await savePost({
      title: { en: `${TAG} Open day`, uz: `${TAG} Ochiq kun` },
      carouselPosition: 1,
    });
    const id = saved.data!.saveSitePost.id;
    expect(saved.data!.saveSitePost).toMatchObject({
      status: 'PUBLISHED',
      carouselPosition: 1,
    });

    const uz = (await home('uz')).posts.find((p) => p.id === id)!;
    expect(uz.title).toBe(`${TAG} Ochiq kun`);
    expect(uz.summary).toBe('Short text'); // no Uzbek summary: English
    const ko = (await home('ko')).posts.find((p) => p.id === id)!;
    expect(ko).toMatchObject({ title: `${TAG} Open day`, summary: '짧은 글' });
  });

  it('drafts, scheduled and archived posts never reach the public site', async () => {
    const draft = await savePost({
      title: en('draft'),
      publish: 'DRAFT',
      carouselPosition: 1,
    });
    const later = await savePost({
      title: en('later'),
      publish: 'SCHEDULE',
      scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
    const gone = await savePost({ title: en('gone') });
    await gql(
      `mutation($id: String!) { archiveSitePost(id: $id) { id } }`,
      { id: gone.data!.saveSitePost.id },
      'admin',
    );

    const ids = (await home('en')).posts.map((p) => p.id);
    for (const hidden of [draft, later, gone])
      expect(ids).not.toContain(hidden.data!.saveSitePost.id);
    expect(
      code(
        await savePost({
          publish: 'SCHEDULE',
          scheduledAt: new Date(Date.now() - 1000).toISOString(),
        }),
      ),
    ).toBe('BAD_REQUEST');
  });

  it('the slider holds at most 5 posts, numbered 1…n in the admin’s order', async () => {
    const inSlider = await prisma.sitePost.count({
      where: { carouselOrder: { not: null }, archivedAt: null },
    });
    for (let i = inSlider; i < SITE_CAROUSEL_MAX; i++)
      await savePost({ title: en(`slide ${i}`), carouselPosition: 1 });
    expect(
      code(await savePost({ title: en('one too many'), carouselPosition: 2 })),
    ).toBe('SITE_CAROUSEL_FULL');

    const orders = (
      await prisma.sitePost.findMany({
        where: { carouselOrder: { not: null }, archivedAt: null },
      })
    )
      .map((p) => p.carouselOrder)
      .sort();
    expect(orders).toEqual([1, 2, 3, 4, 5]);
  });

  it('an event needs a date; English is required in every text', async () => {
    expect(code(await savePost({ type: 'EVENT' }))).toBe('BAD_REQUEST');
    expect(
      code(await savePost({ title: { en: ' ', uz: 'Faqat o‘zbekcha' } })),
    ).toBe('BAD_REQUEST');
  });

  it('a course file cannot become a website picture', async () => {
    const admin = await prisma.user.findFirstOrThrow({
      where: { loginId: 'e2e-site-admin' },
    });
    const asset = await prisma.mediaAsset.create({
      data: {
        ownerId: admin.id,
        kind: 'IMAGE',
        originalName: 'slide.png',
        mimeType: 'image/png',
        size: 100,
        status: 'READY',
        s3Key: `raw/some-course/${Date.now()}.png`,
      },
    });
    expect(code(await savePost({ coverAssetId: asset.id }))).toBe(
      'SITE_IMAGE_INVALID',
    );
  });

  it('team: one director at most; hidden people leave the site', async () => {
    // The seeded demo director gets the title back at the end (tests must not change real data)
    const seededDirectors = await prisma.sitePerson.findMany({
      where: { isDirector: true },
      select: { id: true },
    });
    const save = (input: object) =>
      gql<{ saveSitePerson: { id: string; isDirector: boolean } }>(
        `mutation($i: SaveSitePersonInput!) { saveSitePerson(input: $i) { id isDirector } }`,
        {
          i: {
            firstName: 'Ann',
            lastName: TAG,
            role: { en: 'Teacher' },
            isDirector: false,
            showOnSite: true,
            ...input,
          },
        },
        'admin',
      );
    const first = (await save({ isDirector: true })).data!.saveSitePerson;
    const second = (await save({ firstName: 'Bob', isDirector: true })).data!
      .saveSitePerson;
    const directors = await prisma.sitePerson.findMany({
      where: { isDirector: true },
    });
    expect(directors.map((d) => d.id)).toEqual([second.id]);

    await gql(
      `mutation($id: String!) { setSitePersonVisible(id: $id, showOnSite: false) { id } }`,
      { id: first.id },
      'admin',
    );
    expect((await home('en')).team.map((p) => p.name)).not.toContain(
      `Ann ${TAG}`,
    );

    await prisma.sitePerson.update({
      where: { id: second.id },
      data: { isDirector: false },
    });
    await prisma.sitePerson.updateMany({
      where: { id: { in: seededDirectors.map((d) => d.id) } },
      data: { isDirector: true },
    });
  });

  it('programs: grades in order, teachers only from "Our team", YouTube links only', async () => {
    const save = (input: object) =>
      gql<{ saveSiteProgram: { id: string; days: string[] } }>(
        `mutation($i: SaveSiteProgramInput!) { saveSiteProgram(input: $i) { id days } }`,
        {
          i: {
            category: 'IT',
            name: en('Robotics'),
            gradeFrom: 5,
            gradeTo: 9,
            days: ['SAT', 'MON'],
            teacherIds: [],
            description: { en: 'Robots' },
            showOnSite: true,
            ...input,
          },
        },
        'admin',
      );
    expect((await save({})).data!.saveSiteProgram.days).toEqual(['MON', 'SAT']);
    expect(code(await save({ gradeFrom: 9, gradeTo: 5 }))).toBe('BAD_REQUEST');
    expect(
      code(
        await save({ teacherIds: ['01900000-0000-7000-8000-000000000000'] }),
      ),
    ).toBe('BAD_REQUEST');
    expect(
      code(await save({ videoUrl: 'https://example.com/video.mp4' })),
    ).toBe('BAD_REQUEST');
  });

  it('enquiry form: saved for the admin inbox, phone checked, honeypot and rate limit', async () => {
    expect(
      (await submit({ childGrade: 5, interest: 'KOREAN' })).data!.submitEnquiry,
    ).toBe(true);
    expect(code(await submit({ phone: '+1 202 555 0147' }))).toBe(
      'INVALID_PHONE',
    );
    // A bot fills the hidden field: "sent", but nothing is stored
    expect(
      (await submit({ parentName: `${TAG} Bot`, website: 'http://spam' })).data!
        .submitEnquiry,
    ).toBe(true);
    expect(
      await prisma.enquiry.count({ where: { parentName: `${TAG} Bot` } }),
    ).toBe(0);

    const list = await gql<{
      adminEnquiries: {
        new: number;
        items: { id: string; phone: string; locale: string }[];
      };
    }>(
      `query { adminEnquiries(input: { search: "${TAG}" }) { new items { id phone locale } } }`,
      {},
      'admin',
    );
    const [row] = list.data!.adminEnquiries.items;
    expect(row).toMatchObject({ phone: '+998901112233', locale: 'ko' });
    const done = await gql<{
      setEnquiryStatus: { status: string; handledBy: string };
    }>(
      `mutation($id: String!) { setEnquiryStatus(id: $id, status: RESOLVED) { status handledBy } }`,
      { id: row.id },
      'admin',
    );
    expect(done.data!.setEnquiryStatus).toEqual({
      status: 'RESOLVED',
      handledBy: `admin ${TAG.charAt(0)}.`,
    });

    // 5 per IP per hour (the invalid-phone try counted too)
    let last: GqlBody<unknown> = { data: null };
    for (let i = 0; i < 5; i++) last = await submit({});
    expect(code(last)).toBe('RATE_LIMITED');
  });

  it('"Translate from English" fills the other three languages (fake model)', async () => {
    const res = await gql<{ translateSiteText: { uz: string; ko: string }[] }>(
      `mutation { translateSiteText(input: { texts: ["Open day", ""] }) { uz ko } }`,
      {},
      'admin',
    );
    expect(res.data!.translateSiteText).toEqual([
      { uz: '[uz] Open day', ko: '[ko] Open day' },
      { uz: '', ko: '' },
    ]);
  });
});
