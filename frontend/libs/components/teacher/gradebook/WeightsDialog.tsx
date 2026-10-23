import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import QuizOutlinedIcon from '@mui/icons-material/QuizOutlined';
import { useTranslation } from 'next-i18next/pages';
import { SET_GRADE_CATEGORIES } from '@/apollo/teacher/mutation';
import { errorCode } from '@/libs/errors';
import { useErrorText } from '@/libs/i18n';
import { MARK_STYLE, type GradebookCourse, type Thresholds } from './model';

/** Spruce shades for the split bar, one per category (Stitch: dark → light) */
const SHADES = ['#1F4E43', '#3B7A6C', '#8EB6A8', '#5C8F80', '#B9D3C9', '#2B6054'];
const ICONS = [AssignmentOutlinedIcon, QuizOutlinedIcon, DescriptionOutlinedIcon];

interface Draft {
  key: string;
  id?: string;
  name: string;
  weight: string;
}

/**
 * Stitch "Category weights" modal: the course's own weights (all quarters). The server checks
 * again: every category kept (no deletes), names unique, total 100 (WEIGHTS_SUM).
 */
export function WeightsDialog({
  course,
  items,
  thresholds,
  onClose,
}: {
  course: GradebookCourse;
  /** This period's assignments per category: how many, how many not published */
  items: Map<string, { count: number; unpublished: number }>;
  thresholds: Thresholds;
  onClose: () => void;
}) {
  const { t } = useTranslation('teacher');
  const errorText = useErrorText();
  const [rows, setRows] = useState<Draft[]>(() =>
    [...course.gradeCategories].sort((a, b) => a.order - b.order).map((c) => ({ key: c.id, id: c.id, name: c.name, weight: String(c.weight) })),
  );
  const [renaming, setRenaming] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ el: HTMLElement; key: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [save, { loading }] = useMutation(SET_GRADE_CATEGORIES, { refetchQueries: ['GradebookCourses', 'GradebookGrades'], awaitRefetchQueries: true });

  const weights = rows.map((r) => Number(r.weight));
  const total = weights.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
  const weightsOk = weights.every((w) => Number.isInteger(w) && w >= 0 && w <= 100);
  const namesOk = rows.every((r) => r.name.trim()) && new Set(rows.map((r) => r.name.trim().toLowerCase())).size === rows.length;
  const valid = weightsOk && namesOk && total === 100;

  const update = (key: string, patch: Partial<Draft>) => setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const submit = async () => {
    setError(null);
    try {
      await save({
        variables: { input: { courseId: course.id, categories: rows.map((r) => ({ id: r.id, name: r.name.trim(), weight: Number(r.weight) })) } },
      });
      onClose();
    } catch (err) {
      setError(errorText(errorCode(err)));
    }
  };

  const thresholdsList: [number, string][] = [
    [5, `5 ≥ ${thresholds.mark5MinPercent}%`],
    [4, `4 ≥ ${thresholds.mark4MinPercent}%`],
    [3, `3 ≥ ${thresholds.mark3MinPercent}%`],
    [2, `2 < ${thresholds.mark3MinPercent}%`],
  ];

  return (
    <Dialog open onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pb: 1 }}>
        <Box>
          <Typography variant="h4" component="span" sx={{ fontWeight: 700, display: 'block' }}>
            {t('gradebook.weights.title')}
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{t('gradebook.weights.subtitle', { course: course.title })}</Typography>
        </Box>
        <IconButton onClick={onClose} aria-label={t('course.close')} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Table size="small" sx={{ '& td, & th': { px: 0.75 } }}>
            <TableHead>
              <TableRow sx={{ '& th': { fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' } }}>
                <TableCell>{t('gradebook.weights.category')}</TableCell>
                <TableCell>{t('gradebook.weights.items')}</TableCell>
                <TableCell align="right">{t('gradebook.weights.weight')}</TableCell>
                <TableCell sx={{ width: 36 }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, i) => {
                const Icon = ICONS[i % ICONS.length];
                const info = r.id ? items.get(r.id) : undefined;
                return (
                  <TableRow key={r.key}>
                    <TableCell>
                      <Stack direction="row" sx={{ gap: 1.25, alignItems: 'center' }}>
                        <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: 'primary.light', color: 'primary.main', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                          <Icon sx={{ fontSize: 17 }} />
                        </Box>
                        {renaming === r.key || !r.id ? (
                          <TextField
                            size="small"
                            value={r.name}
                            autoFocus={renaming === r.key}
                            onChange={(e) => update(r.key, { name: e.target.value })}
                            onBlur={() => setRenaming(null)}
                            placeholder={t('gradebook.weights.newName')}
                            slotProps={{ htmlInput: { maxLength: 40, 'aria-label': t('gradebook.weights.category') } }}
                            sx={{ '& input': { fontSize: '0.8125rem', py: 0.5 } }}
                          />
                        ) : (
                          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 500 }}>{r.name}</Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      {t('gradebook.weights.itemCount', { count: info?.count ?? 0 })}
                      {!!info?.unpublished && (
                        <Box component="span" sx={{ color: 'text.disabled', ml: 0.5 }}>
                          {t('gradebook.weights.unpublished', { count: info.unpublished })}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        type="number"
                        value={r.weight}
                        onChange={(e) => update(r.key, { weight: e.target.value })}
                        error={!Number.isInteger(Number(r.weight)) || Number(r.weight) < 0 || Number(r.weight) > 100}
                        slotProps={{
                          htmlInput: { min: 0, max: 100, step: 5, style: { textAlign: 'right', fontWeight: 600 }, 'aria-label': t('gradebook.weights.weightOf', { name: r.name }) },
                          input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                        }}
                        sx={{ width: 104, '& input': { fontSize: '0.8125rem', py: 0.5 } }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={(e) => setMenu({ el: e.currentTarget, key: r.key })} aria-label={t('gradebook.weights.more')}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Menu anchorEl={menu?.el} open={!!menu} onClose={() => setMenu(null)}>
            <MenuItem
              onClick={() => {
                setRenaming(menu!.key);
                setMenu(null);
              }}
            >
              {t('gradebook.weights.rename')}
            </MenuItem>
            {/* A saved category is never deleted (assignments use it): weight 0 switches it off */}
            <MenuItem
              onClick={() => {
                const key = menu!.key;
                if (rows.find((r) => r.key === key)?.id) update(key, { weight: '0' });
                else setRows((all) => all.filter((r) => r.key !== key));
                setMenu(null);
              }}
            >
              {rows.find((r) => r.key === menu?.key)?.id ? t('gradebook.weights.switchOff') : t('gradebook.weights.remove')}
            </MenuItem>
          </Menu>
          <Box>
            <Button size="small" startIcon={<AddIcon />} disabled={rows.length >= 8} onClick={() => setRows((all) => [...all, { key: `new-${all.length}-${Date.now()}`, name: '', weight: '0' }])}>
              {t('gradebook.weights.add')}
            </Button>
          </Box>

          {/* Split bar + the total */}
          <Box>
            <Box sx={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', bgcolor: 'background.default' }}>
              {rows.map((r, i) => (
                <Box
                  key={r.key}
                  title={`${r.name}: ${r.weight}%`}
                  sx={{ width: `${Math.max(0, Math.min(100, Number(r.weight) || 0))}%`, bgcolor: SHADES[i % SHADES.length], transition: 'width 300ms', '@media (prefers-reduced-motion: reduce)': { transition: 'none' } }}
                />
              ))}
            </Box>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
              <Typography sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>{t('gradebook.weights.mustAdd')}</Typography>
              <Stack direction="row" sx={{ gap: 0.5, alignItems: 'center', fontSize: '0.75rem', fontWeight: 600, color: total === 100 ? 'success.main' : 'error.main', fontVariantNumeric: 'tabular-nums' }}>
                {total === 100 ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : <ErrorOutlineOutlinedIcon sx={{ fontSize: 16 }} />}
                {t('gradebook.weights.total', { total })}
              </Stack>
            </Stack>
          </Box>

          <Stack direction="row" sx={{ gap: 1.25, p: 1.5, borderRadius: 2, bgcolor: 'primary.light', color: 'primary.main', border: 1, borderColor: '#D1E0D7' }}>
            <InfoOutlinedIcon fontSize="small" />
            <Typography sx={{ fontSize: '0.75rem', lineHeight: 1.6 }}>{t('gradebook.weights.info')}</Typography>
          </Stack>

          <Box sx={{ pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{t('gradebook.markTitle')}</Typography>
              <Typography sx={{ fontSize: '0.6875rem', color: 'text.disabled' }}>{t('gradebook.weights.markByAdmin')}</Typography>
            </Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
              {thresholdsList.map(([mark, text]) => (
                <Box key={mark} sx={{ textAlign: 'center', py: 0.75, borderRadius: 1.5, fontSize: '0.75rem', fontWeight: 600, color: MARK_STYLE[mark].color === '#FFFFFF' ? 'primary.main' : MARK_STYLE[mark].color, bgcolor: mark === 5 ? 'primary.light' : MARK_STYLE[mark].bg }}>
                  {text}
                </Box>
              ))}
            </Box>
          </Box>

          {!namesOk && <Alert severity="warning">{t('gradebook.weights.namesBad')}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button variant="outlined" color="inherit" onClick={onClose} disabled={loading} sx={{ borderColor: 'divider' }}>
          {t('course.cancel')}
        </Button>
        <Button variant="contained" disableElevation onClick={submit} disabled={!valid || loading} startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}>
          {t('gradebook.weights.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
