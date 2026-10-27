import { Html, Head, Main, NextScript, type DocumentContext, type DocumentProps } from "next/document";
import {
  DocumentHeadTags,
  documentGetInitialProps,
  type DocumentHeadTagsProps,
} from "@mui/material-nextjs/v16-pagesRouter";
import { MOTION_BOOT } from "@/libs/components/site/motionBoot";

export default function Document(props: DocumentProps & DocumentHeadTagsProps) {
  // No lang attribute here: Next.js sets it from the current locale (en / uz / ru / ko)
  return (
    <Html>
      <Head>
        {/* Emotion style tags collected during the server render */}
        <DocumentHeadTags {...props} />
        {/* Before the first paint: the public site's headline and numbers start hidden instead of flashing (site/motion.tsx) */}
        <script dangerouslySetInnerHTML={{ __html: MOTION_BOOT }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

Document.getInitialProps = async (ctx: DocumentContext) => documentGetInitialProps(ctx);
