# Individual meter liens

## API contract

Authenticated endpoints are available at **both** the existing root routes below and `/api/User` + the same route. The requester is resolved from the authenticated email using the monthly-fee claim fallback. Database role **4** (Utility Payment, including the legacy misspelt role name) may read/add/configure only meters whose `LandLordId` is their own user ID. Database role **1** (Administrator) may manage any meter. Other roles receive 403. Ownership and role checks are enforced in the service, not just the controller.

- `GET /GetMeterLien/{meterId}`
- `POST /AddMeterLien/{meterId}` with `{ "amount": 10000, "description": "Meter installation", "repaymentMode": "FullFirst", "repaymentPercentage": 100 }`
- `PUT /SetMeterLienPolicy/{meterId}` with `{ "repaymentMode": "Percentage", "repaymentPercentage": 25 }`

All three return HTTP 200 with the same JSON shape:

```json
{
  "meterId": 12,
  "meterNumber": "1234567890123",
  "totalAmount": 10000,
  "amountPaid": 2500,
  "balance": 7500,
  "repaymentMode": "Percentage",
  "repaymentPercentage": 25,
  "liens": [
    { "id": 1, "amount": 10000, "amountPaid": 2500, "balance": 7500,
      "description": "Meter installation", "createdAt": "2026-10-22T15:00:00Z" }
  ],
  "repayments": [
    { "paymentId": 20, "transactionId": "provider-reference", "paymentAmount": 10000,
      "lienAmount": 2500, "tokenAmount": 7500, "createdAt": "2026-10-22T15:01:00Z" }
  ]
}
```

New meters without liens return zero totals and empty lists, with default `FullFirst`/100 policy. Errors: 400 invalid data, 401 unauthenticated, 403 wrong role/ownership, 404 missing meter, 500 unexpected failure. Principal is positive with at most two decimal places (maximum 9999999999999999.99); description is required, nonblank and at most 500 characters. Mode is exactly `FullFirst` or `Percentage`; percentage must be greater than zero and at most 100 (up to 18 decimal places). `FullFirst` normalizes its stored percentage to 100. Adding another lien also updates the meter-wide policy, applying it to the entire outstanding balance. Existing principal and history are not edited or deleted. Setting policy does not create a lien.

## DTO types and integration evidence

JSON property names are camelCase (ASP.NET Core web defaults):

| Payload | Exact fields and .NET types (JSON representation) |
| --- | --- |
| Add request | `amount`: decimal (number); `description`: string; `repaymentMode`: string; `repaymentPercentage`: decimal (number) |
| Set-policy request | `repaymentMode`: string; `repaymentPercentage`: decimal (number) |
| Summary | `meterId`: int (number); `meterNumber`: string; `totalAmount`, `amountPaid`, `balance`, `repaymentPercentage`: decimal (numbers); `repaymentMode`: string; `liens`, `repayments`: arrays |
| Each lien | `id`: int; `amount`, `amountPaid`, `balance`: decimal; `description`: string; `createdAt`: DateTime (ISO-8601 UTC string) |
| Each repayment | `paymentId`: int; `transactionId`: nullable string; `paymentAmount`, `lienAmount`, `tokenAmount`: decimal; `createdAt`: DateTime (ISO-8601 UTC string) |

Modes are exactly `FullFirst`/`Percentage`. Description rejects null/empty/whitespace and values over 500 characters, and trims the stored value. Money has at most two decimals. Percentage is **not** stored with two-decimal scale: both policy and allocation snapshot use `decimal(28,18)` and reject excess precision rather than silently rounding. `0.001` is stored exactly and remains nonzero. Frontend `step=0.01`/two-decimal precision is a compatible subset, not a backend requirement. Percentage deductions below one cent round down to zero by the documented payment allocation rule, not by policy truncation.

History is **at most one row per payment**, only when `lienAmount > 0`; fee-only, token-only and zero-lien allocations are persisted internally but omitted from the repayment history. All three endpoints return the same summary without reconciliation state/actions. No reconciliation controls are required in the lien UI; do not imply that a repayment row proves the provider has issued a token. Repayment is booked from a successfully collected payment, independently of subsequent vending success.

## Allocation priority and persistence

Only final **exact `SUCCESSFUL`**, not-yet-vended utility payments can create a financial allocation. `GetUtilityPymtsPendingTokenGeneration`, `SettleFeesForPaymentAsync`, lien allocation and the provider guard all preserve that gate. This is intentional, not broad matching on a `SUCCESSFUL` prefix:

- `CheckPaymentStatusProcessor` records `SUCCESSFUL AT TELECOM` when collection is confirmed. `CreditWalletService` credits the owner's wallet and then transitions the utility payment to final `SUCCESSFUL`. Allocating at the intermediate state would bypass that existing completion stage.
- The legacy misspelling `SUCCESSFUL AT TELCOM` occurs in M-Pesa callback DTO construction, while `MakeMPesaUtilityPayment` normalizes new persisted rows to `SUCCESSFUL AT TELECOM`. Existing persisted misspelt rows need operational review of wallet credit, not automatic promotion by the lien service.
- `SUCCESSFUL AT THE BANK` (and log wording `SUCCESSFUL AT BANK`) belongs to wallet payout status, not the final collected utility-payment state. These values do not authorize lien repayment or utility vending.
- `PENDING`, `FAILED`, `REFUNDED`, `REVERSED` and the intermediate success variants do not create allocations. A financial allocation already committed while a payment was successful is immutable; subsequently changing the payment status does **not** automatically reverse the historical fee/lien allocation. There is no utility-refund/reversal API in this change. Any real refund needs separately audited financial reconciliation; do not delete repayment/allocation rows to retry vending.

