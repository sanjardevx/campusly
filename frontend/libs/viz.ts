/**
 * Data colours (DECISIONS §13). Plain constants, apart from theme.ts (which loads next/font):
 * charts and tiles import only these.
 *
 * Attendance statuses: checked with the dataviz palette validator on white — every gate passes;
 * present↔absent is in the 6–8 CVD band, so the donut keeps a 2 px gap between segments and every
 * colour has a text label next to it (never colour alone).
 */
export const viz = {
  present: '#1BAF7A',
  late: '#EDA100',
  excused: '#2A78D6',
  absent: '#E34948',
  // School calendar: the same four validated hues (all pairs pass; red↔green needs the labels).
  // Term starts count as a start, term ends as a deadline: 4 colours, never more.
  calendar: {
    HOLIDAY: '#E34948',
    EVENT: '#2A78D6',
    DEADLINE: '#EDA100',
    START: '#1BAF7A',
    TERM_START: '#1BAF7A',
    TERM_END: '#EDA100',
  },
  // KPI icon tiles: a soft tint behind a darker icon of the same hue (decoration, not data)
  tile: {
    spruce: { fg: '#1F4E43', bg: '#E8EFEA' },
    blue: { fg: '#1C5CAB', bg: '#EAF2FC' },
    aqua: { fg: '#0E7A55', bg: '#E5F6EE' },
    amber: { fg: '#8A5A00', bg: '#FDF3DD' },
  },
} as const;
