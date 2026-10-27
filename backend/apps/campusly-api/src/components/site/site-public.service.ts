import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SITE_CAROUSEL_MAX } from '../../libs/config';
import type { SiteHome, SitePersonPublic } from '../../libs/dto/site/site';
import type { SiteLocale } from '../../libs/enums/site.enum';
import { fromDbDate, toDbDate, todayInZone } from '../../libs/utils/date';
import { SiteImages } from './site-images';
import { inLocale, shortName } from './site-text';

/** The home page shows at most this many of each */
const HOME_PROGRAMS = 6;
const HOME_MOCK_TESTS = 6;
const HOME_OPEN_COURSES = 8;
const HOME_HONORS = 12;

/**
 * The public home page in one query (@Public): numbers, the News & Events slider, Programs &
 * clubs, Our team, mock tests, open courses, honor students and the school contact. Only published, not archived content, in the
 * visitor's language (missing translations fall back to English). The Next.js page calls it
 * when it rebuilds (ISR), not on every visit.
 */
@Injectable()
export class SitePublicService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly images: SiteImages,
  ) {}

  public async home(locale: SiteLocale): Promise<SiteHome> {
    const now = new Date();
    const live = {
      status: 'PUBLISHED' as const,
      archivedAt: null,
      publishedAt: { lte: now },
    };
    const [students, teachers, programRows, carousel, people, settings] =
      await Promise.all([
        this.prismaService.user.count({
          where: { role: 'STUDENT', status: 'ACTIVE' },
        }),
        this.prismaService.user.count({
          where: { role: 'TEACHER', status: 'ACTIVE' },
        }),
        this.prismaService.siteProgram.findMany({
          where: { showOnSite: true, archivedAt: null },
          include: { photo: { select: { s3Key: true } } },
          orderBy: { order: 'asc' },
        }),
        this.prismaService.sitePost.findMany({
          where: { ...live, carouselOrder: { not: null } },
          include: { cover: { select: { s3Key: true } } },
          orderBy: { carouselOrder: 'asc' },
          take: SITE_CAROUSEL_MAX,
        }),
        this.prismaService.sitePerson.findMany({
          where: { showOnSite: true, archivedAt: null },
          include: { photo: { select: { s3Key: true } } },
          orderBy: [{ isDirector: 'desc' }, { order: 'asc' }],
        }),
        this.prismaService.schoolSetting.findUnique({ where: { id: 1 } }),
      ]);
    // A mock test stays on the site until its day is over in the school timezone
    const today = toDbDate(todayInZone(settings?.timezone ?? 'Asia/Tashkent'));
    const [mockRows, courseRows, honorRows] = await Promise.all([
      this.prismaService.siteMockTest.findMany({
        where: { showOnSite: true, archivedAt: null, examDate: { gte: today } },
        include: {
          contactPerson: {
            select: { firstName: true, lastName: true, role: true },
          },
        },
        orderBy: [{ examDate: 'asc' }, { startTime: 'asc' }],
        take: HOME_MOCK_TESTS,
      }),
      this.prismaService.siteOpenCourse.findMany({
        where: {
          status: 'PUBLISHED',
          archivedAt: null,
          lessons: { some: {} },
        },
        include: { lessons: { orderBy: { order: 'asc' } } },
        orderBy: { order: 'asc' },
        take: HOME_OPEN_COURSES,
      }),
      // Children only with the parents' consent, and never the full last name
      this.prismaService.siteHonorStudent.findMany({
        where: { showOnSite: true, parentConsent: true, archivedAt: null },
        include: {
          student: { select: { firstName: true, lastName: true } },
          photo: { select: { s3Key: true } },
        },
        orderBy: { order: 'asc' },
        take: HOME_HONORS,
      }),
    ]);

    // Nothing chosen for the slider: the latest three published posts
    const posts = carousel.length
      ? carousel
      : await this.prismaService.sitePost.findMany({
          where: live,
          include: { cover: { select: { s3Key: true } } },
          orderBy: { publishedAt: 'desc' },
          take: 3,
        });

    const person = (p: (typeof people)[number]): SitePersonPublic => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      role: inLocale(p.role, locale) ?? '',
      note: inLocale(p.note, locale),
      photoUrl: this.images.url({ asset: p.photo, path: p.photoPath }),
    });
    const director = people.find((p) => p.isDirector);

    return {
      stats: {
        students,
        teachers,
        programs: programRows.length,
        founded: settings?.foundedYear ?? null,
      },
      posts: posts.map((p) => ({
        id: p.id,
        type: p.type,
        title: inLocale(p.title, locale) ?? '',
        summary: inLocale(p.summary, locale) ?? '',
        body: inLocale(p.body, locale),
        coverUrl: this.images.url({ asset: p.cover, path: p.coverPath }),
        date: p.eventDate
          ? fromDbDate(p.eventDate)
          : (p.publishedAt ?? p.createdAt).toISOString().slice(0, 10),
        startTime: p.startTime,
        endTime: p.endTime,
        place: inLocale(p.place, locale),
      })),
      programs: programRows.slice(0, HOME_PROGRAMS).map((p) => ({
        id: p.id,
        category: p.category,
        name: inLocale(p.name, locale) ?? '',
        gradeFrom: p.gradeFrom,
        gradeTo: p.gradeTo,
        levelNote: inLocale(p.levelNote, locale),
        days: p.days,
        startTime: p.startTime,
        endTime: p.endTime,
        description: inLocale(p.description, locale) ?? '',
        photoUrl: this.images.url({ asset: p.photo, path: p.photoPath }),
        videoUrl: p.videoUrl,
      })),
      director: director ? person(director) : null,
      team: people.filter((p) => !p.isDirector).map(person),
      mockTests: mockRows.map((m) => ({
        id: m.id,
        exam: m.exam,
        title: inLocale(m.title, locale) ?? '',
        included: inLocale(m.included, locale) ?? '',
        date: fromDbDate(m.examDate),
        startTime: m.startTime,
        durationMin: m.durationMin,
        location: inLocale(m.location, locale) ?? '',
        price: m.price,
        seatsLeft: Math.max(0, m.totalSeats - m.takenSeats),
        contactName: m.contactPerson
          ? `${m.contactPerson.firstName} ${m.contactPerson.lastName}`
          : null,
        contactRole: m.contactPerson
          ? inLocale(m.contactPerson.role, locale)
          : null,
        contactPhone: m.contactPhone ?? settings?.contactPhone ?? null,
      })),
      openCourses: courseRows.map((c) => {
        const lessons = c.lessons.map((l) => ({
          title: l.title,
          youtubeId: l.youtubeId,
          durationSec: l.durationSec,
        }));
        return {
          id: c.id,
          category: c.category,
          title: inLocale(c.title, locale) ?? '',
          source: c.source,
          description: inLocale(c.description, locale),
          lessons,
          totalDurationSec: lessons.reduce(
            (sum, l) => sum + (l.durationSec ?? 0),
            0,
          ),
        };
      }),
      honorStudents: honorRows.map((h) => ({
        id: h.id,
        name: shortName(h.student)!,
        className: h.className,
        resultType: h.resultType,
        place: h.place,
        score: h.score,
        subject: inLocale(h.subject, locale) ?? '',
        competition: inLocale(h.competition, locale) ?? '',
        achievedOn: fromDbDate(h.achievedOn),
        photoUrl: this.images.url({ asset: h.photo, path: h.photoPath }),
      })),
      contact: {
        schoolName: settings?.schoolName ?? 'Campusly School',
        phone: settings?.contactPhone ?? null,
        officeHours: settings?.officeHours ?? null,
        address: settings?.siteAddress ?? null,
        metro: settings?.siteMetro ?? null,
        email: settings?.siteEmail ?? null,
        telegramUrl: settings?.telegramUrl ?? null,
        instagramUrl: settings?.instagramUrl ?? null,
        youtubeUrl: settings?.youtubeUrl ?? null,
      },
    };
  }
}
