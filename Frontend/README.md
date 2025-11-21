RENTAL MANAGEMENT APP
For demo purposes, use these emails
admin@example.com (Admin)
landlord@example.com (Landlord)
tenant@example.com (Tenant)
\n+## Frontend Deployment to cPanel
The React (Vite) frontend in `Frontend/` is automatically built and deployed to the subdomain `dangopay.dangotechconcepts.com` via FTP using a GitHub Actions workflow (`.github/workflows/deploy-frontend.yml`).
\n+### Triggering
- Push to `main` that touches files under `Frontend/**`.
- Manual run from the Actions tab ("Run workflow").
\n+### Required GitHub Secrets
Add these repository secrets (Settings > Secrets and variables > Actions):
- `CPANEL_FTP_HOST`: Your FTP host (e.g. `ftp.dangotechconcepts.com` or main domain). Do NOT include protocol.
- `CPANEL_FTP_USERNAME`: FTP user with access to the subdomain directory.
- `CPANEL_FTP_PASSWORD`: Password for that FTP user.
- `CPANEL_FTP_SERVERDIR`: Remote path to deploy into, e.g. `dangopay.dangotechconcepts.com/` (or full path if required by host). You can confirm by logging in via an FTP client and noting the folder containing `index.html` and `build/`.
\n+### What the Workflow Does
1. Checks out the repo.
2. Installs dependencies with Bun (`bun install`).
3. Builds the app (`bun run build`) producing output in `Frontend/build` (configured in `vite.config.ts`).
4. Deploys the contents of `Frontend/build` to the FTP server directory.
\n+### Preserving Uploads
The remote `uploads/` directory is excluded (`uploads/**`) so user‑generated files are not overwritten or deleted. Ensure any dynamic uploads go into that folder on the server. Avoid committing a local `Frontend/build/uploads` folder.
\n+### Access After Deployment
Once successful, the site should be reachable at: `https://dangopay.dangotechconcepts.com/`
If you see a 404 or old content, clear CDN/cache or verify `CPANEL_FTP_SERVERDIR` points to the correct folder.
\n+### Troubleshooting
- Incorrect path: Re-run workflow after adjusting `CPANEL_FTP_SERVERDIR`.
- Missing assets: Confirm `Frontend/build` contains files locally (look at the uploaded artifact in the workflow run).
- Uploads vanished: Ensure the directory name matches `uploads` exactly—excluded pattern is case sensitive.
- Permission denied: Verify the FTP user has write access to the target directory.
\n+### Optional Improvements
- Add a test step (run `bun test` if you migrate Jest scripts to Bun).
- Add cache for Bun installs (action handles most cases automatically).
- Add a staging branch workflow using a different `SERVERDIR` secret.
