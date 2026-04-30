# Google Cloud Run Deployment Guide — MemoryWeaver

This guide covers deploying MemoryWeaver to Google Cloud Run using a Docker container.

---

## Prerequisites

- Google Cloud SDK (`gcloud`) installed and authenticated
- Docker installed locally (or use Cloud Build)
- Your GCP project configured (see docs/setup-local.md)
- All APIs enabled in GCP

---

## Step 1 — Build the Docker Image

### Option A — Cloud Build (recommended, no local Docker needed)

```bash
cd memory-weaver

# Build and push using Cloud Build
gcloud builds submit \
  --tag gcr.io/YOUR_PROJECT_ID/memory-weaver \
  --project YOUR_PROJECT_ID
```

### Option B — Local Docker Build + Push

```bash
# Build
docker build -t gcr.io/YOUR_PROJECT_ID/memory-weaver .

# Authenticate Docker with GCR
gcloud auth configure-docker

# Push
docker push gcr.io/YOUR_PROJECT_ID/memory-weaver
```

---

## Step 2 — Create Cloud Run Secrets

Store sensitive values in Secret Manager (do NOT use --set-env-vars for secrets):

```bash
# Create secrets
echo -n "YOUR_SESSION_SECRET" | gcloud secrets create SESSION_SECRET --data-file=-
echo -n "YOUR_GOOGLE_CLIENT_ID" | gcloud secrets create GOOGLE_CLIENT_ID --data-file=-
echo -n "YOUR_GOOGLE_CLIENT_SECRET" | gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create GEMINI_API_KEY --data-file=-

# Grant Cloud Run service account access to secrets
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Step 3 — Deploy to Cloud Run

```bash
# Get your deployed URL first (you'll need it for OAuth callback setup)
# Then deploy:

gcloud run deploy memory-weaver \
  --image gcr.io/YOUR_PROJECT_ID/memory-weaver \
  --platform managed \
  --region us-central1 \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,GCP_PROJECT_ID=YOUR_PROJECT_ID,GCS_BUCKET_NAME=YOUR_BUCKET,CLOUD_LOG_NAME=memory-weaver" \
  --set-secrets "SESSION_SECRET=SESSION_SECRET:latest,GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID:latest,GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest" \
  --project YOUR_PROJECT_ID
```

The deployment outputs your Cloud Run URL, e.g.:
`https://memory-weaver-abc123-uc.a.run.app`

---

## Step 4 — Update OAuth Credentials

1. Go to **GCP Console → APIs & Services → Credentials**
2. Edit your OAuth 2.0 Client ID
3. Add to **Authorized redirect URIs**:
   `https://memory-weaver-abc123-uc.a.run.app/auth/callback`
4. Add to **Authorized JavaScript origins**:
   `https://memory-weaver-abc123-uc.a.run.app`
5. Save

---

## Step 5 — Update GOOGLE_CALLBACK_URL and FRONTEND_URL

```bash
gcloud run services update memory-weaver \
  --region us-central1 \
  --set-env-vars \
    "GOOGLE_CALLBACK_URL=https://memory-weaver-abc123-uc.a.run.app/auth/callback,FRONTEND_URL=https://memory-weaver-abc123-uc.a.run.app"
```

---

## Step 6 — Update GCS CORS for Production

```bash
cat > cors-production.json << 'EOF'
[
  {
    "origin": ["https://memory-weaver-abc123-uc.a.run.app"],
    "method": ["GET", "PUT", "POST"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

gcloud storage buckets update gs://YOUR_BUCKET_NAME --cors-file=cors-production.json
```

---

## Step 7 — Grant Cloud Run SA Permissions

The default Cloud Run service account needs Firestore and Storage access:

```bash
PROJECT_SA="YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:$PROJECT_SA" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:$PROJECT_SA" \
  --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:$PROJECT_SA" \
  --role="roles/logging.logWriter"
```

---

## Step 8 — Verify Deployment

```bash
# Check service status
gcloud run services describe memory-weaver --region us-central1

# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=memory-weaver" \
  --limit 50 \
  --format json
```

Open your Cloud Run URL in a browser. The login page should appear.

---

## Custom Domain (Optional)

```bash
# Map a custom domain
gcloud run domain-mappings create \
  --service memory-weaver \
  --domain memoryweaver.yourdomain.com \
  --region us-central1
```

Update DNS with the provided records and wait for propagation (~24h).

---

## Continuous Deployment (Optional)

Connect your GitHub repository to Cloud Build for automatic deployments:

1. **Cloud Build → Triggers → Create Trigger**
2. Connect to GitHub repository
3. Event: Push to `main` branch
4. Build configuration: `cloudbuild.yaml` (create this)

`cloudbuild.yaml`:
```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/memory-weaver', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/memory-weaver']
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'memory-weaver'
      - '--image=gcr.io/$PROJECT_ID/memory-weaver'
      - '--region=us-central1'
      - '--platform=managed'
images:
  - 'gcr.io/$PROJECT_ID/memory-weaver'
```

---

## Cost Estimate (Free Tier)

| Service | Free Tier | Notes |
|---|---|---|
| Cloud Run | 2M requests/month | More than enough for class demo |
| Firestore | 1 GB storage, 50K reads/day | Free for this project |
| Cloud Storage | 5 GB | Free for audio files |
| Gemini API | via AI Studio | Check current quota |
| Cloud Logging | 50 GB/month | Free |
