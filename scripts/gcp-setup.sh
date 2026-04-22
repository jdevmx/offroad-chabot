#!/usr/bin/env bash
set -euo pipefail

# One-time GCP setup for OffRoad Chabot deployment.
# Run this once before the first CI/CD deploy.
#
# Prerequisites:
#   - gcloud CLI authenticated: gcloud auth login
#   - gh CLI authenticated with jdevmx account: gh auth login
#
# Usage (from repo root):
#   bash scripts/gcp-setup.sh
#
# Override any default before running if needed:
#   CLOUD_RUN_REGION=europe-west1 bash scripts/gcp-setup.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Source backend/.env ────────────────────────────────────────────────────────
ENV_FILE="$REPO_ROOT/backend/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# ── Defaults (override via env before running) ─────────────────────────────────
GITHUB_REPO="${GITHUB_REPO:-jdevmx/offroad-chabot}"
GCP_PROJECT_ID="${GCP_PROJECT_ID:-${FIREBASE_PROJECT_ID}}"
CLOUD_RUN_REGION="${CLOUD_RUN_REGION:-us-central1}"
CORS_ORIGIN="${CORS_ORIGIN:-https://${GCP_PROJECT_ID}.web.app}"

# ── Validate ───────────────────────────────────────────────────────────────────
required_vars=(GITHUB_REPO GCP_PROJECT_ID CLOUD_RUN_REGION CORS_ORIGIN TAVILY_API_KEY MISTRAL_API_KEY)
for var in "${required_vars[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "ERROR: \$$var is not set." >&2
    exit 1
  fi
done

ARTIFACT_REPO="offroad-backend"
CLOUD_RUN_SA_NAME="offroad-cloud-run"
CLOUD_RUN_SA="${CLOUD_RUN_SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
WIF_POOL="github-actions"
WIF_PROVIDER="github-actions-provider"
PROJECT_NUMBER=$(gcloud projects describe "$GCP_PROJECT_ID" --format="value(projectNumber)")
WIF_POOL_NAME="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WIF_POOL}"
WIF_PROVIDER_NAME="${WIF_POOL_NAME}/providers/${WIF_PROVIDER}"

echo "==> Project : $GCP_PROJECT_ID"
echo "==> Region  : $CLOUD_RUN_REGION"
echo "==> Repo    : $GITHUB_REPO"
echo "==> CORS    : $CORS_ORIGIN"
echo ""
gcloud config set project "$GCP_PROJECT_ID"

# ── Enable required APIs ───────────────────────────────────────────────────────
echo "==> Enabling APIs..."
gcloud services enable \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  --project "$GCP_PROJECT_ID"

# ── Artifact Registry ──────────────────────────────────────────────────────────
echo "==> Creating Artifact Registry repository: $ARTIFACT_REPO"
if ! gcloud artifacts repositories describe "$ARTIFACT_REPO" \
     --location="$CLOUD_RUN_REGION" --project="$GCP_PROJECT_ID" &>/dev/null; then
  gcloud artifacts repositories create "$ARTIFACT_REPO" \
    --repository-format=docker \
    --location="$CLOUD_RUN_REGION" \
    --project="$GCP_PROJECT_ID"
else
  echo "    Already exists — skipping."
fi

# ── Cloud Run service account ──────────────────────────────────────────────────
echo "==> Creating Cloud Run service account: $CLOUD_RUN_SA_NAME"
if ! gcloud iam service-accounts describe "$CLOUD_RUN_SA" --project="$GCP_PROJECT_ID" &>/dev/null; then
  gcloud iam service-accounts create "$CLOUD_RUN_SA_NAME" \
    --display-name="OffRoad Chabot Cloud Run SA" \
    --project="$GCP_PROJECT_ID"
else
  echo "    Already exists — skipping."
fi

echo "==> Granting roles to Cloud Run service account..."
for role in roles/datastore.user roles/firebaseauth.admin; do
  gcloud projects add-iam-policy-binding "$GCP_PROJECT_ID" \
    --member="serviceAccount:${CLOUD_RUN_SA}" \
    --role="$role" \
    --condition=None \
    --quiet
done

# ── Secret Manager ─────────────────────────────────────────────────────────────
JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 48)}"

