# Backend deploy (EC2)

Production = one EC2 box running `docker-compose.prod.yml` (api + batch + Redis + Caddy), RDS Postgres, the prod S3 bucket behind CloudFront, secrets in SSM Parameter Store. Region **eu-central-1** for everything (DECISIONS §3, §12).

Lessons map: 159 VPS setup → EC2 · 161 UFW → `ec2-setup.sh` · 166–168 Docker deploy → `docker-compose.prod.yml` · 169 Nginx + domain → Caddy.

---

## 0. Bedrock access (do it now, it is needed on day 18)

Console → Amazon Bedrock (eu-central-1) → model catalog / model access → **Anthropic Claude Haiku 5.5** (DECISIONS §3): submit the Anthropic use-case form if the console asks for it, and enable an embedding model (e.g. Amazon Titan Text Embeddings V2). Approval can take time. Then try the model once in the Bedrock playground.

## 1. Prod S3 bucket (like the dev one on day 6)

S3 → Create bucket `campusly-prod-media` (add a suffix if the name is taken; eu-central-1):

- Block Public Access: **all on**. Versioning off. Encryption SSE-S3 (default).
- Management → Lifecycle rule "abort-multipart": whole bucket, **Delete incomplete multipart uploads after 3 days**.
- Permissions → CORS (the frontend uploads with a presigned PUT):

  ```json
  [{ "AllowedOrigins": ["https://campusly.uz"], "AllowedMethods": ["PUT"],
     "AllowedHeaders": ["*"], "ExposeHeaders": ["ETag"], "MaxAgeSeconds": 3000 }]
  ```

## 2. Prod CloudFront (signed video links)

A new RSA key pair for prod (on the Mac, outside the repo; the private key goes to SSM in the next step):

```bash
mkdir -p ~/.campusly && cd ~/.campusly
openssl genrsa -out cf-prod-private.pem 2048
openssl rsa -pubout -in cf-prod-private.pem -out cf-prod-public.pem
```

CloudFront:

1. Public keys → Create → paste `cf-prod-public.pem` → name `campusly-prod`. Note the **key ID** (`CLOUDFRONT_KEY_PAIR_ID`).
2. Key groups → Create `campusly-prod` with that key.
3. Distributions → Create: origin = the prod bucket, **Origin access control (OAC)** → create new; Viewer protocol policy **Redirect HTTP to HTTPS**; **Restrict viewer access: Yes → Trusted key groups → `campusly-prod`**; WAF off.
4. Copy the bucket policy CloudFront offers → S3 bucket → Permissions → Bucket policy → paste.
5. Note the distribution domain `dxxxx.cloudfront.net`. Day 15: alternate domain `media.campusly.uz` + an ACM certificate from **us-east-1** (CloudFront only takes certificates from there); `CLOUDFRONT_DOMAIN` = `media.campusly.uz`.

## 3. IAM role for the EC2 box (no access keys on the server)

IAM → Roles → Create role:

- Trusted entity: **AWS service → EC2**. No managed policies.
- Name: `campusly-ec2`.
- Then the role → Add permissions → **Create inline policy** → JSON → paste [`iam-ec2-policy.json`](iam-ec2-policy.json), replacing `PROD_BUCKET` (bucket name) and `ACCOUNT_ID` (12 digits, top right of the console). Name: `campusly-ec2-app`.

What it allows: put / get / delete objects in the prod bucket only (HeadObject needs `s3:GetObject`), and read parameters under `/campusly/prod/` only. Nothing else.

## 4. EC2 instance

EC2 → Key pairs → Create `campusly-ec2` (ED25519, .pem) → save it on the Mac:

```bash
mv ~/Downloads/campusly-ec2.pem ~/.ssh/ && chmod 400 ~/.ssh/campusly-ec2.pem
```

EC2 → Launch instance:

| Setting | Value |
|---|---|
| Name | `campusly-api` |
| AMI | **Ubuntu Server 24.04 LTS**, architecture **64-bit (Arm)** |
| Type | **t4g.small** (2 vCPU, 2 GB) |
| Key pair | `campusly-ec2` |
| Security group | new `campusly-api-sg`: **SSH 22 from My IP**, HTTP 80 and HTTPS 443 from Anywhere (IPv4 + IPv6) |
| Storage | **20 GiB gp3** (images + build cache) |
| Advanced → IAM instance profile | `campusly-ec2` |
| Advanced → Metadata version | **V2 only (token required)** |
| Advanced → Metadata response hop limit | **2** — the containers are one network hop further than the box; with 1 the AWS SDK inside Docker gets no role credentials |

