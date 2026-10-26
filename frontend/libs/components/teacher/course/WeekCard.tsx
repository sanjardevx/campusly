import { useState, type ReactNode } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { Box, Button, Card, Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import AssignmentIcon from '@mui/icons-material/Assignment';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DescriptionIcon from '@mui/icons-material/Description';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import LinkIcon from '@mui/icons-material/Link';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import PublishOutlinedIcon from '@mui/icons-material/PublishOutlined';
import QuizIcon from '@mui/icons-material/Quiz';
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined';
import VideoCameraBackOutlinedIcon from '@mui/icons-material/VideoCameraBackOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useTranslation } from 'next-i18next/pages';
import { Pill } from '@/libs/components/teacher/dashboard/parts';
import { formatDate } from '@/libs/i18n/format';
import { dragRowSx, useDragList } from './useDragList';
import { dayRange, fileType, formatSize, visibility, weekState, type Week, type WeekItem } from './model';

export type AddKind = 'VIDEO' | 'FILE' | 'HOMEWORK' | 'QUIZ';

/** Icon tile colours by item type (Stitch: video sky, file rose, homework green, quiz amber) */
const TILES: Record<string, { icon: SvgIconComponent; fg: string; bg: string }> = {
  VIDEO: { icon: PlayCircleIcon, fg: '#0369A1', bg: '#F0F9FF' },
  FILE: { icon: DescriptionIcon, fg: '#BE123C', bg: '#FFF1F2' },
  READING: { icon: MenuBookIcon, fg: '#1F4E43', bg: '#E8EFEA' },
  LINK: { icon: LinkIcon, fg: '#5C625E', bg: '#F1F2F0' },
  HOMEWORK: { icon: AssignmentIcon, fg: '#166534', bg: '#F0FDF4' },
  QUIZ: { icon: QuizIcon, fg: '#92400E', bg: '#FFFBEB' },
  EXAM: { icon: FactCheckOutlinedIcon, fg: '#1C5CAB', bg: '#EAF2FC' },
};

export interface WeekActions {
  onEditWeek: (week: Week) => void;
  onWeekHidden: (week: Week, hidden: boolean) => void;
  onWeekPublish: (week: Week, publish: boolean) => void;
  onAdd: (week: Week, kind: AddKind) => void;
  onEditItem: (item: WeekItem) => void;
  onItemPublish: (item: WeekItem, publish: boolean) => void;
  onOpenItem: (item: WeekItem) => void;
  onLessonsReorder: (week: Week, ids: string[]) => void;
}

/**
 * Stitch week card. Collapsed: one line. Expanded: the rows and "Add to Week N". In edit mode every
 * row and the week get their controls; in student preview drafts and hidden things are already
 * filtered out by the page.
 */
export function WeekCard({
  week,
  items,
  courseId,
  expanded,
  editMode,
  actions,
  dragHandle,
  moveMenu,
  onToggle,
}: {
  week: Week;
  items: WeekItem[];
  courseId: string;
  expanded: boolean;
  editMode: boolean;
  actions: WeekActions;
  /** The week's own drag handle props (from the page's list of weeks) */
  dragHandle: object;
  /** Move up / down for the week (null at the ends) */
  moveMenu: { up: (() => void) | null; down: (() => void) | null };
  onToggle: () => void;
}) {
  const { t } = useTranslation('teacher');
  const { locale } = useRouter();
  const state = weekState(week);
  const published = visibility(week.publishedAt) !== 'DRAFT';
  const [weekMenu, setWeekMenu] = useState<HTMLElement | null>(null);
  const [addMenu, setAddMenu] = useState<HTMLElement | null>(null);

  const lessonIds = week.lessons.map((l) => l.id);
  const drag = useDragList(lessonIds, (ids) => actions.onLessonsReorder(week, ids));

  const add = (kind: AddKind) => {
    setAddMenu(null);
    actions.onAdd(week, kind);
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: '12px', overflow: 'visible' }}>
      {/* Header */}
      <Stack
        direction="row"
        sx={{
          px: 2,
          py: 1.25,
          gap: 1,
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          bgcolor: expanded ? '#FAFDFB' : undefined,
          borderBottom: expanded ? 1 : 0,
          borderColor: 'divider',
          borderRadius: expanded ? '12px 12px 0 0' : '12px',
        }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1, minWidth: 0, flexWrap: 'wrap' }}>
          {editMode && (
            <Box {...dragHandle} title={t('course.dragWeek')} sx={{ display: 'flex', color: 'text.disabled', cursor: 'grab', '&:hover': { color: 'text.secondary' } }}>
              <DragIndicatorIcon fontSize="small" />
            </Box>
          )}
          <Button
            onClick={onToggle}
            aria-expanded={expanded}
            color="inherit"
            startIcon={expanded ? <ExpandMoreIcon /> : <ChevronRightIcon sx={{ color: 'text.disabled' }} />}
            sx={{ fontWeight: 600, fontSize: '0.875rem', px: 1, textAlign: 'left', minWidth: 0 }}
          >
            <Box component="span" sx={{ minWidth: 0 }}>
              {week.title}
              {week.startsAt && week.endsAt && (
                <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                  {' · '}
                  {dayRange(week.startsAt, week.endsAt, locale)}
                </Box>
              )}
            </Box>
          </Button>
          {state === 'CURRENT' && (
            <Pill tone="success" square>
              {t('course.week.current')}
            </Pill>
          )}
          {week.isHidden && (
            <Pill tone="warning" square icon={<VisibilityOffOutlinedIcon />}>
              {t('course.week.hidden')}
            </Pill>
          )}
          {!published && (
            <Pill tone="neutral" square>
              {t('course.status.DRAFT')}
            </Pill>
          )}
          <Typography component="span" sx={{ fontSize: '0.75rem', color: 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
            · {t('course.week.items', { count: items.length })}
          </Typography>
        </Stack>

        <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
          {!editMode && state === 'PAST' && <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled' }}>{t('course.week.completed')}</Typography>}
          {editMode && expanded && (
            <>
              <Button size="small" color="inherit" startIcon={<EditOutlinedIcon fontSize="small" />} onClick={() => actions.onEditWeek(week)} sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                {t('course.week.edit')}
              </Button>
              <Button
                size="small"
                color="inherit"
                startIcon={week.isHidden ? <VisibilityOutlinedIcon fontSize="small" /> : <VisibilityOffOutlinedIcon fontSize="small" />}
                onClick={() => actions.onWeekHidden(week, !week.isHidden)}
                sx={{ color: 'text.secondary', fontSize: '0.75rem' }}
              >
                {week.isHidden ? t('course.week.show') : t('course.week.hide')}
              </Button>
            </>
          )}
          {editMode && !expanded && (
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<AddIcon fontSize="small" />}
              onClick={(e) => setAddMenu(e.currentTarget)}
              sx={{ borderStyle: 'dashed', borderColor: 'divider', color: 'text.secondary', fontSize: '0.75rem' }}
            >
              {t('course.addTo', { week: week.title.split(':')[0] })}
            </Button>
          )}
          {editMode && (
            <IconButton size="small" aria-label={t('course.week.more')} onClick={(e) => setWeekMenu(e.currentTarget)}>
              <MoreHorizIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>
      </Stack>

      <Menu anchorEl={weekMenu} open={!!weekMenu} onClose={() => setWeekMenu(null)}>
        <MenuItem
          onClick={() => {
            setWeekMenu(null);
            actions.onWeekPublish(week, !published);
          }}
        >
          <ListItemIcon>{published ? <VisibilityOffOutlinedIcon fontSize="small" /> : <PublishOutlinedIcon fontSize="small" />}</ListItemIcon>
          <ListItemText>{published ? t('course.week.unpublish') : t('course.week.publish')}</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            setWeekMenu(null);
            actions.onEditWeek(week);
          }}
        >
          <ListItemIcon>
            <EditOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('course.week.edit')}</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem disabled={!moveMenu.up} onClick={() => (setWeekMenu(null), moveMenu.up?.())}>
          <ListItemIcon>
            <ArrowUpwardIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('course.moveUp')}</ListItemText>
        </MenuItem>
        <MenuItem disabled={!moveMenu.down} onClick={() => (setWeekMenu(null), moveMenu.down?.())}>
          <ListItemIcon>
            <ArrowDownwardIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t('course.moveDown')}</ListItemText>
        </MenuItem>
      </Menu>

      {expanded && (
        <>
          <Box sx={{ '& > * + *': { borderTop: 1, borderColor: 'divider' } }}>
            {items.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ px: 2.5, py: 3, textAlign: 'center' }}>
                {editMode ? t('course.week.emptyEdit') : t('course.week.empty')}
              </Typography>
            )}
            {items.map((item) =>
              item.kind === 'lesson' ? (
                <ItemRow
                  key={item.lesson.id}
                  item={item}
                  courseId={courseId}
                  editMode={editMode}
                  actions={actions}
                  rowProps={editMode ? drag.rowProps(item.lesson.id) : {}}
                  handleProps={drag.handleProps(item.lesson.id)}
                  moveUp={lessonIds.indexOf(item.lesson.id) > 0 ? () => drag.moveUp(item.lesson.id) : null}
                  moveDown={lessonIds.indexOf(item.lesson.id) < lessonIds.length - 1 ? () => drag.moveDown(item.lesson.id) : null}
                />
              ) : (
                <ItemRow key={item.assignment.id} item={item} courseId={courseId} editMode={editMode} actions={actions} />
              ),
            )}
          </Box>
          {editMode && (
            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              <Button
                fullWidth
                onClick={(e) => setAddMenu(e.currentTarget)}
                startIcon={<AddIcon />}
                sx={{
                  border: '2px dashed',
                  borderColor: 'divider',
                  bgcolor: '#FAFDFB',
                  py: 1,
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.light' },
                }}
              >
                {t('course.addTo', { week: week.title.split(':')[0] })}
              </Button>
            </Box>
          )}
        </>
      )}

      {/* Stitch "Select item type" menu */}
      <Menu
        anchorEl={addMenu}
        open={!!addMenu}
        onClose={() => setAddMenu(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{ paper: { sx: { width: 320, borderRadius: 3, p: 0.5 } } }}
      >
        <Typography sx={{ px: 1.5, py: 0.75, fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.disabled' }}>
          {t('course.add.title')}
        </Typography>
        <AddOption icon={<VideoCameraBackOutlinedIcon fontSize="small" />} title={t('course.add.video')} hint={t('course.add.videoHint')} onClick={() => add('VIDEO')} />
        <AddOption icon={<DescriptionOutlinedIcon fontSize="small" />} title={t('course.add.file')} hint={t('course.add.fileHint')} onClick={() => add('FILE')} />
        <AddOption icon={<AssignmentOutlinedIcon fontSize="small" />} title={t('course.add.homework')} hint={t('course.add.homeworkHint')} onClick={() => add('HOMEWORK')} />
        <AddOption icon={<TaskAltOutlinedIcon fontSize="small" />} title={t('course.add.quiz')} hint={t('course.add.quizHint')} onClick={() => add('QUIZ')} />
      </Menu>
    </Card>
  );
}

function AddOption({ icon, title, hint, soon, onClick }: { icon: ReactNode; title: string; hint: string; soon?: string; onClick?: () => void }) {
  return (
    <MenuItem onClick={onClick} disabled={!onClick} sx={{ alignItems: 'flex-start', gap: 1.25, borderRadius: 2, py: 1, whiteSpace: 'normal' }}>
      <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: 'primary.light', color: 'primary.main', display: 'grid', placeItems: 'center', flexShrink: 0, mt: 0.25 }}>{icon}</Box>
      <Box>
        <Stack direction="row" sx={{ gap: 0.75, alignItems: 'center' }}>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{title}</Typography>
          {soon && <Pill tone="neutral">{soon}</Pill>}
        </Stack>
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.3 }}>{hint}</Typography>
      </Box>
    </MenuItem>
  );
}

