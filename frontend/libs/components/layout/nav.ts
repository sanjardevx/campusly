import type { SvgIconComponent } from '@mui/icons-material';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined';
import MarkEmailUnreadOutlinedIcon from '@mui/icons-material/MarkEmailUnreadOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
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
}

export interface NavSection {
  /** Key in common.json → nav.sections.* (admin only) */
  title?: string;
  items: NavItem[];
}

/**
 * The menus of the Stitch dashboards, MVP pages only. Later-phase items (AI Study Tutor,
 * Calendar, Q&A, the website CMS) come back with their features (DECISIONS §14).
 */
export const NAV: Record<Role, NavSection[]> = {
  STUDENT: [
    {
      items: [
        { key: 'home', href: '/student', icon: HomeOutlinedIcon, day: 12 },
        { key: 'courses', href: '/student/courses', icon: MenuBookOutlinedIcon, day: 12 },
        { key: 'grades', href: '/student/grades', icon: AssessmentOutlinedIcon, day: 12 },
        { key: 'announcements', href: '/student/announcements', icon: CampaignOutlinedIcon, day: 12 },
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
      ],
    },
  ],
  PARENT: [
    {
      items: [
        { key: 'overview', href: '/parent', icon: DashboardOutlinedIcon, day: 13 },
        { key: 'grades', href: '/parent/grades', icon: SchoolOutlinedIcon, day: 13 },
        { key: 'attendance', href: '/parent/attendance', icon: CalendarMonthOutlinedIcon, day: 13 },
        { key: 'announcements', href: '/parent/announcements', icon: CampaignOutlinedIcon, day: 13 },
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
      ],
    },
    // The public website CMS and enquiries are a later phase (DECISIONS §14): the menu matches
    // Stitch, the pages say "later phase"
    {
      title: 'website',
      items: [
        { key: 'news', href: '/_admin/news', icon: EventNoteOutlinedIcon },
        { key: 'programs', href: '/_admin/programs', icon: SchoolOutlinedIcon },
        { key: 'mockTests', href: '/_admin/mock-tests', icon: QuizOutlinedIcon },
        { key: 'openCourses', href: '/_admin/open-courses', icon: LibraryBooksOutlinedIcon },
        { key: 'honorStudents', href: '/_admin/honor-students', icon: WorkspacePremiumOutlinedIcon },
        { key: 'team', href: '/_admin/team', icon: BadgeOutlinedIcon },
        { key: 'enquiries', href: '/_admin/enquiries', icon: MarkEmailUnreadOutlinedIcon },
      ],
    },
    {
      title: 'system',
      items: [{ key: 'settings', href: '/_admin/settings', icon: SettingsOutlinedIcon, day: 10 }],
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
