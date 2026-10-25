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
5. Note the distribution domain `dxxxx.cloudfront.net` (`CLOUDFRONT_DOMAIN`). The `media.campusly.uz` alias comes on day 15.

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

Next: RDS + SSM → `.env.production`, `prisma migrate deploy`, seed (section 7, day 14).
