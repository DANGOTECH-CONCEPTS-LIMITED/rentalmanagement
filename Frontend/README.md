RENTAL MANAGEMENT APP

## Payment provider fallback

Administrators can open **System Settings → Integrations → Payment provider** and manually select **Collecto** or **Dango Payment API** for new collections and mobile/bank payouts. This is a manual fallback, not automatic retry. Already-submitted transactions are reconciled with their original provider, including after switching back. Collecto-specific wallet transfers, wallet withdrawals, bill services, balance checks and phone verification remain on Collecto.

Deploy the matching backend and apply its `AddPaymentProviderRouting`, `AddDangoMerchantReferences` and `UseDatedCollectionTransactionIds` EF migrations before enabling the switch (the API also applies migrations on startup). Collecto is the initial selection. Configure these server-side environment variables:

- `DangoPayment__BaseUrl`: an absolute HTTP or HTTPS URL, such as `https://paymentapi.dangotechconcepts.com/`. HTTPS is strongly recommended for production; HTTP transmits payment details and any API key unencrypted and should be limited to trusted development/test networks.
- `DangoPayment__MerchantCode`: the provisioned merchant code.
- `sourceSystem` for merchant collections is resolved from the payer's phone prefix using the administrator's mobile-network routing rules (`MTN` or `AIRTEL`). The old global `DangoPayment__SourceSystem` setting is no longer used or required.
- `DangoPayment__ApiKey`: only if required by the deployed Dango API; keep credentials out of the browser and source control.
- `DangoPayment__ClientId` and `DangoPayment__BankCurrency`: provisioned client identifier and bank-transfer currency. Bank transfers always send `"network":"BANK"` and `"destination":"BANK"`; legacy `BankNetwork` and `BankDestination` settings are ignored and no longer required.
- `DangoPayment__BankSortCodes__<SWIFT>`: each supported bank's actual sort code; a SWIFT identifier is not a sort code.

In **Mobile network routing**, enter `MTN` for the MTN network code and `AIRTEL` for the Airtel network code, review their comma-separated international prefixes, then save (initial setup can be saved while **Collecto** remains selected). These saved codes are sent as `sourceSystem` for merchant collections and as `network` for mobile payouts; the payer's phone determines collection routing, while the beneficiary's phone determines payout routing. Starter prefixes are MTN `25676,25677,25678` and Airtel `25670,25674,25675`; verify these with the deployment's operator allocation. Local `07…`, `7…` and international `+2567…` numbers are normalized before matching. Unknown prefixes and overlapping rules are rejected before submission. Prefix routing cannot discover number-portability exceptions; administrators must maintain the rules. Network codes are not API credentials.

Dango remains disabled until server configuration, status mapping, bank routing and mobile-network codes are available. The requested bank must have its own sort-code mapping. Collections use `api/Stanbic/merchant-payment`; both collections and payouts use `api/Stanbic/get-transaction-status` for final settlement. Submission acceptance always remains pending. The provided status contract confirms `statusCode: "00"` as success; the returned `requestId` must match the submitted reference. Configure `DangoPayment__TransactionStatus__StateField`, `ReferenceField` and `SuccessValues__0` (defaults: `statusCode`, `requestId`, `00`). `FailureValues` includes the confirmed terminal failure code `57` (`FAILED`). Add further entries only for verified terminal failures. If hosting environment variables override this array, include `DangoPayment__TransactionStatus__FailureValues__0=57` there as well. Restart the backend after configuration changes; the next status poll updates matching pending transactions to failed. Unknown codes, mismatched references, timeouts and malformed responses remain pending, never successful or automatically failed.

All newly created collection **transaction IDs** use `DANGO_<TYPE>_<UTC yyyyMMdd>_<daily sequence>`, for example `DANGO_U_20261028_1`, regardless of whether Collecto or Dango is active. Types are `U` for utility/meter collections (including M-PESA), `R` for rent and `W` for wallet top-ups/generic pay-ins. IDs are issued when payments are created, not when the background processor submits them. The daily counter is shared across types, survives restarts and resets on the next UTC date. Database uniqueness protects concurrent allocation; gaps are possible when an allocation is not submitted. New Dango merchant `referenceNumber` values reuse the transaction ID rather than consuming a second sequence.

The rent API's optional incoming `transactionId` is treated as a client/receipt reference, retained separately as `ClientReference` and checked for duplicates; it no longer overrides the server-generated ID. The existing rent response body is unchanged, with the canonical ID exposed in `X-Transaction-Id`. The direct wallet collection endpoint also exposes this header; the generic pay-in API returns the canonical ID as `transactionId`. Wallet caller references are persisted as retry aliases so repeating the same reference cannot submit a second collection. Browser clients can read `X-Transaction-Id` through the configured CORS policy.

