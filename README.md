# CyberGuard Live

## Local development

The default local URLs are:

- Frontend: `http://localhost:5174`
- Backend: `http://localhost:8000`

1. Copy `backend/.env.example` to `backend/.env` and set a unique random
   `JWT_SECRET`, MongoDB connection, and Gmail SMTP values. For Gmail, use a
   Google App Password (not the normal
   account password); spaces in its displayed groups are handled automatically.
   Email verification links use the registration
   browser's trusted frontend address when available. `BACKEND_PUBLIC_URL` and
   `FRONTEND_URL` provide fallbacks for environments without that browser
   address.
2. In a terminal, start the backend:

   ```powershell
   cd backend
   python -m pip install -r requirements.txt
   python run.py
   ```

3. In another terminal, create `frontend/.env` by copying
   `frontend/.env.example`, then start the frontend:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

   Open `http://localhost:5174`.

Environment files are local to each checkout and should not contain committed
credentials. No application source changes are needed to use different local
settings.

Deleting an account from **My Profile** permanently removes that user's
registered APIs, alerts, monitoring activity, pending registrations, and
account record.
If a user is removed directly from MongoDB, MongoDB does not cascade deletes
to other collections; the backend removes orphaned APIs, alerts, and activity
on startup and during its one-minute cleanup check.

## Deploy publicly with GitHub Pages and Render

GitHub Pages hosts the frontend. Render runs the Python API, and MongoDB Atlas
stores application data. Email verification links use the public Pages URL and
open correctly on phones.

1. Create a **new public GitHub repository** and push this project to its
   `main` branch. The root `.gitignore` excludes environment files, local
   virtual environments, generated frontend files, and `backend/data/users.json`.
   Do not force-add these files or commit credentials.
2. Create a MongoDB Atlas database and allow network access from Render. Copy
   its connection string; keep the database password private.
3. In Render, create a Blueprint from the GitHub repository. The included
   `render.yaml` creates the backend service. Set its prompted environment
   values:
   - `MONGO_URI`: the Atlas connection string.
   - `SMTP_USERNAME`, `SMTP_PASSWORD`, and `SMTP_FROM_EMAIL`: Gmail account
     and App Password values for verification email.
   The blueprint configures `FRONTEND_URL`, `CORS_ORIGINS`, and
   `PUBLIC_FRONTEND_URL` for this repository's GitHub Pages site. If the
   Render service already exists, sync the Blueprint so these values are
   applied to it.
4. Wait for the Render service to deploy and verify
   `https://YOUR_RENDER_SERVICE.onrender.com/health` returns `{"status":"ok"}`.
5. In the GitHub repository, add the Actions variable
   `VITE_BACKEND_URL` with value `https://YOUR_RENDER_SERVICE.onrender.com`.
   Under **Settings → Pages**, set the build and deployment source to
   **GitHub Actions**. The workflow deploys the frontend on the next push to
   `main` or `master` (or when manually run from **Actions**).
6. Register using the public site URL and open the verification email on any
   device with internet access. Its public Render link redirects to the
   GitHub Pages verification screen; select **Verify Email** to activate the
   account. This requires the Render API to be reachable; the free service may
   take time to wake after inactivity.

Render sets `RENDER_EXTERNAL_URL` for the web service automatically; the API
uses it as the verification-email link host unless `BACKEND_PUBLIC_URL` is
explicitly configured.

Render's free service may sleep when idle, so the first API request or email
send after inactivity can take longer. Keep MongoDB and SMTP credentials only
in Render's environment settings, never in GitHub variables or source files.

### Backend outage email alerts

The app emails account owners when a monitored API goes offline while the
backend is running. To also detect when the CyberGuard backend itself is
unavailable, `.github/workflows/monitor-backend.yml` checks its health endpoint
on a five-minute schedule and sends email only when an outage starts or the
backend recovers. GitHub scheduled workflows are best-effort and may be
delayed; they are not a real-time or guaranteed monitoring service.

In **Settings → Secrets and variables → Actions**, configure these secrets:

- `ALERT_EMAIL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`,
  `SMTP_PASSWORD`, and `SMTP_FROM_EMAIL`.
- Optional secrets `SMTP_USE_TLS` and `SMTP_USE_SSL` (default `true` and
  `false`, respectively).

Use an SMTP App Password where required. The workflow opens one GitHub issue
while the backend is down and closes it after recovery, so repeated checks do
not send duplicate outage emails. In **Settings → Actions → General → Workflow
permissions**, allow read and write permissions so the workflow can open and
close the outage issue.
The workflow checks `https://cyberguard-live-api.onrender.com/health`.

## Verify email locally on the same computer

Set `PUBLIC_FRONTEND_URL=http://localhost:5174` in `backend/.env`. Start the
frontend and backend, register at `http://localhost:5174`, then open the
verification email on the same computer. The link redirects to the local
frontend and completes when you select **Verify Email**.

Restart the backend after changing `.env`, then register again to get a fresh
email. Existing verification emails keep their original link. A `localhost`
link works only on the computer running the app; it will not work when opened
on a phone. For phone verification, use a network-reachable frontend address
instead.

For an internet-accessible deployment, set `FRONTEND_URL` to the public
frontend origin and configure its reverse proxy to forward `/auth` to the
backend. `BACKEND_PUBLIC_URL` remains the fallback verification host when a
trusted browser origin is not available. Opening the verification link only
displays a confirmation page; verification completes after the user selects
**Verify Email**, so link-preview scanners do not activate accounts.