/** One lesson or assignment row */
function ItemRow({
  item,
  courseId,
  editMode,
  actions,
  rowProps = {},
  handleProps,
  moveUp = null,
  moveDown = null,
}: {
  item: WeekItem;
  courseId: string;
  editMode: boolean;
  actions: WeekActions;
  rowProps?: object;
  handleProps?: object;
  moveUp?: (() => void) | null;
  moveDown?: (() => void) | null;
}) {
  const { t } = useTranslation('teacher');
  const { locale } = useRouter();
  const [menu, setMenu] = useState<HTMLElement | null>(null);

  const isLesson = item.kind === 'lesson';
  const type = isLesson ? item.lesson.type : item.assignment.type;
  const title = isLesson ? item.lesson.title : item.assignment.title;
  const state = visibility(isLesson ? item.lesson.publishedAt : item.assignment.publishedAt);
  const tile = TILES[type] ?? TILES.LINK;
  const Icon = tile.icon;

  /** "Video · 22 min" · "PDF · 1.8 MB" · "Due Oct 16, 23:59 · 10 pts · Late: off · Resubmit: up to 3" (a quiz: "· 10 minutes") */
  const detail = () => {
    if (isLesson) {
      const { lesson } = item;
      if (lesson.type === 'VIDEO') {
        if (!lesson.file) return t('course.item.noVideo');
        if (lesson.file.status !== 'READY') return t(`course.item.fileStatus.${lesson.file.status}`);
        return lesson.file.durationSec
          ? `${t('course.item.video')} · ${t('course.item.minutes', { count: Math.max(1, Math.round(lesson.file.durationSec / 60)) })}`
          : t('course.item.video');
      }
      if (lesson.type === 'FILE') {
        return lesson.file ? `${fileType(lesson.file.mimeType)} · ${formatSize(lesson.file.size)}` : t('course.item.noFile');
      }
      if (lesson.type === 'LINK' && lesson.body) {
        try {
          return `${t('course.item.link')} · ${new URL(lesson.body).host}`;
        } catch {
          return t('course.item.link');
        }
      }
      return t(`course.item.type.${lesson.type}`);
    }
    const a = item.assignment;
    const due = a.dueAt
      ? t('course.item.due', {
          date: `${formatDate(a.dueAt, locale)}, ${new Date(a.dueAt).toTimeString().slice(0, 5)}`,
        })
      : t('course.item.noDue');
    return [
      due,
      t('course.item.points', { count: a.maxScore }),
      // A quiz cannot be started after its due date: its time limit says more than "Late"
      a.type === 'QUIZ' && a.timeLimitMin && t('quiz.minutes', { count: a.timeLimitMin }),
      a.type === 'HOMEWORK' && (a.allowLate ? t('course.item.lateOn') : t('course.item.lateOff')),
      a.type !== 'EXAM' && a.maxAttempts > 1 && t('course.item.resubmit', { count: a.maxAttempts }),
      a.files.length > 0 && t('course.item.attachments', { count: a.files.length }),
    ]
      .filter(Boolean)
      .join(' · ');
  };

  const open = () => actions.onOpenItem(item);
  const published = state !== 'DRAFT';

  return (
    <Box
      {...rowProps}
      sx={{
        px: 2,
        py: 1.25,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        transition: 'background-color 150ms',
        '&:hover': { bgcolor: '#F5FBF6' },
        '&:hover .drag-handle': { color: 'text.secondary' },
        ...dragRowSx,
      }}
    >
      {editMode && (
        <Box
          className="drag-handle"
          {...(isLesson ? handleProps : {})}
          title={isLesson ? t('course.dragItem') : t('course.assignmentOrder')}
          sx={{ display: 'flex', color: isLesson ? 'divider' : 'transparent', cursor: isLesson ? 'grab' : 'default' }}
        >
          <DragIndicatorIcon fontSize="small" />
        </Box>
      )}
      <Box sx={{ width: 32, height: 32, borderRadius: 1, border: 1, borderColor: 'divider', bgcolor: tile.bg, color: tile.fg, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Icon sx={{ fontSize: 18 }} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        {isLesson ? (
          <Typography
            component="button"
            onClick={open}
            sx={{ all: 'unset', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', '&:hover': { color: 'primary.main' }, '&:focus-visible': { outline: 2, outlineColor: 'secondary.main' } }}
          >
            {title}
          </Typography>
        ) : (
          <Typography
            component={NextLink}
            href={`/teacher/courses/${courseId}/assignments/${item.assignment.id}`}
            sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'text.primary', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', '&:hover': { color: 'primary.main' } }}
          >
            {title}
          </Typography>
        )}
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }} noWrap>
          {detail()}
        </Typography>
      </Box>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexShrink: 0 }}>
        <Box sx={{ display: { xs: editMode ? 'none' : 'block', sm: 'block' } }}>
          <Pill tone={state === 'PUBLISHED' ? 'success' : 'neutral'} square>
            {t(`course.status.${state}`)}
          </Pill>
        </Box>
        {editMode && (
          <>
            <Tooltip title={t('course.item.edit')}>
              <IconButton size="small" onClick={() => actions.onEditItem(item)} aria-label={t('course.item.edit')}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={published ? t('course.item.hide') : t('course.item.publish')}>
              <IconButton size="small" onClick={() => actions.onItemPublish(item, !published)} aria-label={published ? t('course.item.hide') : t('course.item.publish')}>
                {published ? <VisibilityOffOutlinedIcon fontSize="small" /> : <PublishOutlinedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={(e) => setMenu(e.currentTarget)} aria-label={t('course.item.more')}>
              <MoreVertIcon fontSize="small" />
            </IconButton>
            <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
              <MenuItem onClick={() => (setMenu(null), open())}>
                <ListItemIcon>
                  <VisibilityOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{isLesson ? t('course.item.open') : t('course.item.grade')}</ListItemText>
              </MenuItem>
              {isLesson && <Divider />}
              {isLesson && (
                <MenuItem disabled={!moveUp} onClick={() => (setMenu(null), moveUp?.())}>
                  <ListItemIcon>
                    <ArrowUpwardIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>{t('course.moveUp')}</ListItemText>
                </MenuItem>
              )}
              {isLesson && (
                <MenuItem disabled={!moveDown} onClick={() => (setMenu(null), moveDown?.())}>
                  <ListItemIcon>
                    <ArrowDownwardIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>{t('course.moveDown')}</ListItemText>
                </MenuItem>
              )}
            </Menu>
          </>
        )}
      </Stack>
    </Box>
  );
}