Priority is:

1. Outstanding monthly fees, oldest period first.
2. Outstanding individual liens, oldest creation time then ID first.
3. Token purchase from the remainder.

`FullFirst` allocates 100% of the amount remaining **after monthly fees**, capped at the outstanding lien balance. `Percentage` allocates the configured percentage of that same remainder, rounded **down** to cents and capped at the lien balance. Any excess and fractional-cent residue buy tokens. A payment consumed entirely by fees/liens completes with zero units and no external purchase.

All new financial amounts are decimal `decimal(18,2)`; percentage is `decimal(28,18)`. The existing payment/monthly-fee double columns remain compatible and are converted to decimals for allocation arithmetic. Payment amounts are normalized to cents using midpoint-away-from-zero. History contains one aggregated repayment per payment that repaid any lien, and `MeterLienAllocations` records its exact per-lien distribution. `paymentAmount` is the gross payment; `tokenAmount` excludes both fees and liens.

A unique `MeterLienRepayments.PaymentId` makes allocation idempotent. Monthly fee settlement, immutable payment/fee/lien/token amounts, per-lien allocation details and updated balances commit in **one database transaction**. The MySQL implementation locks the meter and payment rows with `FOR UPDATE`, consistently meter first. This serializes different payments for one meter, policy changes and lien additions across processes/instances; it is not an in-process semaphore. Monthly-fee settlement uses the same locks and joins the surrounding transaction. Lock/deadlock failures roll back and are retried by a later worker poll, not partially committed.

Policy changes/new liens affect only payments without an existing allocation. Retries reuse the original fee/lien/token amounts even if policy or balance has since changed. A legacy payment whose monthly fees were already processed but which has no lien-allocation record reuses `FeesSettledAmount` without settling fees again, then allocates only the remaining amount to liens/tokens. A wholly fee-consumed payment completes with no token and no repayment-history row; retries cannot claim it again. Each pending-payment task now creates its own dependency-injection scope and DbContext; concurrent workers never share the pending-list scope's EF services.

## Vending and uncertain outcomes

An atomic conditional update claims `Ready` allocations as `InFlight` before contacting the provider. Only one worker can claim a payment. Confirmed success stores the token/units, `IsTokenGenerated = true`, and `Complete` state in one transaction. Explicit nonzero provider rejection returns the same allocation to `Ready` for retry, without paying fees/liens again.

The provider APIs do not expose a reliable client idempotency key. Therefore a timeout, exception, malformed success, or process crash after claiming is **not automatically re-vended**: it remains `InFlight`, avoiding duplicate tokens when the provider may have completed a request. This also covers a crash between external success and the local completion commit. Operators must reconcile such payments with the provider:

1. Inspect `MeterLienRepayments` rows with `VendState = 'InFlight'`, `VendStartedAt` and `VendError`, joined to `UtilityPayments` by `PaymentId`.
2. Confirm the original outcome with the provider, using the meter, amount and timestamp. Do not retry an unresolved request.
3. If definitely not vended, atomically set only that row's `VendState = 'Ready'`; the next worker reuses its allocation. Do **not** delete the row, clear `FeesProcessed`, or change lien balances.
4. If the provider issued a token, transactionally persist that known token/units and `IsTokenGenerated = true` on the payment and set its allocation to `Complete`. A debt-only allocation (`TokenAmount = 0`) can be completed with null token/zero units after confirming no token was required.

This intentionally favors no duplicate external vend over blind retries after ambiguous outcomes. There is no automatic expiry/reclaim of `InFlight` rows. Existing automatic wallet withdrawal remains after successful completion; it is not part of provider idempotency or the lien allocation transaction.

`PrepaidApiService.PurchaseAsync` guards **all** current vending callers, including `MeterTokenService` bulk generation. Direct/bulk vends with any outstanding lien are refused; use successful utility-payment processing instead. Internal payment purchases must exactly match a claimed allocation's payment ID, meter and token amount. `AllocatedPaymentId` is JSON-ignored and cannot be supplied by API clients. The guard holds the same meter row lock while vending so a concurrent lien addition cannot race a direct bulk purchase. Both current STS and POS paths pass through this guard. STS vending now accepts decimal amounts and formats them using invariant culture, preserving fractional token remainders instead of failing integer parsing or truncating money. New vending paths must do the same.

## Deployment and validation

Migration `20261022152111_AddMeterLiens` and the EF snapshot were generated with `dotnet ef`; the migration only adds the four lien tables, indexes and foreign keys. **No database migration was applied and no live payment/provider calls were made during implementation.**

Stop all old payment workers/instances before deployment; they do not understand lien allocations. Back up the database, review/generate the migration script and apply it using the usual controlled deployment process before starting the updated API/workers. Do not roll back to old vending workers while any liens exist. The production database is MySQL 8 with transactional InnoDB tables; cross-instance locking relies on that provider's `FOR UPDATE` semantics.

Offline validation commands (from this backend directory):

```powershell
dotnet build API\API.csproj --no-restore
dotnet test Tests\Tests.csproj
dotnet ef migrations has-pending-model-changes --project Infrastructure --startup-project API --no-build
```

The relational tests use isolated in-memory SQLite, never the application connection string or external services. They cover ownership/admin restrictions, policy validation, fee priority, both modes, FIFO/capping, conservation of money, idempotency, allocation rollback, state claims, retry preservation, zero-token completion and direct-vend blocking. MySQL cross-instance locking is implemented but not integration-tested against a live database in this environment; validate concurrent workers against a disposable deployment-test database before production rollout.