echo "==> Creating secrets in Secret Manager..."
for secret_name in TAVILY_API_KEY MISTRAL_API_KEY JWT_SECRET; do
  secret_value="${!secret_name}"
  if ! gcloud secrets describe "$secret_name" --project="$GCP_PROJECT_ID" &>/dev/null; then
    echo -n "$secret_value" | gcloud secrets create "$secret_name" \
      --data-file=- \
      --project="$GCP_PROJECT_ID"
  else
    echo "    $secret_name already exists — adding new version."
    echo -n "$secret_value" | gcloud secrets versions add "$secret_name" \
      --data-file=- \
      --project="$GCP_PROJECT_ID"
  fi

  gcloud secrets add-iam-policy-binding "$secret_name" \
    --member="serviceAccount:${CLOUD_RUN_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --project="$GCP_PROJECT_ID" \
    --quiet
done

# ── Workload Identity Federation ───────────────────────────────────────────────
echo "==> Setting up Workload Identity Federation pool: $WIF_POOL"
if ! gcloud iam workload-identity-pools describe "$WIF_POOL" \
     --location=global --project="$GCP_PROJECT_ID" &>/dev/null; then
  gcloud iam workload-identity-pools create "$WIF_POOL" \
    --location=global \
    --display-name="GitHub Actions pool" \
    --project="$GCP_PROJECT_ID"
else
  echo "    Pool already exists — skipping."
fi

echo "==> Setting up WIF provider: $WIF_PROVIDER"
if ! gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER" \
     --workload-identity-pool="$WIF_POOL" \
     --location=global --project="$GCP_PROJECT_ID" &>/dev/null; then
  gcloud iam workload-identity-pools providers create-oidc "$WIF_PROVIDER" \
    --workload-identity-pool="$WIF_POOL" \
    --location=global \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="assertion.repository=='${GITHUB_REPO}'" \
    --project="$GCP_PROJECT_ID"
else
  echo "    Provider already exists — skipping."
fi

echo "==> Granting WIF impersonation on Cloud Run SA..."
gcloud iam service-accounts add-iam-policy-binding "$CLOUD_RUN_SA" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WIF_POOL_NAME}/attribute.repository/${GITHUB_REPO}" \
  --project="$GCP_PROJECT_ID" \
  --quiet

# ── GitHub Actions secrets ─────────────────────────────────────────────────────
echo "==> Setting GitHub Actions secrets for $GITHUB_REPO..."

PROJECT_NUMBER=$(gcloud projects describe "$GCP_PROJECT_ID" --format="value(projectNumber)")
WIF_PROVIDER_FULL="${WIF_PROVIDER_NAME/projects\/${GCP_PROJECT_ID}/projects\/${PROJECT_NUMBER}}"

gh secret set WIF_PROVIDER        --body "$WIF_PROVIDER_FULL"    --repo "$GITHUB_REPO"
gh secret set WIF_SERVICE_ACCOUNT --body "$CLOUD_RUN_SA"         --repo "$GITHUB_REPO"
gh secret set GCP_PROJECT_ID      --body "$GCP_PROJECT_ID"       --repo "$GITHUB_REPO"
gh secret set CLOUD_RUN_REGION    --body "$CLOUD_RUN_REGION"     --repo "$GITHUB_REPO"
gh secret set CORS_ORIGIN         --body "$CORS_ORIGIN"          --repo "$GITHUB_REPO"

echo ""
echo "==> Setup complete."
echo ""
echo "Remaining manual steps:"
echo ""
echo "  1. Set Firebase client config as GitHub Actions variables"
echo "     (find these in Firebase console → Project settings → Your apps):"
echo ""
echo "     gh variable set NEXT_PUBLIC_FIREBASE_API_KEY     --body '...' --repo $GITHUB_REPO"
echo "     gh variable set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN --body '...' --repo $GITHUB_REPO"
echo "     gh variable set NEXT_PUBLIC_FIREBASE_PROJECT_ID  --body '$GCP_PROJECT_ID' --repo $GITHUB_REPO"
echo "     gh variable set NEXT_PUBLIC_FIREBASE_APP_ID      --body '...' --repo $GITHUB_REPO"
echo ""
echo "  2. Push to main — backend deploys first."
echo ""
echo "  3. After backend deploy, get the Cloud Run URL and set it:"
echo "     URL=\$(gcloud run services describe offroad-backend --region $CLOUD_RUN_REGION --format='value(status.url)')"
echo "     gh secret set NEXT_PUBLIC_API_URL --body \"\$URL\" --repo $GITHUB_REPO"
echo ""
echo "  4. Re-trigger the frontend workflow:"
echo "     gh workflow run frontend-ci-cd.yml --repo $GITHUB_REPO"
