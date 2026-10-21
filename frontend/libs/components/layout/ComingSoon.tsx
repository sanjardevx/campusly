import { useReactiveVar } from '@apollo/client/react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';
import { useTranslation } from 'next-i18next/pages';
import { userVar } from '@/apollo/store';
import { useActiveItem } from './nav';

/** Placeholder for a menu page that a later day of the plan builds */
export function ComingSoon() {
  const { t } = useTranslation('common');
  const user = useReactiveVar(userVar);
  const item = useActiveItem(user?.role ?? 'STUDENT');

  return (
    <Card>
      <CardContent>
        <Box sx={{ textAlign: 'center', py: { xs: 4, md: 8 } }}>
          <ConstructionOutlinedIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
          <Typography variant="h4" component="h2">
            {t('shell.comingSoon')}
          </Typography>
          {item && (
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              {t('shell.comingSoonBody', { day: item.day })}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
