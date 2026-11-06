import type { SvgIconComponent } from '@mui/icons-material';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined';
import MarkEmailUnreadOutlinedIcon from '@mui/icons-material/MarkEmailUnreadOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import { useRouter } from 'next/router';
import type { Role } from '@/libs/gql/graphql';

export interface NavItem {
  /** Key in common.json → nav.* */
  key: string;
  href: string;
  icon: SvgIconComponent;
  /** The plan day that builds the page (shown on the "coming soon" placeholder); none = later phase */
  day?: number;
  /** false: not a phone tab (five places in the bar, "More" included) — it opens from "More" instead */
  tab?: false;
}

export interface NavSection {
  /** Key in common.json → nav.sections.* (admin only) */
  title?: string;
  items: NavItem[];
}

/**
 * The menus of the Stitch dashboards. Later-phase items come back with their features (DECISIONS §14):
 * Q&A (teachers; students ask inside a course) and the student / parent calendar on day 21. The AI Study Tutor page was built ahead.
 */
export const NAV: Record<Role, NavSection[]> = {
  STUDENT: [
    {
      items: [
        { key: 'home', href: '/student', icon: HomeOutlinedIcon, day: 12 },
        { key: 'courses', href: '/student/courses', icon: MenuBookOutlinedIcon, day: 12 },
        // Phones: Home, Courses, Grades, AI Tutor, More. The week's work is on Home and the bell
        // opens the news, so Calendar and News live under "More"
        { key: 'calendar', href: '/student/calendar', icon: EventOutlinedIcon, day: 21, tab: false },
        { key: 'grades', href: '/student/grades', icon: AssessmentOutlinedIcon, day: 12 },
        // The UI is ready; the answers come with the AI tutor phase (DECISIONS §14)
        { key: 'tutor', href: '/student/tutor', icon: PsychologyOutlinedIcon },
        { key: 'announcements', href: '/student/announcements', icon: CampaignOutlinedIcon, day: 12, tab: false },
      ],
    },
  ],
  TEACHER: [
    {
      items: [
        { key: 'dashboard', href: '/teacher', icon: DashboardOutlinedIcon, day: 11 },
        { key: 'courses', href: '/teacher/courses', icon: MenuBookOutlinedIcon, day: 11 },
        { key: 'gradebook', href: '/teacher/gradebook', icon: AutoStoriesOutlinedIcon, day: 11 },
        { key: 'attendance', href: '/teacher/attendance', icon: HowToRegOutlinedIcon, day: 11 },
        { key: 'announcements', href: '/teacher/announcements', icon: CampaignOutlinedIcon, day: 11 },
        // Phones: the bar keeps five places, Q&A opens from "More"
        { key: 'questions', href: '/teacher/questions', icon: ForumOutlinedIcon, day: 21, tab: false },
      ],
    },
  ],
  PARENT: [
    {
      items: [
        { key: 'overview', href: '/parent', icon: DashboardOutlinedIcon, day: 13 },
        { key: 'grades', href: '/parent/grades', icon: SchoolOutlinedIcon, day: 13 },
        { key: 'attendance', href: '/parent/attendance', icon: CalendarMonthOutlinedIcon, day: 13 },
        { key: 'calendar', href: '/parent/calendar', icon: EventOutlinedIcon, day: 21 },
        // Phones: the bell in the header opens the news, so News lives under "More"
        { key: 'announcements', href: '/parent/announcements', icon: CampaignOutlinedIcon, day: 13, tab: false },
      ],
    },
  ],
  ADMIN: [
    { items: [{ key: 'dashboard', href: '/_admin', icon: DashboardOutlinedIcon, day: 10 }] },
    {
      title: 'school',
      items: [
        { key: 'users', href: '/_admin/users', icon: GroupOutlinedIcon, day: 10 },
        { key: 'classes', href: '/_admin/classes', icon: MenuBookOutlinedIcon, day: 10 },
        { key: 'records', href: '/_admin/records', icon: FolderOpenOutlinedIcon, day: 10 },
      ],
    },
    // The public website CMS (day 19; mock tests, open courses and honor students day 20)
    {
      title: 'website',
      items: [
        { key: 'news', href: '/_admin/news', icon: EventNoteOutlinedIcon, day: 19 },
        { key: 'programs', href: '/_admin/programs', icon: SchoolOutlinedIcon, day: 19 },
        { key: 'mockTests', href: '/_admin/mock-tests', icon: QuizOutlinedIcon, day: 20 },
        { key: 'openCourses', href: '/_admin/open-courses', icon: LibraryBooksOutlinedIcon, day: 20 },
        { key: 'honorStudents', href: '/_admin/honor-students', icon: WorkspacePremiumOutlinedIcon, day: 20 },
        { key: 'team', href: '/_admin/team', icon: BadgeOutlinedIcon, day: 19 },
        { key: 'enquiries', href: '/_admin/enquiries', icon: MarkEmailUnreadOutlinedIcon, day: 19 },
      ],
    },
    {
      title: 'system',
      items: [
        { key: 'settings', href: '/_admin/settings', icon: SettingsOutlinedIcon, day: 10 },
        { key: 'activity', href: '/_admin/activity', icon: HistoryOutlinedIcon, day: 15 },
      ],
    },
  ],
};

/** Which roles may open a section of the site (the first path segment) */
export const AREA_ROLE: Record<string, Role> = {
  student: 'STUDENT',
  teacher: 'TEACHER',
  parent: 'PARENT',
  _admin: 'ADMIN',
};

/** The menu item for the current path: exact match, or the longest prefix ("/student/courses/x") */
export function activeItem(role: Role, pathname: string): NavItem | undefined {
  const items = NAV[role].flatMap((s) => s.items);
  return (
    items.find((i) => i.href === pathname) ??
    items
      .filter((i) => i.href !== `/${pathname.split('/')[1]}` && pathname.startsWith(`${i.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]
  );
}

/**
 * The menu item of the page on screen. asPath, not pathname: on a catch-all page pathname is
 * "/teacher/[...section]", asPath is the real "/teacher/gradebook" (without the locale prefix).
 */
export function useActiveItem(role: Role): NavItem | undefined {
  const { asPath } = useRouter();
  return activeItem(role, asPath.split(/[?#]/)[0]);
}

/**
 * Menu links keep the parent's chosen child (?child=…): switching from Grades to Attendance
 * must not jump back to the first child.
 */
export function useNavHref() {
  const { query } = useRouter();
  const child = typeof query.child === 'string' ? query.child : undefined;
  return (href: string) => (child ? { pathname: href, query: { child } } : href);
}
