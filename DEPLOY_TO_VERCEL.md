# Deploying to Vercel

This repository is pre-configured for one-click deployment to **Vercel** with full support for the **Vite SPA dashboard** and **Vercel Serverless Functions** (`/api/*`).

---

## Method 1: Deploy via GitHub & Vercel Dashboard (Recommended)

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "Configure Vercel deployment with edge vision inference"
   git push origin main
   ```

2. **Import into Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new).
   - Sign in and select your GitHub repository.
   - Vercel will automatically detect:
     - **Framework Preset:** Vite
     - **Build Command:** `vite build` (or `npm run build`)
     - **Output Directory:** `dist`
   - Click **Deploy**.

3. **Live Deployment**:
   Your app will be live on a `*.vercel.app` URL with automatic SSL and global CDN distribution!

---

## Method 2: Deploy via Vercel CLI (Direct Terminal)

If you prefer deploying straight from your terminal:

1. In the project root, run:
   ```bash
   npx vercel
   ```

2. Follow the terminal prompts:
   - *Set up and deploy?* **Y**
   - *Which scope?* (Select your Vercel account)
   - *Link to existing project?* **N**
   - *What's your project's name?* `fleet-management-dashboard`
   - *In which directory is your code located?* `./`
   - *Want to modify settings?* **N** (Vercel uses `vercel.json` automatically)

3. For production deployment:
   ```bash
   npx vercel --prod
   ```

---

## Pre-configured Files in this Project

- **`vercel.json`**:
  - Handles client-side SPA routing rewrites to `/index.html`.
  - Routes `/api/*` requests to Vercel Serverless Functions.
- **`api/inference/frame.ts`**:
  - Serverless vision inference endpoint for driver fatigue and facial landmark tracking in the cloud.
- **`api/model/status.ts` & `api/model/toggle.ts`**:
  - Model telemetry, status polling, and remote ON/OFF toggle.
- **`src/services/visionInference.ts`**:
  - Local edge and fallback vision engine for zero-latency tracking.
