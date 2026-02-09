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

gcloud run jobs execute moneyboy-tiingo-ingest \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --wait
