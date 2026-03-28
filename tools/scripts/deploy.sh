#!/bin/bash
# scripts/deploy.sh
# Usage: ./scripts/deploy.sh [environment] [tag]

ENV=$1
TAG=$2

if [[ -z "$ENV" || -z "$TAG" ]]; then
  echo "Usage: ./scripts/deploy.sh [staging|production] [tag]"
  exit 1
fi

PROJECT_ID=$(gcloud config get-value project)
REGION="asia-south1"

# Service configuration mapping
# format: "service-name:memory:cpu:min-instances:max-instances:ingress"
SERVICES=(
  "api-gateway:512Mi:1:1:20:all"
  "auth-service:512Mi:1:0:5:internal"
  "catalog-service:512Mi:1:0:5:internal"
  "order-service:512Mi:1:0:5:internal"
  "payment-service:512Mi:1:0:5:internal"
  "notification-service:512Mi:1:0:5:internal"
  "collection-service:256Mi:0.5:0:3:internal"
  "pincode-service:256Mi:0.5:0:3:internal"
  "return-service:256Mi:0.5:0:3:internal"
  "search-service:512Mi:1:0:3:internal"
  "inventory-service:256Mi:0.5:0:3:internal"
  "admin-service:256Mi:0.5:0:2:internal"
  "support-service:256Mi:0.5:0:2:internal"
  "frontend:1Gi:1:1:10:all"
)

for ENTRY in "${SERVICES[@]}"; do
  IFS=":" read -r SERVICE MEM CPU MIN MAX INGRESS <<< "$ENTRY"
  
  IMAGE="asia-south1-docker.pkg.dev/$PROJECT_ID/fabricspeaks/$SERVICE:$TAG"
  
  echo "--------------------------------------------------------"
  echo "Deploying $SERVICE to $ENV (tag: $TAG)..."
  echo "--------------------------------------------------------"
  
  # Basic deploy command
  DEPLOY_CMD="gcloud run deploy $SERVICE \
    --image=$IMAGE \
    --region=$REGION \
    --platform=managed \
    --service-account=fs-cloudrun-sa@$PROJECT_ID.iam.gserviceaccount.com \
    --memory=$MEM \
    --cpu=$CPU \
    --min-instances=$MIN \
    --max-instances=$MAX \
    --ingress=$INGRESS \
    --timeout=30 \
    --concurrency=80 \
    --set-env-vars=APP_ENV=$ENV \
    --set-secrets=DATABASE_URL=DATABASE_URL:latest,REDIS_URL=REDIS_URL:latest,APP_JWT_SECRET=APP_JWT_SECRET:latest"

  # Special handling for DB-dependent services (Cloud SQL proxy is optional for Supabase, 
  # but keeping the hook if we switch back to Cloud SQL)
  if [[ "$SERVICE" != "frontend" && "$SERVICE" != "pincode-service" && "$ENV" == "production" ]]; then
     # For Supabase, we don't strictly need --add-cloudsql-instances, 
     # but we keep it commented or as a placeholder if using GCP Cloud SQL.
     # DEPLOY_CMD="$DEPLOY_CMD --add-cloudsql-instances=$PROJECT_ID:$REGION:fs-postgres-prod"
     echo "Configuring $SERVICE with Supabase/Upstash secrets..."
  fi

  # Ingress specific flags
  if [[ "$INGRESS" == "all" ]]; then
    DEPLOY_CMD="$DEPLOY_CMD --allow-unauthenticated"
  else
    DEPLOY_CMD="$DEPLOY_CMD --no-allow-unauthenticated"
  fi

  # Execute deployment
  eval $DEPLOY_CMD
done
