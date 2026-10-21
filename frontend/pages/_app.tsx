import "@/styles/globals.css";
import { useEffect } from "react";
import type { AppProps } from "next/app";
import { ApolloProvider } from "@apollo/client/react";
import { AppCacheProvider } from "@mui/material-nextjs/v16-pagesRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { useApollo } from "@/apollo/client";
import { restoreSession } from "@/libs/auth";
import { installAuthDebug } from "@/libs/auth/debug";

export default function App(props: AppProps) {
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
      <ApolloProvider client={client}>
        <CssBaseline />
        <Component {...pageProps} />
      </ApolloProvider>
    </AppCacheProvider>
  );
}