Then **Elastic IPs → Allocate → Associate** with `campusly-api`: the address survives stop / start, and `api.campusly.uz` will point to it (day 15).

## 5. Set up the box

```bash
scp -i ~/.ssh/campusly-ec2.pem backend/deploy/ec2-setup.sh ubuntu@<ELASTIC_IP>:~
ssh -i ~/.ssh/campusly-ec2.pem ubuntu@<ELASTIC_IP>
sudo bash ec2-setup.sh
exit   # log in again so the docker group applies
```

Checks (after logging in again):

```bash
free -h                      # Swap: 2.0Gi
sudo ufw status              # OpenSSH, 80/tcp, 443/tcp, 443/udp
docker compose version
aws sts get-caller-identity  # "Arn": "...:assumed-role/campusly-ec2/i-..."
```

## 6. Code on the box (private repo → read-only deploy key)

Push `develop` first (the server clones what is on GitHub). On the box:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N "" -C "campusly-ec2"
cat ~/.ssh/github_deploy.pub   # GitHub → repo → Settings → Deploy keys → Add (read-only)
printf 'Host github.com\n  IdentityFile ~/.ssh/github_deploy\n' >> ~/.ssh/config
git clone -b develop git@github.com:sanjardev23/campusly.git ~/campusly
```

## 7. RDS Postgres (private, SSL only)

First a password, in **CloudShell** (console top bar → CloudShell icon, region eu-central-1). Keep this tab open: step 8 uses the same variable.

```bash
export DB_PASSWORD=$(openssl rand -hex 24) && echo "$DB_PASSWORD"   # copy it into the RDS form below
```

EC2 → Security Groups → Create `campusly-db-sg` (default VPC): inbound **PostgreSQL 5432, source = `campusly-api-sg`** (the group, not an IP). Only the EC2 box can reach the database.

RDS → Create database:

| Setting | Value |
|---|---|
| Creation | Standard / full configuration · **PostgreSQL 17** (latest 17.x) |
| Template | Free tier (single-AZ) |
| Identifier | `campusly-db` |
| Master username | `campusly_admin` · credentials **self managed** · password = `DB_PASSWORD` |
| Instance | **db.t4g.micro** |
| Storage | gp3 **20 GiB**, autoscaling off |
| Connectivity | Don't connect an EC2 resource · default VPC · **Public access: No** · security group **`campusly-db-sg`** only (remove `default`) · AZ = the EC2 box's AZ |
| Monitoring | Performance / Database Insights off, Enhanced monitoring off |
| Additional → Initial database name | **`campusly`** |
| Additional → Backups | 7 days (the AWS **Free plan** allows only **1 day**; raise it after moving to the Paid plan, before real data) · encryption on · **deletion protection on** |

Wait for **Available**, then copy the **Endpoint** (`campusly-db.xxxx.eu-central-1.rds.amazonaws.com`).

pgvector is built into RDS Postgres 17; the tutor migration (day 18) runs `CREATE EXTENSION vector` as the master user.

## 8. SSM parameters (CloudShell)

CloudShell → Actions → **Upload file**: [`ssm-put-params.sh`](ssm-put-params.sh) and `~/.campusly/cf-prod-private.pem`. Then, in the same tab as step 7:

```bash
DB_HOST=<rds endpoint> bash ssm-put-params.sh
rm cf-prod-private.pem
```

It writes `/campusly/prod/*`: settings as String, secrets as SecureString (JWT secrets, seed password and `DATABASE_URL` are generated in CloudShell and never shown). Run it again any time: it only adds missing parameters (later runs need no `DB_*` values) and never changes existing ones. To change a setting: `aws ssm put-parameter --name /campusly/prod/NAME --value VALUE --overwrite`, then on the box `bash deploy/env-from-ssm.sh && docker compose -f docker-compose.prod.yml up -d`. Check: Systems Manager → Parameter Store.

## 9. First deploy on the box

After step 6 (code cloned):

```bash
cd ~/campusly/backend
bash deploy/env-from-ssm.sh                                          # SSM → .env.production (chmod 600)
docker compose -f docker-compose.prod.yml --profile tools build      # ~10 min on t4g.small
docker compose -f docker-compose.prod.yml run --rm tools pnpm prisma migrate deploy
docker compose -f docker-compose.prod.yml run --rm -e SEED_ALLOW_RESET=true tools pnpm prisma db seed   # demo data
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps                         # api, batch, caddy, redis: Up
```

The seed **empties every table** first, so it refuses any non-local database unless `SEED_ALLOW_RESET=true` is passed. Pass it only for this demo database.

Health, on the box and from the Mac:

```bash
curl -s http://<ELASTIC_IP>/graphql -H 'content-type: application/json' \
  -H 'apollo-require-preflight: true' -d '{"query":"{ health { status postgres redis migration } }"}'
# {"data":{"health":{"status":"ok","postgres":true,"redis":true,"migration":"2026..."}}}
```

Nightly demo reset: with `DEMO_MODE=true` the batch puts the demo data back at **03:00 Tashkent** (moved to the current week). Check the next morning: `docker compose -f docker-compose.prod.yml logs batch | grep BATCH_DEMO_RESET`. The batch reads the new code only after a rebuild: `docker compose -f docker-compose.prod.yml up -d --build`.

`API_DOMAIN` is the address Caddy serves: `:80` (plain HTTP on the Elastic IP) before the domain worked, `api.campusly.uz` since day 15 — Caddy then gets and renews the Let's Encrypt certificate by itself (HTTP → 308 HTTPS).

## 10. DNS (aHOST DNS manager, name servers `rdns1-3.ahost.uz`)

| Name | Type | Value |
|---|---|---|
| `api` | A | Elastic IP `3.126.181.136` (TTL 300) |
| `media` | CNAME | `d13njm9qjhav5w.cloudfront.net` + the ACM validation CNAME (certificate in **us-east-1**) |
| `@`, `www` | A / CNAME | the Vercel values (frontend) — until then aHOST defaults |

aHOST quirk: write full names with a **trailing dot** (`_xxxx.media.campusly.uz.`), otherwise the panel adds the zone twice.

## 11. Frontend on Vercel

The frontend is not on EC2: Vercel builds `frontend/` from GitHub on every push to `develop` and serves it from its CDN with HTTPS.

Vercel → Add New → Project → import `sanjardev23/campusly` (GitHub sign-in):

| Setting | Value |
|---|---|
| Root Directory | **`frontend`** |
| Framework | Next.js (detected) · build `next build` (default) |
| Production branch | `develop` (Settings → Git) |
| Node.js version | **24.x** (Settings → Build and Deployment) |
| Install / build commands | from [`frontend/vercel.json`](../../frontend/vercel.json): `npx --yes pnpm@12.11.2 install --frozen-lockfile` / `... run build` — leave the dashboard fields empty |
| Environment variables (Production) | `NEXT_PUBLIC_API_URL=https://api.campusly.uz` · `NEXT_PUBLIC_DEMO_MODE=true` |

Why `vercel.json` pins pnpm: Vercel's corepack looks for `packageManager` in the **repo-root** `package.json` (the repo has none; `frontend/package.json` has it), falls back to an old pnpm that cannot read pnpm 12's lockfile and fails on Node 24. Running the exact pnpm through `npx` avoids that, and the commands live in git instead of dashboard settings.

`NEXT_PUBLIC_*` values are baked in at build time: after changing one, **Redeploy**.

Domains (Project → Settings → Domains): add `campusly.uz` and `www.campusly.uz` → redirect `www` to `campusly.uz`. Vercel shows the DNS records; set them in aHOST (trailing dot rule, §10), replacing the aHOST defaults on `@` and `www`. The certificate comes by itself once DNS points to Vercel.

Why it works across two hosts: `campusly.uz` and `api.campusly.uz` are the **same site** (same registrable domain), so the browser sends the `SameSite=Lax` refresh cookie (`Path=/auth`, host `api.campusly.uz` only) on `fetch(..., { credentials: 'include' })`; the API allows only `FRONTEND_URL=https://campusly.uz` in CORS. A `*.vercel.app` URL is not in the API's CORS list, so it cannot talk to the API: test on `https://campusly.uz`.
