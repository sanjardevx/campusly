import type { ReactNode } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { Box, ButtonBase, Card, Stack, Typography } from '@mui/material';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import { useTranslation } from 'next-i18next/pages';
import type { QuestionFieldsFragment } from '@/libs/gql/graphql';
import { formatLastSeen } from '@/libs/i18n/format';
import { tokens } from '@/libs/theme';

export type Question = QuestionFieldsFragment;

/** "Lesson: Quadratic Equations" · "Homework 5: …" · null for a general question */
export function useAboutLabel() {
  const { t } = useTranslation('qa');
  return (q: Pick<Question, 'lessonTitle' | 'assignmentTitle'>) =>
    q.lessonTitle ? t('about.lesson', { title: q.lessonTitle }) : (q.assignmentTitle ?? null);
}

/** "Today, 19:40" · "Yesterday" · "3 days ago" · a date */
export function useAgo() {
  const { t } = useTranslation('qa');
  const { locale } = useRouter();
  return (value: string) => formatLastSeen(value, locale, (key, options) => t(key, options));
}

const TAGS = {
  course: { bgcolor: tokens.successTint, color: 'success.main' },
  about: { bgcolor: tokens.infoTint, color: 'text.secondary' },
  faq: { bgcolor: '#E8EAF6', color: '#3F4A9E' },
  private: { bgcolor: tokens.errorTint, color: 'error.main' },
  answered: { bgcolor: '#BCEDDA', color: '#406D5E' },
  waiting: { bgcolor: '#FFDBCA', color: '#763300' },
};

/** A small word on a soft tint (never colour alone: the word says it) */
export function Tag({ tone, icon, children }: { tone: keyof typeof TAGS; icon?: ReactNode; children: ReactNode }) {
  return (
    <Box
      component="span"
      sx={{
        ...TAGS[tone],
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1,
        py: 0.25,
        borderRadius: 1,
        fontSize: '0.75rem',
        fontWeight: 500,
        lineHeight: '1rem',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        '& svg': { fontSize: 13 },
      }}
    >
      {icon}
      {children}
    </Box>
  );
}

/**
 * Stitch "Teacher Q&A Inbox" / "Course Q&A" rows: title, the first line of the details, tags and
 * a meta line. Pinned questions (FAQ) get their own section under the open ones, as in Stitch.
 * `staff`: the teacher's view (course tag, author name, red "0 replies" when nobody answered).
 */
export function QuestionList({ items, hrefOf, staff, empty }: { items: Question[]; hrefOf: (q: Question) => string; staff: boolean; empty: ReactNode }) {
  const { t } = useTranslation('qa');
  const open = items.filter((q) => !q.isPinned);
  const pinned = items.filter((q) => q.isPinned);

  if (!items.length) {
    return (
      <Card variant="outlined" sx={{ borderRadius: '12px', p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">{empty}</Typography>
      </Card>
    );
  }
  const card = (list: Question[]) => (
    <Card variant="outlined" sx={{ borderRadius: '12px', '& > * + *': { borderTop: 1, borderColor: tokens.divider } }}>
      {list.map((q) => (
        <QuestionRow key={q.id} q={q} href={hrefOf(q)} staff={staff} />
      ))}
    </Card>
  );
  // Students see the FAQ first (Stitch course page); teachers see what waits for them first
  const faq = pinned.length > 0 && (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, mb: 1, color: 'text.secondary' }}>
        <PushPinOutlinedIcon sx={{ fontSize: 16 }} />
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{t('faq')}</Typography>
      </Stack>
      {card(pinned)}
    </Box>
  );
  return (
    <Stack spacing={2.5}>
      {!staff && faq}
      {open.length > 0 && card(open)}
      {staff && faq}
    </Stack>
  );
}

function QuestionRow({ q, href, staff }: { q: Question; href: string; staff: boolean }) {
  const { t } = useTranslation('qa');
  const about = useAboutLabel()(q);
  const ago = useAgo();
  const nobody = staff && q.replies === 0 && !q.isAnswered;
  // "1 reply (teacher)" when a teacher took part, "(classmate)" when only classmates did
  const replies = q.replies
    ? `${t('replies', { count: q.replies })} (${q.staffReplies ? t('from.teacher') : t('from.classmate')})`
    : t('replies', { count: 0 });

  return (
    <ButtonBase
      component={NextLink}
      href={href}
      sx={{ width: '100%', display: 'flex', alignItems: 'center', gap: 2, px: { xs: 2, md: 2.5 }, py: 2, textAlign: 'left', transition: 'background-color 150ms', '&:hover': { bgcolor: '#FBFDFB' } }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {!staff && q.isPinned && <Tag tone="faq">{t('faqTag')}</Tag>}
          {!staff && q.isPrivate && (
            <Tag tone="private" icon={<LockOutlinedIcon />}>
              {t('private')}
            </Tag>
          )}
          {!staff && about && <Tag tone="about">{about}</Tag>}
          <Typography component="h3" sx={{ fontSize: '0.9375rem', fontWeight: 600, minWidth: 0 }}>
            {q.title}
          </Typography>
          {staff && q.isPrivate && (
            <Tag tone="private" icon={<LockOutlinedIcon />}>
              {t('private')}
            </Tag>
          )}
          {!staff && !q.isPinned && <Tag tone={q.isAnswered ? 'answered' : 'waiting'}>{q.isAnswered ? t('status.answered') : t('status.waiting')}</Tag>}
        </Stack>
        {q.body && (
          <Typography noWrap sx={{ mt: 0.5, fontSize: '0.84375rem', color: 'text.secondary' }}>
            {q.body}
          </Typography>
        )}
        <Stack direction="row" sx={{ mt: 1, alignItems: 'center', gap: 1, flexWrap: 'wrap', fontSize: '0.75rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
          {staff && <Tag tone="course">{q.courseTitle}</Tag>}
          {staff && about && <Tag tone="about">{about}</Tag>}
          {staff && q.isPinned && <Tag tone="faq">{t('faqTag')}</Tag>}
          <span>{q.isMine ? t('you') : q.authorName}</span>
          <span aria-hidden>·</span>
          <span>{ago(q.createdAt)}</span>
          <span aria-hidden>·</span>
          <Stack component="span" direction="row" sx={{ alignItems: 'center', gap: 0.5, color: nobody ? 'error.main' : undefined }}>
            {staff && q.isResolved ? <TaskAltRoundedIcon sx={{ fontSize: 14 }} /> : <ChatBubbleOutlineRoundedIcon sx={{ fontSize: 14 }} />}
            {staff && q.isResolved ? `${t('status.resolved')} · ${replies}` : replies}
          </Stack>
        </Stack>
      </Box>
      <ChevronRightRoundedIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
    </ButtonBase>
  );
}