Previously created payments and their status references are not renamed. Old queued payments keep their existing IDs; Dango submissions for those legacy IDs can still receive a separate merchant reference. New mobile and bank wallet withdrawals also use `DANGO_W_<UTC yyyyMMdd>_<daily sequence>` (the confirmed `W` prefix is shared with wallet top-ups). The dated ID is issued before debiting the wallet and is passed unchanged as Dango's submission and status `requestId`; replay never allocates another ID. Withdrawals share the daily sequence with utility/rent/top-up collections but are not collection retry aliases. Previously queued or submitted payouts are not renamed; already-recorded UUID payouts still require reconciliation with their original ID. Reversals, internal wallet transfers and Collecto-specific wallet transfers retain their existing ID format. Wallet ledger credits for rent/utility collections carry the original collection ID. Existing status-correlation rules remain in place; this change does not define a separate transport-level request-ID contract. The provider's maximum reference length must still be verified before production use.

Each financial reference is durably claimed before network submission. After a timeout or crash, reconcile the original reference rather than creating another payment. A timeout does not trigger a submission to the other provider. Bank/mobile route configuration is checked before creating a claim. Deployments must validate both collection and payout flows in their payment-provider test environment before enabling real transactions.

`VendorTranId` (utility/wallet) and `VendorTransactionId` (rent) store the payment provider's returned reference, not the internal `DANGO_…` transaction ID. For Dango this is `flexipayReferenceNumber`; submission and subsequent status responses can populate or refresh it, even while pending. If the provider returns no reference, the existing value is retained (or left empty), never replaced by the internal ID. Collecto retains its returned transaction/payout reference. Status correlation and the internal transaction ID remain unchanged; Historical rows are not automatically rewritten. Calling Dango's Swagger/Postman endpoint directly does not update rental records: the rental background status worker must retrieve the response. For a matching successful bank response, it writes `SUCCESSFUL AT THE BANK` and the returned `flexipayReferenceNumber` to the original payout's `VendorTranId`. Failed payout reversal also persists the returned provider reference atomically on the original debit; the separate reversal entry links back to its internal transaction ID.

Dango requests include `clientId` so ASP.NET's required-field validation can succeed before the controller executes (the Dango service then applies its own configured client ID). Ensure `DangoPayment__ClientId` is configured. A missing `statusDescription` produces an unconfirmed-settlement message, not proof of rejection. Adapter warnings identify the endpoint, HTTP status or transport-error category without logging request bodies or credentials. Repeated references replay their stored response; do not create a replacement payment until the original is reconciled.

The status worker polls immediately on startup and every two minutes afterward. `PENDING AT THE BANK` wallet payouts are included regardless of whether a vendor reference is present. A transient query/polling error is logged and retried on the next cycle rather than permanently stopping the worker. Look for `Status poll selected … bank payouts` and the subsequent reference-specific router log; a status check never re-submits a payment.

Dango HTTP traffic is recorded through the same `LoggingHandler` used for Collecto: the full request (method, URL, headers including the masked API key, and JSON body) and the response (status line, headers and body) are written to the application log and to the `HttpRequestResponse` table. Filter that table or the log by `api/Stanbic/…` to confirm a Dango call. If no Dango row appears, no Dango request was made for that payment.

To confirm routing in backend logs, look for `PaymentGatewayRouter` messages: `Submitting … using payment provider DangoPayment` or `Checking … using original payment provider DangoPayment`. Replays identify the original provider and do not submit again. The `ICollectoApiClient` compatibility interface name does not identify the provider actually called. Older processor messages saying “Checking status with Collecto” were hard-coded labels, not routing evidence.

Dango bank-transfer amounts must be positive whole numbers. A stored decimal such as `6000.0000000000000000000000000` is sent as `"6000"`; actual fractions are rejected before submission rather than rounded. Other operation amount formats are unchanged. This fix applies to new submissions; saved ambiguous responses are still reconciled under their original reference and are not automatically resent.

## Invalid request ID rejection and payout refunds

The provider-confirmed response `{ "httpCode": 400, "httpMessage": "Bad Request", "moreInformation": "Invalid requestId" }` is treated as a terminal rejection on submission and status lookup, including when wrapped in HTTP 200. This exception is based on the provider guarantee that this exact error means the original payment was not processed. Generic HTTP 400/500 responses, other validation errors, timeouts and malformed bodies remain pending. Collections become failed without refunding money that was never debited; bank/mobile payout workers refund the original wallet debit and mark it `REVERSED`, with a linked `REVERSAL` ledger record and rejection reason. The reversal claim, ledger entry and balance increment commit atomically so repeated or concurrent responses cannot refund twice. Already-successful payouts are not reversed. Existing stored submission responses are not replaced or resent; pending payouts are reconciled by subsequent status checks.

## Automatic NWSC bill payments

When a meter collection is credited to the utility wallet and the meter has a real NWSC account (`NWSCAccount` neither blank nor `N/A`, case-insensitive), exactly one NWSC bill payment is queued for that utility payment. It is queued only while **Dango Payment API** is the active provider and after an administrator has saved and enabled biller settings. Collecto collections, meters without an NWSC account, drafts, reversals and payouts never create bill instructions. Queuing happens in the same database transaction as the wallet credit, so a failure rolls the credit back for a safe retry.

