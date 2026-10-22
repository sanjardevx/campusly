import { useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { UPDATE_SCHOOL_SETTINGS } from '@/apollo/admin/mutation';
import { errorCode } from '@/libs/errors';
import type { UpdateSchoolSettingsInput } from '@/libs/gql/graphql';

/**
 * Edit mode + saving for one settings card. `reset` puts the card's saved values back (Cancel).
 * SchoolSettings has no id, so Apollo cannot update it in the cache by itself: the SchoolSettings
 * query is fetched again after a save.
 */
export function useSettingsSave(reset: () => void) {
  const client = useApolloClient();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (input: UpdateSchoolSettingsInput) => {
    setBusy(true);
    setError(null);
    try {
      await client.mutate({ mutation: UPDATE_SCHOOL_SETTINGS, variables: { input } });
      await client.refetchQueries({ include: ['SchoolSettings'] });
      setSaved(true);
      setEditing(false);
    } catch (e) {
      setError(errorCode(e));
    } finally {
      setBusy(false);
    }
  };

  return {
    editing,
    busy,
    saved,
    error,
    save,
    onEdit: () => {
      setSaved(false);
      setEditing(true);
    },
    onCancel: () => {
      reset();
      setError(null);
      setEditing(false);
    },
  };
}
