#!/bin/bash
# scripts/setup-production-secrets.sh
# Purpose: Interactively setup GCP Secret Manager for the Fabric Speaks environment.

PROJECT_ID=$(gcloud config get-value project)

if [ -z "$PROJECT_ID" ]; then
  echo "Error: No GCP project configured. Run 'gcloud config set project [PROJECT_ID]'"
  exit 1
fi

echo "Setting up secrets for project: $PROJECT_ID"

create_secret() {
  NAME=$1
  VALUE=$2
  
  # Check if secret exists
  if gcloud secrets describe $NAME >/dev/null 2>&1; then
    echo "Updating secret: $NAME"
    echo -n "$VALUE" | gcloud secrets versions add $NAME --data-file=-
  else
    echo "Creating secret: $NAME"
    gcloud secrets create $NAME --replication-policy="automatic"
    echo -n "$VALUE" | gcloud secrets versions add $NAME --data-file=-
  fi
}

read -p "Enter Supabase DATABASE_URL (port 6543): " DB_URL
create_secret "DATABASE_URL" "$DB_URL"

read -p "Enter Upstash REDIS_URL (rediss://): " REDIS_URL
create_secret "REDIS_URL" "$REDIS_URL"

read -p "Enter APP_JWT_SECRET: " JWT_SEC
create_secret "APP_JWT_SECRET" "$JWT_SEC"

echo "--------------------------------------------------------"
echo "✅ Secrets successfully configured in GCP Secret Manager!"
echo "--------------------------------------------------------"
