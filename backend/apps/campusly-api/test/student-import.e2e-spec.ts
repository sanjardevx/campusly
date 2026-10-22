import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { setupApp } from '../src/app.setup';
import { UserAdminService } from '../src/components/user/user-admin.service';
import { PrismaService } from '../src/database/prisma.service';

// Needs Docker Postgres + Redis. Creates its own current year (E2E 2097) with classes E2E-IA and
// E2E-IB, an admin and an existing parent; restores the real current year and ID counters after.
const PASSWORD = 'E2e-Import-Password-1';
const LAST = 'Importtest';
const EXISTING_PARENT_PHONE = '+998997770001';

interface GqlBody<T> {
  data: T | null;
  errors?: { message: string; extensions: { code: string } }[];
}
interface Preview {
  previewStudentImport: {
    rows: {
      line: number;
      status: string;
      errors: { code: string; value: string | null }[];
      loginIdPreview: string | null;
    }[];
    summary: { ready: number; linkParent: number; errors: number };
  };
}
interface Imported {
  importStudents: {
    created: number;
    linkedParents: number;
    skipped: number;
    slips: {
      student: { loginId: string; tempPassword: string };
      parent: {
        loginId: string;
        tempPassword: string | null;
        isNew: boolean;
      } | null;
    }[];
  };
}

const CSV = [
  'first_name,last_name,class,admission_year,parent_name,parent_phone,parent_relation',
  `Ali,${LAST},e2e-ia,2097,,,`, // 2 READY, no parent
  `Bobur,${LAST},E2E-IA,2097,Karim ${LAST},+998 99 777 00 02,FATHER`, // 3 READY, new parent
  `Bonu,${LAST},E2E-IB,2097,Karim ${LAST},997770002,FATHER`, // 4 LINK_PARENT (sibling above)
  `Dilshod,${LAST},E2E-IA,2097,Lola ${LAST},${EXISTING_PARENT_PHONE},MOTHER`, // 5 LINK_PARENT (in DB)
  `Eldor,${LAST},9Z,2097,,,`, // 6 ERROR: class
  `Feruza,${LAST},E2E-IB,2097,Olim ${LAST},+998 99 77,FATHER`, // 7 ERROR: phone
].join('\n');

