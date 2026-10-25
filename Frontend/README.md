RENTAL MANAGEMENT APP

## Meter search

On **Utility Meters**, use **Search meters** to filter by ID, meter number, type, NWSC account, or location. Administrators can also search by owner name. Search ignores case and surrounding spaces; **Clear** restores the full list. The result count updates as you type. Results are paginated (10 rows by default, with 25 and 50 available). Use **First**, **Previous**, **Next**, or **Last** to navigate. Searching, clearing search, or changing page size returns to the first page.

## Administrating utility-payment accounts

Open **Utility Account Management** in the administrator sidebar, then select a utility-payment account. All actions retain the administrator's login and operate on that selected account; switching accounts clears meter selections, drafts, and withdrawal confirmations.

- Select a specific meter to add liens, change repayment policy, and inspect lien repayments using the same panel available to the utility-payment user.
- Register, edit, or delete that account's meters. Deletion requires confirmation; editing does not transfer ownership.
- Set the account's monthly meter fee and inspect outstanding fees and charges.
- **View payments, tokens and reports** opens Utility Statistics scoped to the selected account (and meter, when selected). Existing report exports remain available.
- Inspect/export the wallet statement and review/confirm a withdrawal to the account's saved payout destination. A submitted withdrawal is not confirmation of a completed payout. After an ambiguous failure, check the refreshed statement before retrying.

Deploy both frontend and backend for delegated withdrawals: `POST /AdminWithdrawUtilityWallet` accepts JSON `{ "sourceUserId": 4, "amount": 1000, "description": "Meter repairs" }` with the administrator's bearer token. The backend verifies the actor and utility owner and records them in the audit trail. No account password or impersonated session is required.

## Individual meter liens

UtilityPayment accounts can manage liens on their own meters from **Utility Meters → Manage liens**. Administrators can manage liens on any meter. The panel shows amounts charged, repayments, outstanding balances, and payment allocation history.

- **Pay lien first:** after monthly meter fees, payments repay the lien before buying a token. Payments entirely consumed by fees/liens issue no token. Any excess after clearing the lien buys a token.
- **Percentage per payment:** a configurable percentage (greater than 0 and at most 100) of the amount remaining after monthly fees repays the lien. The remainder buys a token. Repayment is capped at the outstanding balance.
- Liens are repaid oldest first. Policy changes affect payments not yet allocated; retries retain their original allocations.
- Additions require a positive amount and a reason. The repayment history shows token allocation, not confirmation of vending success.

Deploy the matching backend and apply its meter-lien Entity Framework migration before using this feature. Lien balances must be enforced by the backend, not by the browser.

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
