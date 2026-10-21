import { Html, Head, Main, NextScript, type DocumentContext, type DocumentProps } from "next/document";
import {
  DocumentHeadTags,
  documentGetInitialProps,
  type DocumentHeadTagsProps,
} from "@mui/material-nextjs/v16-pagesRouter";

export default function Document(props: DocumentProps & DocumentHeadTagsProps) {
  // No lang attribute here: Next.js sets it from the current locale (en / uz / ru / ko)
  return (
    <Html>
      <Head>
        {/* Emotion style tags collected during the server render */}
        <DocumentHeadTags {...props} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

Document.getInitialProps = async (ctx: DocumentContext) => documentGetInitialProps(ctx);
