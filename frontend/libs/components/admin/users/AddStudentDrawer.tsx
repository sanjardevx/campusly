import { useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { Alert, Button, CircularProgress, Link, MenuItem, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import PrintOutlinedIcon from '@mui/icons-material/PrintOutlined';
import { useTranslation } from 'next-i18next/pages';
import { CREATE_STUDENT, LINK_PARENT } from '@/apollo/admin/mutation';
import { GROUPS } from '@/apollo/admin/query';
import { CredentialCard } from '@/libs/components/admin/CredentialCard';
import { PrintableSlips, type Slip } from '@/libs/components/admin/LoginSlips';
import { DrawerSection, SideDrawer } from '@/libs/components/admin/SideDrawer';
import { FormField } from '@/libs/components/auth/FormField';
import { SCHOOL_TIMEZONE } from '@/libs/config';
import { errorCode } from '@/libs/errors';
import type { ParentInput } from '@/libs/gql/graphql';
import { useErrorText } from '@/libs/i18n';
import { EMPTY_PARENT, isEmptyParent, type ParentForm, ParentFields, parentErrors } from './ParentFields';

const thisYear = Number(new Intl.DateTimeFormat('en', { timeZone: SCHOOL_TIMEZONE, year: 'numeric' }).format(new Date()));
const YEARS = Array.from({ length: 6 }, (_, i) => thisYear - i);

interface StudentForm {
  firstName: string;
  lastName: string;
  /** "YYYY-MM-DD" from the date input, or empty */
  birthDate: string;
  admissionYear: number;
  groupId: string;
}

interface Result {
  student: Slip;
  parents: Slip[];
  /** createStudent worked, the second parent did not (an error code) */
  secondParentError?: string;
}

const toParentInput = (p: ParentForm): ParentInput => ({
  firstName: p.firstName.trim(),
  lastName: p.lastName.trim(),
  phone: `+998${p.phone}`,
  relation: p.relation,
});

/**
 * Stitch "Add student" drawer. Step 1 student, step 2 parent(s), step 3 the sign-in details.
 * IDs and passwords are made by the server inside the saving transaction, so they appear after
 * Save (Stitch shows a "Generate" button first; an ID shown before saving would have to be reserved).
 */
export function AddStudentDrawer({
  open,
  defaultGroupId,
  onClose,
}: {
  open: boolean;
  defaultGroupId?: string;
  onClose: () => void;
}) {
  const { t } = useTranslation('admin');
  const errorText = useErrorText();
  const client = useApolloClient();
  const groups = useQuery(GROUPS, { skip: !open });

  const fresh = (): StudentForm => ({ firstName: '', lastName: '', birthDate: '', admissionYear: thisYear, groupId: defaultGroupId ?? '' });
  const [form, setForm] = useState<StudentForm>(fresh);
  const [parent, setParent] = useState<ParentForm>(EMPTY_PARENT);
  const [second, setSecond] = useState<ParentForm | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const reset = () => {
    setForm(fresh());
    setParent(EMPTY_PARENT);
    setSecond(null);
    setShowErrors(false);
    setError(null);
    setResult(null);
  };
  const close = () => {
    reset();
    onClose();
  };

  const studentErrors = {
    firstName: form.firstName.trim().length < 2 ? 'add.nameLength' : null,
    lastName: form.lastName.trim().length < 2 ? 'add.nameLength' : null,
    groupId: form.groupId ? null : 'add.required',
  };
  const err = (key: keyof typeof studentErrors) =>
    showErrors && studentErrors[key] ? { error: true, helperText: t(studentErrors[key]!) } : {};

  const save = async () => {
    setShowErrors(true);
    setError(null);
    const parentOk = isEmptyParent(parent) || !parentErrors(parent);
    const secondOk = !second || isEmptyParent(second) || !parentErrors(second);
    if (Object.values(studentErrors).some(Boolean) || !parentOk || !secondOk) return;

    setSaving(true);
    try {
      // no-cache: the passwords in the answer must not stay in Apollo's cache
      const { data } = await client.mutate({
        mutation: CREATE_STUDENT,
        fetchPolicy: 'no-cache',
        variables: {
          input: {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            groupId: form.groupId,
            admissionYear: form.admissionYear,
            // A calendar day: sent as that day at 00:00 UTC (the DateTime scalar wants a full ISO date)
            birthDate: form.birthDate ? `${form.birthDate}T00:00:00.000Z` : undefined,
            parent: isEmptyParent(parent) ? undefined : toParentInput(parent),
          },
        },
      });
      const created = data!.createStudent;
      const next: Result = { student: created.student, parents: created.parent ? [created.parent] : [] };

      // The second parent is a separate request: if it fails, the student is still saved
      if (second && !isEmptyParent(second)) {
        try {
          const linked = await client.mutate({
            mutation: LINK_PARENT,
            fetchPolicy: 'no-cache',
            variables: { studentId: created.student.userId, input: toParentInput(second) },
          });
          if (linked.data) next.parents.push(linked.data.linkParent);
        } catch (e) {
          next.secondParentError = errorCode(e);
        }
      }
      setResult(next);
      await client.refetchQueries({ include: ['Users', 'UserCounts', 'Groups'] });
    } catch (e) {
      setError(errorCode(e));
    } finally {
      setSaving(false);
    }
  };

  const done = !!result;
  const slips = result ? [result.student, ...result.parents] : [];

  return (
    <SideDrawer
      open={open}
      title={t('add.studentTitle')}
      subtitle={t('add.studentSubtitle')}
      closeLabel={t('add.close')}
      onClose={close}
      footer={
        <>
          <Button variant="outlined" onClick={close} disabled={saving}>
            {done ? t('add.close') : t('add.cancel')}
          </Button>
          <Stack direction="row" spacing={1.25} sx={{ ml: 'auto' }}>
            <Button
              variant="outlined"
              startIcon={<PrintOutlinedIcon />}
              disabled={!done}
              onClick={() => window.print()}
              sx={{ borderColor: 'primary.main', color: 'primary.main' }}
            >
              {t('add.print')}
            </Button>
            {done ? (
              <Button variant="contained" startIcon={<AddIcon />} onClick={reset}>
                {t('add.addAnother')}
              </Button>
            ) : (
              <Button
                variant="contained"
                startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <CheckIcon />}
                disabled={saving}
                onClick={() => void save()}
              >
                {t('add.save')}
              </Button>
            )}
          </Stack>
        </>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorText(error)}
        </Alert>
      )}

      <DrawerSection title={t('add.sectionStudent')} step={t('add.step', { n: 1 })}>
        <Stack direction="row" spacing={1.5}>
          <FormField
            id="student-first"
            label={t('add.firstName')}
            value={form.firstName}
            disabled={done}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            {...err('firstName')}
          />
          <FormField
            id="student-last"
            label={t('add.lastName')}
            value={form.lastName}
            disabled={done}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            {...err('lastName')}
          />
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <FormField
            id="student-birth"
            type="date"
            label={t('add.birthDate')}
            value={form.birthDate}
            disabled={done}
            onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
          />
          <FormField
            id="student-year"
            select
            label={t('add.admissionYear')}
            value={form.admissionYear}
            disabled={done}
            onChange={(e) => setForm({ ...form, admissionYear: Number(e.target.value) })}
          >
            {YEARS.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </FormField>
          <FormField
            id="student-class"
            select
            label={t('add.class')}
            value={form.groupId}
            disabled={done}
            onChange={(e) => setForm({ ...form, groupId: e.target.value })}
            {...err('groupId')}
          >
            {(groups.data?.groups ?? [])
              .filter((g) => g.status === 'ACTIVE')
              .map((g) => (
                <MenuItem key={g.id} value={g.id}>
                  {g.name}
                </MenuItem>
              ))}
          </FormField>
        </Stack>
        {result && <CredentialCard slip={result.student} />}
      </DrawerSection>

      <DrawerSection title={t('add.sectionParent')} step={t('add.step', { n: 2 })}>
        <ParentFields idPrefix="parent1" value={parent} showErrors={showErrors} disabled={done} onChange={setParent} />
        {!done && (
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 400 }}>
            {t('add.parentOptional')}
          </Typography>
        )}
        {result?.parents[0] && <CredentialCard slip={result.parents[0]} />}

        {second ? (
          <>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', pt: 1 }}>
              <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {t('add.sectionSecondParent')}
              </Typography>
              {!done && (
                <Link component="button" type="button" underline="hover" onClick={() => setSecond(null)} sx={{ fontSize: '0.75rem' }}>
                  {t('add.remove')}
                </Link>
              )}
            </Stack>
            <ParentFields idPrefix="parent2" value={second} showErrors={showErrors} disabled={done} onChange={setSecond} />
            {result?.parents[1] && <CredentialCard slip={result.parents[1]} />}
            {result?.secondParentError && (
              <Alert severity="warning">{t('add.partial', { error: errorText(result.secondParentError) })}</Alert>
            )}
          </>
        ) : (
          !done && (
            <Stack spacing={0.75}>
              <Link
                component="button"
                type="button"
                underline="hover"
                onClick={() => setSecond({ ...EMPTY_PARENT, relation: 'MOTHER' })}
                sx={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: '0.8125rem', fontWeight: 600 }}
              >
                <AddIcon sx={{ fontSize: 16 }} />
                {t('add.addSecondParent')}
              </Link>
            </Stack>
          )
        )}
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', fontWeight: 400 }}>
          {t('add.linkNote')}
        </Typography>
      </DrawerSection>

      {/* Hidden on screen; "Print login slip" prints only these */}
      {done && <PrintableSlips slips={slips} />}
    </SideDrawer>
  );
}
