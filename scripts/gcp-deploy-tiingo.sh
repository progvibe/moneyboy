#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-}"
if [[ -z "$PROJECT_ID" ]]; then
  PROJECT_ID=$(gcloud config get-value project 2>/dev/null || true)
fi

REGION="${REGION:-}"
if [[ -z "$REGION" ]]; then
  REGION=$(gcloud config get-value run/region 2>/dev/null || true)
fi
if [[ -z "$REGION" ]]; then
  REGION=$(gcloud config get-value compute/region 2>/dev/null || true)
fi
if [[ -z "$REGION" ]]; then
  REGION="us-central1"
fi

if [[ -z "$PROJECT_ID" ]]; then
  echo "PROJECT_ID is not set and no gcloud default project found." >&2
  exit 1
fi

JOB_NAME="moneyboy-tiingo-ingest"
IMAGE="gcr.io/${PROJECT_ID}/moneyboy-tiingo-ingest"

echo "Deploying ${JOB_NAME} to ${PROJECT_ID} (${REGION})..."

gcloud builds submit --tag "$IMAGE" --project "$PROJECT_ID"

if gcloud run jobs describe "$JOB_NAME" --region "$REGION" --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud run jobs update "$JOB_NAME" \
    --image "$IMAGE" \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --set-secrets "TIINGO_API_TOKEN=TIINGO_API_TOKEN:latest,DATABASE_URL=DATABASE_URL:latest" \
    --set-env-vars "RUN_TYPE=news:tiingo,LOOKBACK_MINUTES=180,MAX_ITEMS=500"
else
  gcloud run jobs create "$JOB_NAME" \
    --image "$IMAGE" \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --set-secrets "TIINGO_API_TOKEN=TIINGO_API_TOKEN:latest,DATABASE_URL=DATABASE_URL:latest" \
    --set-env-vars "RUN_TYPE=news:tiingo,LOOKBACK_MINUTES=180,MAX_ITEMS=500"
fi
