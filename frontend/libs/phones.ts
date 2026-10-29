/** The school phone in Settings may hold several numbers, comma-separated ("+998 …, +82 …") */
export const phonesOf = (value: string | null | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

/** "tel:+998938900326" from "+998 93 890 03 26" */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
