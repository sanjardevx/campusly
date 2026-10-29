import type { SvgIconComponent } from '@mui/icons-material';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined';
import CelebrationOutlinedIcon from '@mui/icons-material/CelebrationOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import type { AssignmentType } from '@/libs/gql/graphql';

/**
 * Accent colours (DECISIONS §13, "Accents"): muted hues as { fg, bg } pairs — a darker icon or
 * text colour on a soft tint of the same hue, tuned to sit next to the spruce greens. Every fg
 * passes WCAG 4.5:1 on its own bg and on white, so a pair also works as a text tag.
 * Colour is never the only signal: a kind always has its icon and label, a bar its number.
 */
export const accent = {
  spruce: { fg: '#1F4E43', bg: '#E8EFEA' },
  teal: { fg: '#0F766E', bg: '#E3F4F1' },
  blue: { fg: '#1D4ED8', bg: '#EAF1FE' },
  violet: { fg: '#6D28D9', bg: '#F1ECFD' },
  rose: { fg: '#BE123C', bg: '#FDECEF' },
  amber: { fg: '#8A5A00', bg: '#FDF3DD' },
  green: { fg: '#166534', bg: '#E7F6EC' },
  slate: { fg: '#475569', bg: '#EEF1F4' },
} as const;

export type Tone = keyof typeof accent;

/**
 * One icon and one colour per kind of thing, the same on every page. Work types follow the Stitch
 * calendar (homework blue, quiz violet, test rose); amber stays with announcements, so the ochre
 * of "due within 24 h" keeps its meaning.
 */
export const KIND = {
  lesson: { icon: AutoStoriesOutlinedIcon, tone: 'teal' },
  homework: { icon: AssignmentOutlinedIcon, tone: 'blue' },
  quiz: { icon: QuizOutlinedIcon, tone: 'violet' },
  exam: { icon: FactCheckOutlinedIcon, tone: 'rose' },
  announcement: { icon: CampaignOutlinedIcon, tone: 'amber' },
  tutor: { icon: PsychologyOutlinedIcon, tone: 'spruce' },
  event: { icon: CelebrationOutlinedIcon, tone: 'green' },
  calendar: { icon: CalendarMonthOutlinedIcon, tone: 'slate' },
} as const satisfies Record<string, { icon: SvgIconComponent; tone: Tone }>;

export type Kind = keyof typeof KIND;

/** HOMEWORK / QUIZ / EXAM → its kind */
export const workKind = (type: AssignmentType): Kind =>
  type === 'QUIZ' ? 'quiz' : type === 'EXAM' ? 'exam' : 'homework';

/**
 * Bars and marks. Fills pass 3:1 on white and on the grey track (non-text contrast).
 * Grades use the school's 5-point bands; curriculum progress is not a judgement, so it has no red.
 */
const BAR = {
  green: '#15803D',
  blue: '#2563EB',
  amber: '#B45309',
  red: '#BA1A1A',
  slate: '#64748B',
  spruce: '#2F7A63',
} as const;

/** The mark (5 / 4 / 3 / 2, from markOf with the school's thresholds) → bar colour and tint pair */
export function markTone(mark: number | null | undefined): { bar: string; tone: Tone } {
  if (mark == null) return { bar: BAR.slate, tone: 'slate' };
  if (mark >= 5) return { bar: BAR.green, tone: 'green' };
  if (mark === 4) return { bar: BAR.blue, tone: 'blue' };
  if (mark === 3) return { bar: BAR.amber, tone: 'amber' };
  return { bar: BAR.red, tone: 'rose' };
}

/** Curriculum progress (lessons the teacher has opened): calm bands, never red */
export function progressBar(percent: number): string {
  if (percent >= 67) return BAR.spruce;
  if (percent >= 34) return BAR.blue;
  return BAR.slate;
}
