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
SCHEDULER_JOB_NAME="moneyboy-tiingo-ingest-schedule"

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
SCHEDULER_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

URI="https://${REGION}-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${PROJECT_ID}/jobs/${JOB_NAME}:run"

# Ensure scheduler SA can invoke the job
if ! gcloud run jobs get-iam-policy "$JOB_NAME" --region "$REGION" --project "$PROJECT_ID" \
  --format="json" | grep -q "\"serviceAccount:${SCHEDULER_SA}\""; then
  gcloud run jobs add-iam-policy-binding "$JOB_NAME" \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --member "serviceAccount:${SCHEDULER_SA}" \
    --role "roles/run.invoker"
fi

if gcloud scheduler jobs describe "$SCHEDULER_JOB_NAME" --location "$REGION" --project "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud scheduler jobs update http "$SCHEDULER_JOB_NAME" \
    --location "$REGION" \
    --project "$PROJECT_ID" \
    --schedule "*/30 * * * *" \
    --time-zone "America/Detroit" \
    --http-method POST \
    --uri "$URI" \
    --oauth-service-account-email "$SCHEDULER_SA" \
    --oauth-token-scope "https://www.googleapis.com/auth/cloud-platform"
else
  gcloud scheduler jobs create http "$SCHEDULER_JOB_NAME" \
    --location "$REGION" \
    --project "$PROJECT_ID" \
    --schedule "*/30 * * * *" \
    --time-zone "America/Detroit" \
    --http-method POST \
    --uri "$URI" \
    --oauth-service-account-email "$SCHEDULER_SA" \
    --oauth-token-scope "https://www.googleapis.com/auth/cloud-platform"
fi
