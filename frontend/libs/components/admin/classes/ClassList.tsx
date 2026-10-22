import { useState } from 'react';
import { Box, ButtonBase, Card, Chip, Collapse, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'next-i18next/pages';
import { gradeOf } from '@/libs/components/admin/users/UsersFilters';

export interface ClassItem {
  id: string;
  name: string;
  studentCount: number;
  status: string;
}

/** Stitch left panel: search, classes grouped by grade (each group folds), "9A · 24 students · 8 courses" */
export function ClassList({
  groups,
  courseCount,
  selected,
  onSelect,
}: {
  groups: ClassItem[];
  courseCount: (groupId: string) => number;
  selected?: string;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation('admin');
  const [text, setText] = useState('');
  const [folded, setFolded] = useState<Set<string>>(new Set());

  const q = text.trim().toUpperCase();
  const shown = groups.filter((g) => !q || g.name.toUpperCase().includes(q));
  // Like Stitch: grade 9, 10, 11 … ascending; names without a number ("Prep") last
  const sections = [...new Set(shown.map((g) => gradeOf(g.name) ?? ''))].sort((a, b) =>
    a === '' ? 1 : b === '' ? -1 : Number(a) - Number(b),
  );
  const toggle = (grade: string) => {
    const next = new Set(folded);
    if (next.has(grade)) next.delete(grade);
    else next.add(grade);
    setFolded(next);
  };

  return (
    <Card sx={{ width: { md: 340 }, flexShrink: 0, alignSelf: 'flex-start' }}>
      <Box sx={{ p: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <TextField
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('classes.findClass')}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'background.default' } }}
        />
      </Box>
      {sections.map((grade) => (
        <Box key={grade}>
          <ButtonBase
            onClick={() => toggle(grade)}
            aria-expanded={!folded.has(grade)}
            sx={{ width: '100%', justifyContent: 'space-between', px: 2, pt: 1.75, pb: 1 }}
          >
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'text.secondary' }}>
              {grade ? t('classes.grade', { n: grade }) : t('classes.otherClasses')}
            </Typography>
            <ExpandMoreIcon
              fontSize="small"
              sx={{ color: 'text.secondary', transform: folded.has(grade) ? 'rotate(-90deg)' : 'none', transition: 'transform 150ms' }}
            />
          </ButtonBase>
          <Collapse in={!folded.has(grade)}>
            {shown
              .filter((g) => (gradeOf(g.name) ?? '') === grade)
              .map((g) => {
                const active = g.id === selected;
                return (
                  <ButtonBase
                    key={g.id}
                    onClick={() => onSelect(g.id)}
                    aria-current={active ? 'true' : undefined}
                    sx={{
                      width: '100%',
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      px: 2,
                      py: 1.25,
                      borderLeft: '3px solid',
                      borderColor: active ? 'primary.main' : 'transparent',
                      bgcolor: active ? 'primary.light' : 'transparent',
                      '&:hover': { bgcolor: active ? 'primary.light' : 'action.hover' },
                    }}
                  >
                    <Box>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Typography sx={{ fontWeight: 600, color: g.status === 'ARCHIVED' ? 'text.disabled' : 'text.primary' }}>
                          {g.name}
                        </Typography>
                        {g.status === 'ARCHIVED' && <Chip size="small" label={t('classes.card.archived')} />}
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {t('classes.nStudents', { count: g.studentCount })} · {t('classes.nCourses', { count: courseCount(g.id) })}
                      </Typography>
                    </Box>
                  </ButtonBase>
                );
              })}
          </Collapse>
        </Box>
      ))}
      {groups.length === 0 && (
        <Typography color="text.secondary" sx={{ p: 2 }}>
          {t('classes.noClasses')}
        </Typography>
      )}
    </Card>
  );
}
