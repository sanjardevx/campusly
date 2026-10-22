import { JetBrains_Mono } from 'next/font/google';

// IDs, phone numbers and passwords (Stitch: JetBrains Mono): 26100042 lines up digit by digit.
// Its own module, not theme.ts: a second next/font call in a module that _app imports made
// Turbopack (dev) leave shared modules such as useQuery out of every page's chunks.
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['500', '600'], display: 'swap' });

export const monoFontFamily = [jetbrainsMono.style.fontFamily, 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'].join(
  ',',
);
