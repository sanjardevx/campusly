#!/usr/bin/env bash
# Writes the production parameters to SSM Parameter Store under /campusly/prod/.
# Run it in AWS CloudShell (eu-central-1), signed in as the IAM admin user — not on EC2
# (the EC2 role can only read). Secrets are generated right here and never leave AWS.
#
#   DB_HOST=<rds endpoint> DB_PASSWORD=<rds master password> bash ssm-put-params.sh   # first run
#   bash ssm-put-params.sh                                                             # later runs
#
# Every parameter is written only when it is missing, so a second run changes nothing that
# exists (new JWT secrets would log everybody out; a setting changed by hand stays).
# Change one setting:  aws ssm put-parameter --name /campusly/prod/NAME --value VALUE --overwrite
# then on the box:     bash deploy/env-from-ssm.sh && docker compose -f docker-compose.prod.yml up -d
set -euo pipefail
export AWS_REGION=eu-central-1
P=/campusly/prod
KEY_FILE=${KEY_FILE:-cf-prod-private.pem} # uploaded to CloudShell: Actions → Upload file

exists() { aws ssm get-parameter --name "$P/$1" >/dev/null 2>&1; }

# The DB values are needed only to create DATABASE_URL (first run)
if ! exists DATABASE_URL; then
  : "${DB_HOST:?set DB_HOST to the RDS endpoint}"
  : "${DB_PASSWORD:?set DB_PASSWORD to the RDS master password}"
  # The password goes into a URL: hex only (openssl rand -hex 24), no @ / : ? # characters
  [[ $DB_PASSWORD =~ ^[A-Za-z0-9]+$ ]] || { echo "DB_PASSWORD: letters and digits only" >&2; exit 1; }
fi

put() { # type name value — skipped when it already exists
  if exists "$2"; then
    echo "  $2 already set, kept"
  else
    aws ssm put-parameter --name "$P/$2" --type "$1" --value "$3" >/dev/null
    echo "  $2 created"
  fi
}
setting() { put String "$@"; }
secret() { put SecureString "$@"; }

echo "Settings:"
setting NODE_ENV production
setting FRONTEND_URL https://campusly.uz
setting DEMO_MODE true
# Caddy's site address (":80" = plain HTTP on the Elastic IP, before the domain worked)
setting API_DOMAIN api.campusly.uz
setting AWS_REGION eu-central-1
setting S3_BUCKET campusly-prod-media
setting CLOUDFRONT_DOMAIN media.campusly.uz # alias of d13njm9qjhav5w.cloudfront.net (ACM cert in us-east-1)
setting CLOUDFRONT_KEY_PAIR_ID K1EDVKZHKZ3I52
# AI tutor: off until Bedrock allows Claude Haiku 5.5 on the account, then bedrock (README §14)
setting TUTOR_PROVIDER off

echo "Secrets:"
# RDS forces SSL; the image trusts the RDS certificate authority (Dockerfile)
secret DATABASE_URL "postgresql://campusly_admin:${DB_PASSWORD:-}@${DB_HOST:-}:5432/campusly?schema=public&sslmode=require"
secret JWT_ACCESS_SECRET "$(openssl rand -base64 48)"
secret JWT_REFRESH_SECRET "$(openssl rand -base64 48)"
secret SEED_PASSWORD "$(openssl rand -base64 18)"
if exists CLOUDFRONT_PRIVATE_KEY; then
  echo "  CLOUDFRONT_PRIVATE_KEY already set, kept"
elif [[ -f $KEY_FILE ]]; then
  # file:// — the CLI reads the file itself (a value starting with "-----" looks like an option)
  secret CLOUDFRONT_PRIVATE_KEY "file://$KEY_FILE"
  echo "  → delete the key file now: rm $KEY_FILE"
else
  echo "  CLOUDFRONT_PRIVATE_KEY: $KEY_FILE not found — upload it and run again"
fi

echo
echo "Done. List: aws ssm get-parameters-by-path --path $P --query 'Parameters[].Name'"
