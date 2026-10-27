RENTAL MANAGEMENT APP

## Payment provider fallback

Administrators can open **System Settings → Integrations → Payment provider** and manually select **Collecto** or **Dango Payment API** for new collections and mobile/bank payouts. This is a manual fallback, not automatic retry. Already-submitted transactions are reconciled with their original provider, including after switching back. Collecto-specific wallet transfers, wallet withdrawals, bill services, balance checks and phone verification remain on Collecto.

Deploy the matching backend and apply its `AddPaymentProviderRouting` EF migration before enabling the switch (the API also applies migrations on startup). Collecto is the initial selection. Configure these server-side environment variables:

- `DangoPayment__BaseUrl`: `https://paymentapi.dangotechconcepts.com/`
- `DangoPayment__MerchantCode`: the provisioned merchant code.
- `DangoPayment__SourceSystem`: the provisioned source-system identifier.
- `DangoPayment__ApiKey`: only if required by the deployed Dango API; keep credentials out of the browser and source control.
- `DangoPayment__ClientId`, `BankNetwork`, `BankCurrency`, `BankDestination`: provisioned bank-transfer values under the same `DangoPayment__` prefix.
- `DangoPayment__BankSortCodes__<SWIFT>`: each supported bank's actual sort code; a SWIFT identifier is not a sort code.

While **Collecto** is selected, enter the provisioned **MTN** and **Airtel network codes** and review their comma-separated international prefixes in **Mobile network routing**, then save. Starter prefixes are MTN `25676,25677,25678` and Airtel `25670,25674,25675`; verify these with the deployment's operator allocation. Local `07…`, `7…` and international `+2567…` numbers are normalized before matching. Unknown prefixes and overlapping rules are rejected before submission. Prefix routing cannot discover number-portability exceptions; administrators must maintain the rules. Network codes are not API credentials.

Dango remains disabled until server configuration, status mapping, bank routing and mobile-network codes are available. The requested bank must have its own sort-code mapping. Collections use `api/Stanbic/merchant-payment`; both collections and payouts use `api/Stanbic/get-transaction-status` for final settlement. Submission acceptance always remains pending. The provided status contract confirms `statusCode: "00"` as success; the returned `requestId` must match the submitted reference. Configure `DangoPayment__TransactionStatus__StateField`, `ReferenceField` and `SuccessValues__0` (defaults: `statusCode`, `requestId`, `00`). Add `FailureValues__0` and subsequent entries only for verified terminal failures. Unknown codes, mismatched references, timeouts and malformed responses remain pending, never successful or automatically failed.

Each financial reference is durably claimed before network submission. After a timeout or crash, reconcile the original reference rather than creating another payment. A timeout does not trigger a submission to the other provider. Bank/mobile route configuration is checked before creating a claim. Deployments must validate both collection and payout flows in their payment-provider test environment before enabling real transactions.

To confirm routing in backend logs, look for `PaymentGatewayRouter` messages: `Submitting … using payment provider DangoPayment` or `Checking … using original payment provider DangoPayment`. Replays identify the original provider and do not submit again. The `ICollectoApiClient` compatibility interface name does not identify the provider actually called. Older processor messages saying “Checking status with Collecto” were hard-coded labels, not routing evidence.

## Searchable dropdowns

Option dropdowns throughout the application include a **Search options** field inside the open menu. Type part of an option label to filter the list; matching ignores case and surrounding spaces. Use the arrow keys and Enter to select, or Escape to close. Reopening clears the search without changing the selected value. Disabled options remain unavailable, and empty results are shown explicitly.

In **Utility Account Management**, account dropdowns also match email, phone and account ID; meter dropdowns match meter ID, NWSC account and location as well as the visible meter label. Existing separate search fields remain available. Action menus (such as Edit/Delete) are unchanged.

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
