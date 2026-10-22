import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import { useTranslation } from 'next-i18next/pages';
import { LOG_RECORD_EXPORT } from '@/apollo/admin/mutation';
import { SCHOOL_SETTINGS } from '@/apollo/app/query';
import { type Cell, downloadCsv, fileSlug } from '@/libs/csv';
import type { RecordFormat, RecordReport } from '@/libs/gql/graphql';
import { monoFontFamily } from '@/libs/fonts';
import { formatDate } from '@/libs/i18n/format';

export interface Sheet {
  report: RecordReport;
  /** The class, course or student the document is about (audit log) */
  targetId?: string;
  /** Document title, e.g. "Grades journal" */
  title: string;
  /** What was chosen, e.g. "9A Math · Quarter 1": printed under the title, in the file name and in the log */
  scope: string;
  header: string[];
  rows: Cell[][];
  /** A line under the table, e.g. the attendance letters legend */
  note?: string;
  /** Columns shown in the monospace font (IDs) */
  monoColumns?: number[];
}

const head = {
  bgcolor: 'background.default',
  fontSize: '0.6875rem',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'text.secondary',
  whiteSpace: 'nowrap',
} as const;

/**
 * Every Records tab ends in this: the table on screen, "Download CSV" and "Print".
 * Both files are built in the browser from what is on screen; the server only logs who took what.
 */
export function RecordSheet({
  sheet,
  loading,
  empty,
  filters,
}: {
  sheet: Sheet | null;
  loading?: boolean;
  /** Shown instead of the table: "Choose a course" or "No students" */
  empty: string;
  filters: ReactNode;
}) {
  const { t } = useTranslation('admin');
  const [logExport] = useMutation(LOG_RECORD_EXPORT);
  const rows = sheet?.rows ?? [];
  const ready = !!sheet && rows.length > 0;

  const exportAs = (format: RecordFormat) => {
    if (!sheet) return;
    // The log must not block the admin: a failed log write is not worth a failed download
    void logExport({
      variables: { input: { report: sheet.report, format, targetId: sheet.targetId, scope: sheet.scope.slice(0, 100) } },
    }).catch(() => undefined);
    if (format === 'CSV') downloadCsv(`${fileSlug(sheet.title, sheet.scope)}.csv`, sheet.header, rows);
    else window.print();
  };

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        sx={{ p: 2, alignItems: { md: 'center' }, justifyContent: 'space-between', borderBottom: 1, borderColor: 'divider' }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ flexWrap: 'wrap', minWidth: 0 }}>
          {filters}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          <Button variant="outlined" startIcon={<PrintOutlinedIcon />} disabled={!ready} onClick={() => exportAs('PRINT')}>
            {t('records.print')}
          </Button>
          <Button variant="contained" startIcon={<FileDownloadOutlinedIcon />} disabled={!ready} onClick={() => exportAs('CSV')}>
            {t('records.csv')}
          </Button>
        </Stack>
      </Stack>

      {loading ? (
        <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : !ready ? (
        <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>
          {empty}
        </Typography>
      ) : (
        <>
          <TableContainer sx={{ maxHeight: 560 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {sheet.header.map((h, i) => (
                    <TableCell key={i} sx={head}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, r) => (
                  <TableRow key={r} hover>
                    {row.map((cell, c) => (
                      <TableCell
                        key={c}
                        sx={{ whiteSpace: 'nowrap', ...(sheet.monoColumns?.includes(c) && { fontFamily: monoFontFamily }) }}
                      >
                        {cell ?? '—'}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: 'divider' }}>
            {t('records.rowCount', { count: rows.length })}
            {sheet.note && ` · ${sheet.note}`}
          </Typography>
          <PrintableSheet sheet={sheet} />
        </>
      )}
    </Card>
  );
}

/** Hidden on screen, the only thing printed (.print-sheet in globals.css): a plain black-and-white table */
function PrintableSheet({ sheet }: { sheet: Sheet }) {
  const { locale } = useRouter();
  const { t } = useTranslation('admin');
  const school = useQuery(SCHOOL_SETTINGS).data?.schoolSettings.schoolName;
  const cell = { border: '1px solid #9AA19C', padding: '1.5mm 2mm', textAlign: 'left' } as const;

  return createPortal(
    <Box className="print-sheet" sx={{ color: '#242A27', fontSize: '9pt' }}>
      <Typography sx={{ fontSize: '9pt', color: '#5C625E', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {school}
      </Typography>
      <Typography sx={{ fontSize: '15pt', fontWeight: 700 }}>{sheet.title}</Typography>
      <Typography sx={{ fontSize: '10pt', mb: '4mm' }}>
        {sheet.scope} · {t('records.printedOn', { date: formatDate(new Date(), locale) })}
      </Typography>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            {sheet.header.map((h, i) => (
              <th key={i} style={{ ...cell, background: '#F1F3F1' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sheet.rows.map((row, r) => (
            <tr key={r} style={{ breakInside: 'avoid' }}>
              {row.map((value, c) => (
                <td key={c} style={cell}>
                  {value ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {sheet.note && <Typography sx={{ fontSize: '8pt', color: '#5C625E', mt: '2mm' }}>{sheet.note}</Typography>}
    </Box>,
    document.body,
  );
}