Open **System Settings → Integrations → NWSC bill payments** to enter the provisioned biller `ServiceId`, `Transtype` and optional `ProductCode`, `Tin`, `Uedlid`, `ProcessId`, `Location` and `Narrative`. Saving requires ServiceId and Transtype. Automatic bill payments are **off by default**; tick the explicit enable switch to move real money. Apply the `AddNwscBillPayments` migration before enabling.

Each instruction gets a dated `DANGO_B_yyyyMMdd_n` reference (shared daily sequence with U/R/W), which is sent as both `requestId` and `requestReference` to `api/Stanbic/bill-payment`. The amount is the meter-collection amount just credited; Dango requires a positive whole number, so fractional amounts fail before any network call. Submission is claimed before I/O so no instance can submit the same bill twice, and a submission is never treated as settlement. `api/Stanbic/bill-payment-status` is polled; only a configured success code with the matching `requestReference` settles the bill. A biller `receiptNumber` is retained as the provider reference, falling back to FlexiPay identifiers.

The utility wallet is debited **once**, only after confirmed success, with a linked `SUCCESSFUL` ledger entry carrying the bill reference. If the wallet is missing or the balance is insufficient at confirmation, the instruction becomes `PAID_UNDEBITED` with a reason instead of allowing a negative balance; it is not auto-retried. Terminal pre-processing rejections (invalid requestId or invalid amount) mark the instruction `FAILED` before money moves. Timeouts, malformed or uncorrelated status responses and unknown status codes remain pending for reconciliation. All Dango bill calls are recorded by the shared HTTP logging handler.

## Administrator reconciliation of transaction-not-found payouts

Open **System Settings → Integrations → Payout reconciliation** as an administrator. Search by the exact transaction ID or browse pending submitted Dango withdrawals. **Fail and reverse** shows the owner and positive refund amount; provide a reason, type the exact transaction ID and confirm that the payout was independently verified unpaid. A provider 404 alone is not proof that payment cannot settle later. Do not confirm until the provider/recipient records have been checked.

The administrator-only action performs a fresh `get-transaction-status` request and requires the exact `404 / Not Found / No Transaction found for the requested message ID` body with a matching `requestId`. Unavailable, malformed, changed or successful statuses block the manual action. Only pending, negative Dango payouts can be reversed; queued/unsubmitted payouts, credits, other providers and already-settled/refunded withdrawals are excluded. The refund and `REVERSED` status commit atomically, with one linked `REVERSAL` entry recording administrator identity and reason. Concurrent/refreshed requests cannot refund twice; stale status polls cannot reopen refunded withdrawals. This is manual authorization, not an automatic interpretation of 404 as failure, and never resubmits a payout.

On any submit error or timeout, refresh the panel before taking further action: the previous refund may have committed. Deploy both backend and frontend; no additional migration is needed for this interface. API examples are in `Backend/PropertyManagementApi/API/AdminPayoutReconciliation.http`; do not execute the financial example without independently confirming an unpaid real payout.

## One-time collection wallet credits

Utility and rent collections are credited once per payment row. `WalletCreditedAtUtc` is a durable marker independent of payment status: setting a credited payment back to pending and receiving another successful provider response restores `SUCCESSFUL` without another deposit. Completion, ledger insertion, balance increment and the marker commit in one database transaction. Competing workers claim the payment with a conditional update, and wallet balances use an atomic increment. A failure rolls everything back for a safe retry. Provider references and token-processing behavior are unchanged.

Apply `PreventDuplicateCollectionWalletCredits` before running the updated credit worker. Pause credit processing during deployment. If a previous startup failed after adding one or both marker columns, MySQL may retain the columns without recording the migration. This migration now checks each column before adding it and fills only empty markers; rebuild and restart to resume safely. Do not drop existing marker columns or manually mark the migration complete, as that would lose credit history or skip backfilling. The API enables MySQL user variables for the migration's guarded DDL; external migration runners should use `Allow User Variables=True` too. Legacy backfill uses an indexed temporary ledger snapshot and separate update commands to avoid repeatedly scanning the entire wallet ledger. The database user needs `CREATE TEMPORARY TABLES` permission. Startup migrations default to a 600-second command timeout, configurable via `Database__MigrationsCommandTimeoutSeconds` (30–3600); regular application query timeouts are unchanged. A timeout can also mean blocked DDL or another active transaction: stop other application instances and inspect database locks before retrying. Never skip the backfill or manually insert a migration-history entry to bypass a timeout. The migration preserves already-completed collections and links existing positive ledger credits by transaction ID and wallet owner. Historical credits with blank ledger IDs that were **already reset to pending before migration** cannot be matched reliably: reconcile these against the wallet statement and mark their `WalletCreditedAtUtc` through an approved database maintenance process before resuming the worker. Do not infer duplicate credits from equal amounts or descriptions, and do not rerun a completed payment merely to test provider connectivity. Existing duplicate deposits are not reversed automatically.

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
