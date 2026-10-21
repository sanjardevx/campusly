import Head from "next/head";
import { useQuery } from "@apollo/client/react";
import { Alert, Box, Button, Card, CardContent, Chip, Stack, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import { HEALTH } from "@/apollo/app/query";
import { API_GRAPHQL_URL } from "@/libs/config";
import { withTranslations } from "@/libs/i18n/server";

export const getStaticProps = withTranslations();

function ServiceRow({ name, up }: { name: string; up: boolean }) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      {up ? <CheckCircleIcon color="success" /> : <CancelIcon color="error" />}
      <Typography>{name}</Typography>
    </Stack>
  );
}

// Day 1 skeleton page: proves the browser → API → Postgres/Redis chain works.
export default function Home() {
  const { data, loading, error, refetch } = useQuery(HEALTH, {
    fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: true,
  });

  return (
    <>
      <Head>
        <title>Campusly</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Box component="main" sx={{ maxWidth: 480, mx: "auto", px: 2, py: 6 }}>
        <Typography variant="h4" color="primary" sx={{ mb: 3 }}>
          Campusly
        </Typography>

        <Card>
          <CardContent>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h6">API health</Typography>
              {data && (
                <Chip
                  label={data.health.status}
                  color={data.health.status === "ok" ? "success" : "warning"}
                  size="small"
                />
              )}
            </Stack>

            {loading && <Typography color="text.secondary">Checking…</Typography>}
            {error && !loading && (
              <Alert severity="error">
                Cannot reach the API at {API_GRAPHQL_URL}. Is the backend running?
              </Alert>
            )}
            {data && !loading && (
              <Stack spacing={1}>
                <ServiceRow name="Postgres" up={data.health.postgres} />
                <ServiceRow name="Redis" up={data.health.redis} />
              </Stack>
            )}

            <Button variant="outlined" sx={{ mt: 2 }} onClick={() => void refetch()} disabled={loading}>
              Check again
            </Button>
          </CardContent>
        </Card>
      </Box>
    </>
  );
}
