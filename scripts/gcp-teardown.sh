#!/usr/bin/env bash
set -euo pipefail

GCP_PROJECT_ID="offroad-agentai"
CLOUD_RUN_REGION="us-central1"
ARTIFACT_REPO="offroad-backend"
CLOUD_RUN_SERVICE="offroad-backend"
CLOUD_RUN_SA_NAME="offroad-cloud-run"
CLOUD_RUN_SA="${CLOUD_RUN_SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
WIF_POOL="github-actions"
WIF_PROVIDER="github-actions-provider"

echo "==> Project : $GCP_PROJECT_ID"
echo "==> Region  : $CLOUD_RUN_REGION"
echo ""
gcloud config set project "$GCP_PROJECT_ID"

# 1. Cloud Run service
echo "==> [1/7] Deleting Cloud Run service: $CLOUD_RUN_SERVICE"
gcloud run services delete "$CLOUD_RUN_SERVICE" \
  --region="$CLOUD_RUN_REGION" \
  --project="$GCP_PROJECT_ID" \
  --quiet 2>/dev/null || echo "    Not found — skipping."

# 2. Artifact Registry (all images inside are removed too)
echo "==> [2/7] Deleting Artifact Registry repository: $ARTIFACT_REPO"
gcloud artifacts repositories delete "$ARTIFACT_REPO" \
  --location="$CLOUD_RUN_REGION" \
  --project="$GCP_PROJECT_ID" \
  --quiet 2>/dev/null || echo "    Not found — skipping."

# 3. Secret Manager secrets
echo "==> [3/7] Deleting secrets..."
for secret in TAVILY_API_KEY MISTRAL_API_KEY JWT_SECRET; do
  gcloud secrets delete "$secret" \
    --project="$GCP_PROJECT_ID" \
    --quiet 2>/dev/null || echo "    $secret not found — skipping."
done

# 4. Workload Identity Federation provider (must go before pool)
echo "==> [4/7] Deleting WIF provider: $WIF_PROVIDER"
gcloud iam workload-identity-pools providers delete "$WIF_PROVIDER" \
  --workload-identity-pool="$WIF_POOL" \
  --location=global \
  --project="$GCP_PROJECT_ID" \
  --quiet 2>/dev/null || echo "    Not found — skipping."

echo "==> [5/7] Deleting WIF pool: $WIF_POOL"
gcloud iam workload-identity-pools delete "$WIF_POOL" \
  --location=global \
  --project="$GCP_PROJECT_ID" \
  --quiet 2>/dev/null || echo "    Not found — skipping."

# 5. Service account
echo "==> [6/7] Deleting service account: $CLOUD_RUN_SA"
gcloud iam service-accounts delete "$CLOUD_RUN_SA" \
  --project="$GCP_PROJECT_ID" \
  --quiet 2>/dev/null || echo "    Not found — skipping."

# 6. Firestore default database (all data inside is permanently deleted)
echo "==> [7/7] Deleting Firestore default database..."
gcloud firestore databases delete \
  --database="(default)" \
  --project="$GCP_PROJECT_ID" \
  --quiet 2>/dev/null || echo "    Not found or already deleted — skipping."

echo ""
echo "==> All resources destroyed."
echo ""
echo "The GCP/Firebase project 'offroad-agentai' still exists (billing stopped)."
echo "To fully delete the project itself run:"
echo "    gcloud projects delete offroad-agentai"
