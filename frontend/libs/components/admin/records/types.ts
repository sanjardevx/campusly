/** Every Records tab reads and writes its filters in the URL (?tab=GRADES&course=…&period=…) */
export interface TabProps {
  params: Record<string, string | undefined>;
  setParams: (patch: Record<string, string | undefined>) => void;
}

export const fullName = (u: { firstName: string; lastName: string }) => `${u.lastName} ${u.firstName}`;
