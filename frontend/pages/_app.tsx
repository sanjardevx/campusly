import "@/styles/globals.css";
import { useEffect } from "react";
import type { AppProps } from "next/app";
import Head from "next/head";
import { ApolloProvider } from "@apollo/client/react";
import { AppCacheProvider } from "@mui/material-nextjs/v16-pagesRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { appWithTranslation } from "next-i18next/pages";
import { useApollo } from "@/apollo/client";
import { restoreSession } from "@/libs/auth";
import { installAuthDebug } from "@/libs/auth/debug";
import { SITE_URL } from "@/libs/config";
// The Back listener of the role guard must exist before the first Back (side effect import)
import "@/libs/auth/navigation";
import { theme } from "@/libs/theme";
import type { NextPageWithLayout } from "@/libs/types/page";
import i18nConfig from "../next-i18next.config.js";

function App(props: AppProps & { Component: NextPageWithLayout }) {
  const { Component, pageProps } = props;
  // Signed-in areas wrap their pages in AppShell; public pages (login, password) have no layout
  const getLayout = Component.getLayout ?? ((page) => page);
  const client = useApollo();

  // After a reload the access token (memory) is gone: the httpOnly cookie brings it back
  useEffect(() => {
    installAuthDebug();
    void restoreSession();
  }, []);

  return (
    // AppCacheProvider: MUI (Emotion) styles are rendered on the server, so no flash of unstyled page
    <AppCacheProvider {...props}>
      <ThemeProvider theme={theme}>
        <ApolloProvider client={client}>
          {/* Link previews (Telegram, LinkedIn, …) for every page: the logo card public/og.jpg.
              A page may override a tag with the same key. */}
          <Head>
            <meta property="og:site_name" content="Campusly School" key="og:site_name" />
            <meta property="og:type" content="website" key="og:type" />
            <meta property="og:image" content={`${SITE_URL}/og.jpg`} key="og:image" />
            <meta property="og:image:width" content="1200" key="og:image:width" />
            <meta property="og:image:height" content="630" key="og:image:height" />
            <meta name="twitter:card" content="summary_large_image" key="twitter:card" />
          </Head>
          <CssBaseline />
          {getLayout(<Component {...pageProps} />)}
        </ApolloProvider>
      </ThemeProvider>
    </AppCacheProvider>
  );
}

// Translations from getStaticProps reach every page through this wrapper
export default appWithTranslation(App, i18nConfig);
