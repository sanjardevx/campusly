#!/usr/bin/env bash
# Writes the production parameters to SSM Parameter Store under /campusly/prod/.
# Run it in AWS CloudShell (eu-central-1), signed in as the IAM admin user — not on EC2
# (the EC2 role can only read). Secrets are generated right here and never leave AWS.
#
#   DB_HOST=<rds endpoint> DB_PASSWORD=<rds master password> bash ssm-put-params.sh
#
# Settings (String) are overwritten on every run. Secrets (SecureString) are written only
# when missing, so a second run does not log everybody out (new JWT secrets would).
set -euo pipefail
export AWS_REGION=eu-central-1
P=/campusly/prod

: "${DB_HOST:?set DB_HOST to the RDS endpoint}"
: "${DB_PASSWORD:?set DB_PASSWORD to the RDS master password}"
# The password goes into a URL: hex only (openssl rand -hex 24), no @ / : ? # characters
[[ $DB_PASSWORD =~ ^[A-Za-z0-9]+$ ]] || { echo "DB_PASSWORD: letters and digits only" >&2; exit 1; }
KEY_FILE=${KEY_FILE:-cf-prod-private.pem} # uploaded to CloudShell: Actions → Upload file

setting() { # name value
  aws ssm put-parameter --name "$P/$1" --type String --value "$2" --overwrite >/dev/null
  echo "  $1 = $2"
}
secret() { # name value — skipped when it already exists
  if aws ssm get-parameter --name "$P/$1" >/dev/null 2>&1; then
    echo "  $1 (secret) already set, kept"
  else
    aws ssm put-parameter --name "$P/$1" --type SecureString --value "$2" >/dev/null
    echo "  $1 (secret) created"
  fi
}

echo "Settings:"
setting NODE_ENV production
setting FRONTEND_URL https://campusly.uz
setting DEMO_MODE true
# Until the domain works: plain HTTP on port 80 of the Elastic IP; day 15 → api.campusly.uz
setting API_DOMAIN "${API_DOMAIN:-:80}"
setting AWS_REGION eu-central-1
setting S3_BUCKET campusly-prod-media
setting CLOUDFRONT_DOMAIN d13njm9qjhav5w.cloudfront.net
setting CLOUDFRONT_KEY_PAIR_ID K1EDVKZHKZ3I52

echo "Secrets:"
# RDS forces SSL; the image trusts the RDS certificate authority (Dockerfile)
secret DATABASE_URL "postgresql://campusly_admin:${DB_PASSWORD}@${DB_HOST}:5432/campusly?schema=public&sslmode=require"
secret JWT_ACCESS_SECRET "$(openssl rand -base64 48)"
secret JWT_REFRESH_SECRET "$(openssl rand -base64 48)"
secret SEED_PASSWORD "$(openssl rand -base64 18)"
if [[ -f $KEY_FILE ]]; then
  # file:// — the CLI reads the file itself (a value starting with "-----" looks like an option)
  secret CLOUDFRONT_PRIVATE_KEY "file://$KEY_FILE"
  echo "  → delete the key file now: rm $KEY_FILE"
else
  echo "  CLOUDFRONT_PRIVATE_KEY: $KEY_FILE not found — upload it and run again"
fi

echo
echo "Done. List: aws ssm get-parameters-by-path --path $P --query 'Parameters[].Name'"
