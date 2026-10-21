import { useState } from "react";
import { useTranslation } from "next-i18next/pages";
import { useApolloClient, useLazyQuery, useReactiveVar } from "@apollo/client/react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { sessionReadyVar, userVar } from "@/apollo/store";
import { ME } from "@/apollo/user/query";
import { logIn, logOut } from "@/libs/auth";
import { AuthError } from "@/libs/auth/api";
import { breakToken, expireToken } from "@/libs/auth/debug";
import { LanguageSwitcher } from "@/libs/components/LanguageSwitcher";
import { useErrorText } from "@/libs/i18n";
import { withTranslations } from "@/libs/i18n/server";

export const getStaticProps = withTranslations();

// Auth test page (steps 2–3). The designed sign-in pages (tabs, banners) come in step 4.
export default function Login() {
  const { t } = useTranslation("common");
  const errorText = useErrorText();
  const client = useApolloClient();
  const user = useReactiveVar(userVar);
  const ready = useReactiveVar(sessionReadyVar);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadMe, me] = useLazyQuery(ME, { fetchPolicy: "network-only" });
  const [test, setTest] = useState<string | null>(null);

  /** Six parallel requests with an expired token: how many /auth/refresh calls? */
  const sixParallel = async () => {
    expireToken();
    const before = performance.getEntriesByType("resource").length;
    // queryDeduplication off: Apollo would otherwise merge the six identical queries into one
    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        client.query({ query: ME, fetchPolicy: "network-only", context: { queryDeduplication: false } }),
      ),
    );
    const calls = performance.getEntriesByType("resource").slice(before);
    const count = (path: string) => calls.filter((e) => e.name.endsWith(path)).length;
    setTest(
      `6 queries OK: ${results.every((r) => r.data?.me)} · /graphql requests: ${count("/graphql")} · /auth/refresh calls: ${count("/auth/refresh")}`,
    );
  };

  /** The server refuses the token: errorLink refreshes once and repeats the request */
  const refused = async () => {
    breakToken();
    const r = await client.query({ query: ME, fetchPolicy: "network-only" });
    setTest(`refused token → refreshed and retried → me: ${r.data?.me.firstName}`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await logIn(loginId, password);
    } catch (err) {
      setError(err instanceof AuthError ? err.code : "UNKNOWN");
    }
  };

  return (
    <Box component="main" sx={{ maxWidth: 420, mx: "auto", px: 2, py: 6 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h5" color="primary">{t("auth.title")}</Typography>
        <LanguageSwitcher />
      </Stack>
      {!ready && <Typography color="text.secondary">{t("auth.restoring")}</Typography>}

      {ready && !user && (
        <Stack component="form" spacing={2} onSubmit={submit}>
          <TextField label={t("auth.loginId")} value={loginId} onChange={(e) => setLoginId(e.target.value)} />
          <TextField label={t("auth.password")} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <Alert severity="error" data-testid="error-code">{errorText(error)}</Alert>}
          <Button type="submit" variant="contained">{t("auth.signIn")}</Button>
        </Stack>
      )}

      {user && (
        <Stack spacing={2}>
          <Alert severity="success" data-testid="signed-in">
            {t("auth.signedInAs", { name: `${user.firstName} ${user.lastName}` })} · {t(`roles.${user.role}`)}
          </Alert>
          <Button variant="outlined" onClick={() => void loadMe()}>Run the `me` query</Button>
          {me.data && <Typography data-testid="me">me: {me.data.me.firstName} ({me.data.me.role})</Typography>}
          {process.env.NODE_ENV === "development" && (
            <>
              <Button variant="outlined" onClick={() => void sixParallel()}>Test: expired token + 6 parallel queries</Button>
              <Button variant="outlined" onClick={() => void refused()}>Test: token refused by the server</Button>
              {test && <Alert severity="info" data-testid="test-result">{test}</Alert>}
            </>
          )}
          <Button color="error" onClick={() => void logOut(client)}>{t("auth.signOut")}</Button>
        </Stack>
      )}
    </Box>
  );
}
