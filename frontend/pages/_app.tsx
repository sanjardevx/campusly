import "@/styles/globals.css";
import { useEffect } from "react";
import type { AppProps } from "next/app";
import { ApolloProvider } from "@apollo/client/react";
import { AppCacheProvider } from "@mui/material-nextjs/v16-pagesRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { appWithTranslation } from "next-i18next/pages";
import { useApollo } from "@/apollo/client";
import { restoreSession } from "@/libs/auth";
import { installAuthDebug } from "@/libs/auth/debug";
import { theme } from "@/libs/theme";
import i18nConfig from "../next-i18next.config.js";

function App(props: AppProps) {
  const { Component, pageProps } = props;
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
          <CssBaseline />
          <Component {...pageProps} />
        </ApolloProvider>
      </ThemeProvider>
    </AppCacheProvider>
  );
}

// Same as Nestar: translations from getStaticProps reach every page through this wrapper
export default appWithTranslation(App, i18nConfig);
