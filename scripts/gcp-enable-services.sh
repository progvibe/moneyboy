#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-}"
if [[ -z "$PROJECT_ID" ]]; then
  PROJECT_ID=$(gcloud config get-value project 2>/dev/null || true)
fi

if [[ -z "$PROJECT_ID" ]]; then
  echo "PROJECT_ID is not set and no gcloud default project found." >&2
  exit 1
fi

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  cloudscheduler.googleapis.com \
  secretmanager.googleapis.com \
  --project "$PROJECT_ID"
