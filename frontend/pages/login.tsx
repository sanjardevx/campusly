import { useState } from "react";
import { useApolloClient, useLazyQuery, useReactiveVar } from "@apollo/client/react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { sessionReadyVar, userVar } from "@/apollo/store";
import { ME } from "@/apollo/user/query";
import { logIn, logOut } from "@/libs/auth";
import { AuthError } from "@/libs/auth/api";
import { breakToken, expireToken } from "@/libs/auth/debug";

// Step 2 test page: plain on purpose. The designed sign-in pages (tabs, i18n) come in step 4.
export default function Login() {
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
      <Typography variant="h5" sx={{ mb: 2 }}>Sign in (auth test)</Typography>
      {!ready && <Typography color="text.secondary">Restoring session…</Typography>}

      {ready && !user && (
        <Stack component="form" spacing={2} onSubmit={submit}>
          <TextField label="Login ID" value={loginId} onChange={(e) => setLoginId(e.target.value)} />
          <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <Alert severity="error" data-testid="error-code">{error}</Alert>}
          <Button type="submit" variant="contained">Sign in</Button>
        </Stack>
      )}

      {user && (
        <Stack spacing={2}>
          <Alert severity="success" data-testid="signed-in">
            {user.firstName} {user.lastName} · {user.role} · {user.loginId}
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
          <Button color="error" onClick={() => void logOut(client)}>Sign out</Button>
        </Stack>
      )}
    </Box>
  );
}
