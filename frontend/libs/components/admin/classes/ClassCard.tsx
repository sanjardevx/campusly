import NextLink from 'next/link';
import { useQuery } from '@apollo/client/react';
import {
  Box,
  Button,
  Card,
  Chip,
  Link,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import { useTranslation } from 'next-i18next/pages';
import { USERS } from '@/apollo/admin/query';
import { PasswordChip } from '@/libs/components/admin/users/UserChips';
import { monoFontFamily } from '@/libs/fonts';
import type { CoursesQuery } from '@/libs/gql/graphql';
import type { ClassItem } from './ClassList';
import { TeacherName } from './TeacherName';

type Course = CoursesQuery['courses'][number];

const head = {
  bgcolor: 'background.default',
  fontSize: '0.6875rem',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'text.secondary',
} as const;

/** Stitch right panel: "Class 9A", Edit class, Courses / Students tabs */
export function ClassCard({
  group,
  courses,
  tab,
  onTab,
  onEdit,
  onAssign,
}: {
  group: ClassItem;
  courses: Course[];
  tab: 'courses' | 'students';
  onTab: (tab: 'courses' | 'students') => void;
  onEdit: () => void;
  onAssign: (course: Course) => void;
}) {
  const { t } = useTranslation('admin');
  const students = useQuery(USERS, {
    skip: tab !== 'students',
    variables: {
      input: { page: 1, limit: 100, sort: 'lastName', direction: 'ASC', search: { role: 'STUDENT', groupId: group.id } },
    },
  });
  const split = [...new Set(courses.filter((c) => c.isSplitGroup).map((c) => c.subjectName))];

  return (
    <Card sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ px: 3, pt: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
          <Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="h3" component="h2">
                {t('classes.card.title', { name: group.name })}
              </Typography>
              {group.status === 'ARCHIVED' && <Chip size="small" label={t('classes.card.archived')} />}
            </Stack>
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              {t('classes.nStudents', { count: group.studentCount })} · {t('classes.nCourses', { count: courses.length })}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
            <Button variant="outlined" size="small" startIcon={<EditOutlinedIcon />} onClick={onEdit}>
              {t('classes.card.edit')}
            </Button>
            <Button variant="outlined" size="small" startIcon={<GroupOutlinedIcon />} onClick={() => onTab('students')}>
              {t('classes.card.viewStudents')}
            </Button>
          </Stack>
        </Stack>
        <Tabs value={tab} onChange={(_, v: 'courses' | 'students') => onTab(v)} sx={{ mt: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Tab
            value="courses"
            label={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <span>{t('classes.card.courses')}</span>
                <Chip size="small" label={courses.length} sx={{ height: 20, bgcolor: tab === 'courses' ? 'primary.light' : 'action.hover' }} />
              </Stack>
            }
          />
          <Tab
            value="students"
            label={
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <span>{t('classes.card.students')}</span>
                <Chip size="small" label={group.studentCount} sx={{ height: 20, bgcolor: tab === 'students' ? 'primary.light' : 'action.hover' }} />
              </Stack>
            }
          />
        </Tabs>
      </Box>

      {tab === 'courses' ? (
        <>
          <TableContainer>
            <Table sx={{ '& td, & th': { py: 1.5 } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...head, pl: 3 }}>{t('classes.col.course')}</TableCell>
                  <TableCell sx={head}>{t('classes.col.subject')}</TableCell>
                  <TableCell sx={head}>{t('classes.col.teacher')}</TableCell>
                  <TableCell sx={head} align="right">
                    {t('classes.col.students')}
                  </TableCell>
                  <TableCell sx={{ ...head, pr: 3 }}>{t('classes.col.weights')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {courses.map((c) => {
                  const owner = c.teachers[0];
                  return (
                    <TableRow key={c.id} hover>
                      <TableCell sx={{ pl: 3 }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Typography sx={{ fontWeight: 600 }}>{c.title}</Typography>
                          {c.status === 'DRAFT' && <Chip size="small" label={t('classes.draft')} />}
                        </Stack>
                      </TableCell>
                      <TableCell>{c.subjectName}</TableCell>
                      <TableCell>
                        {owner ? (
                          <TeacherName firstName={owner.firstName} lastName={owner.lastName} extra={c.teachers.length - 1} />
                        ) : (
                          // Ochre: the course cannot run until someone teaches it
                          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                            <Chip size="small" label={t('classes.noTeacher')} sx={{ color: 'warning.dark', bgcolor: 'warning.light' }} />
                            <Link component="button" type="button" onClick={() => onAssign(c)} sx={{ fontWeight: 600 }}>
                              {t('classes.assign')}
                            </Link>
                          </Stack>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {c.studentCount}
                      </TableCell>
                      <TableCell sx={{ pr: 3 }}>
                        <Box
                          component="span"
                          sx={{ fontFamily: monoFontFamily, fontSize: '0.8125rem', bgcolor: 'background.default', border: 1, borderColor: 'divider', borderRadius: 1, px: 1, py: 0.25 }}
                        >
                          {c.gradeCategories.map((g) => g.weight).join('/')}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {courses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                      {t('classes.noCourses')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {split.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 3, py: 2, borderTop: 1, borderColor: 'divider', color: 'text.secondary' }}>
              <CallSplitIcon fontSize="small" />
              <Typography variant="body2">{t('classes.splitNote', { subjects: split.join(', ') })}</Typography>
            </Stack>
          )}
        </>
      ) : (
        <>
          <TableContainer>
            <Table sx={{ '& td, & th': { py: 1.25 } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...head, pl: 3 }}>{t('classes.col.id')}</TableCell>
                  <TableCell sx={head}>{t('classes.col.name')}</TableCell>
                  <TableCell sx={head}>{t('classes.col.parent')}</TableCell>
                  <TableCell sx={{ ...head, pr: 3 }}>{t('classes.col.password')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(students.data?.users.list ?? []).map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell sx={{ pl: 3, fontFamily: monoFontFamily, fontSize: '0.8125rem', color: 'text.secondary' }}>{s.loginId}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {s.firstName} {s.lastName}
                    </TableCell>
                    <TableCell>{s.links.map((l) => l.fullName).join(', ') || '—'}</TableCell>
                    <TableCell sx={{ pr: 3 }}>
                      <PasswordChip state={s.passwordState} usesLeft={s.tempPasswordUsesLeft} />
                    </TableCell>
                  </TableRow>
                ))}
                {students.data && students.data.users.list.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                      {t('classes.noStudents')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
            <Link component={NextLink} href={{ pathname: '/_admin/users', query: { group: group.id } }} sx={{ fontWeight: 600 }}>
              {t('classes.openInUsers')} →
            </Link>
          </Box>
        </>
      )}
    </Card>
  );
}