describe('Student CSV import (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let currentYearBefore: string | undefined;
  let countersBefore: { year: number; roleCode: number; lastValue: number }[];

  async function gql<T>(query: string, variables: object, token = adminToken) {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query, variables });
    return res.body as GqlBody<T>;
  }
  const PREVIEW = `mutation($csv: String!) {
    previewStudentImport(csv: $csv) {
      rows { line status errors { code value } loginIdPreview }
      summary { ready linkParent errors }
    }
  }`;
  const IMPORT = `mutation($csv: String!, $skip: Boolean) {
    importStudents(csv: $csv, skipErrors: $skip) {
      created linkedParents skipped
      slips { student { loginId tempPassword } parent { loginId tempPassword isNew } }
    }
  }`;
  const importedCount = () => prisma.user.count({ where: { lastName: LAST } });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    countersBefore = await prisma.idCounter.findMany();
    currentYearBefore = (
      await prisma.academicYear.findFirst({ where: { isCurrent: true } })
    )?.id;
    await prisma.academicYear.updateMany({ data: { isCurrent: false } });
    const year = await prisma.academicYear.create({
      data: {
        name: 'E2E 2097',
        startsAt: new Date('2097-09-01'),
        endsAt: new Date('2098-05-31'),
        isCurrent: true,
      },
    });
    await prisma.group.createMany({
      data: [
        { academicYearId: year.id, name: 'E2E-IA' },
        { academicYearId: year.id, name: 'E2E-IB' },
      ],
    });

    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    await prisma.user.create({
      data: {
        loginId: 'e2e-import-admin',
        role: 'ADMIN',
        passwordHash,
        firstName: 'E2e',
        lastName: LAST,
      },
    });
    await prisma.user.create({
      data: {
        loginId: '997770001',
        role: 'PARENT',
        passwordHash,
        firstName: 'Existing',
        lastName: LAST,
        parentProfile: { create: { phone: EXISTING_PARENT_PHONE } },
      },
    });
    adminToken = (
      (
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ loginId: 'e2e-import-admin', password: PASSWORD })
      ).body as { accessToken: string }
    ).accessToken;
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { lastName: LAST },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    await prisma.auditLog.deleteMany({
      where: { OR: [{ actorId: { in: ids } }, { entityId: { in: ids } }] },
    });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
    await prisma.parentStudent.deleteMany({
      where: { studentId: { in: ids } },
    });
    await prisma.groupMember.deleteMany({ where: { studentId: { in: ids } } });
    await prisma.studentProfile.deleteMany({ where: { userId: { in: ids } } });
    await prisma.parentProfile.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.group.deleteMany({ where: { name: { startsWith: 'E2E-I' } } });
    await prisma.academicYear.deleteMany({ where: { name: 'E2E 2097' } });
    if (currentYearBefore) {
      await prisma.academicYear.update({
        where: { id: currentYearBefore },
        data: { isCurrent: true },
      });
    }
    await prisma.idCounter.deleteMany();
    await prisma.idCounter.createMany({ data: countersBefore });
    await app.close();
  });

  it('preview: READY / LINK_PARENT / ERROR per row, and it writes nothing', async () => {
    const res = await gql<Preview>(PREVIEW, { csv: CSV });
    const { rows, summary } = res.data!.previewStudentImport;

    expect(rows.map((r) => [r.line, r.status])).toEqual([
      [2, 'READY'],
      [3, 'READY'],
      [4, 'LINK_PARENT'],
      [5, 'LINK_PARENT'],
      [6, 'ERROR'],
      [7, 'ERROR'],
    ]);
    // Codes + the bad value (the UI translates them and marks the cell)
    expect(rows[4].errors).toEqual([{ code: 'CLASS_NOT_FOUND', value: '9Z' }]);
    expect(rows[5].errors).toEqual([
      { code: 'PHONE_INVALID', value: '+998 99 77' },
    ]);
    // "Student ID (preview)": the next numbers, in file order, only for rows that can be imported
    const previews = rows.map((r) => r.loginIdPreview);
    expect(previews.slice(4)).toEqual([null, null]);
    expect(new Set(previews.slice(0, 4)).size).toBe(4);
    for (const id of previews.slice(0, 4)) expect(id).toMatch(/^\d{2}1\d{5}$/);
    expect(summary).toEqual({ ready: 2, linkParent: 2, errors: 2 });
    expect(await importedCount()).toBe(2); // only the admin and the existing parent
  });

  it('import with errors and without "skip" is refused; nothing is created', async () => {
    const res = await gql(IMPORT, { csv: CSV, skip: false });
    expect(res.errors?.[0].extensions.code).toBe('IMPORT_HAS_ERRORS');
    expect(res.errors?.[0].message).toMatch('2 row(s) have errors');
    expect(await importedCount()).toBe(2);
  });

  it('a failure in the middle rolls back every row (all or nothing)', async () => {
    const service = app.get(UserAdminService);
    const real = service.createStudentTx.bind(service);
    let call = 0;
    const spy = jest
      .spyOn(service, 'createStudentTx')
      .mockImplementation((...args: Parameters<typeof real>) => {
        call += 1;
        if (call === 3) throw new Error('Simulated failure on the 3rd student');
        return real(...args);
      });

    const res = await gql(IMPORT, { csv: CSV, skip: true });
    spy.mockRestore();

    expect(res.errors?.[0].extensions.code).toBe('INTERNAL_SERVER_ERROR');
    expect(await importedCount()).toBe(2); // the 2 students created before the failure are gone
    expect(await prisma.idCounter.findMany()).toEqual(countersBefore); // and their IDs too
  });

  it('import with skip: creates the good rows in one go and returns the login slips', async () => {
    const preview = await gql<Preview>(PREVIEW, { csv: CSV });
    const res = await gql<Imported>(IMPORT, { csv: CSV, skip: true });
    const result = res.data!.importStudents;

    // Nobody created a student in between, so the preview IDs are the real ones
    expect(result.slips.map((s) => s.student.loginId)).toEqual(
      preview
        .data!.previewStudentImport.rows.map((r) => r.loginIdPreview)
        .filter(Boolean),
    );

    expect(result).toMatchObject({ created: 4, linkedParents: 2, skipped: 2 });
    const [ali, bobur, bonu, dilshod] = result.slips;
    expect(ali.parent).toBeNull();
    expect(bobur.parent).toMatchObject({ loginId: '997770002', isNew: true });
    expect(bonu.parent).toMatchObject({
      loginId: '997770002',
      isNew: false,
      tempPassword: null,
    });
    expect(dilshod.parent).toMatchObject({
      loginId: '997770001',
      isNew: false,
    });

    // The printed passwords work
    for (const [loginId, password] of [
      [ali.student.loginId, ali.student.tempPassword],
      [bobur.parent!.loginId, bobur.parent!.tempPassword!],
    ]) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ loginId, password })
        .expect(200);
    }

    // The sibling family has one parent with two children
    const siblingsParent = await prisma.user.findUniqueOrThrow({
      where: { loginId: '997770002' },
      include: { children: true },
    });
    expect(siblingsParent.children).toHaveLength(2);
    expect(
      await prisma.auditLog.count({
        where: {
          action: 'users.import',
          actor: { loginId: 'e2e-import-admin' },
        },
      }),
    ).toBe(1);
  });
});
