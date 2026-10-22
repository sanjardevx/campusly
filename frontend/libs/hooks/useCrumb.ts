import { useEffect } from 'react';
import { crumbVar } from '@/apollo/store';

/** The page names its current view in the top bar: Users / **Students** */
export function useCrumb(label: string | null) {
  useEffect(() => {
    crumbVar(label);
    return () => {
      crumbVar(null);
    };
  }, [label]);
}
