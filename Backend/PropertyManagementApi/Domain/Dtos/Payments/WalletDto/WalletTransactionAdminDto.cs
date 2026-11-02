namespace Domain.Dtos.Payments.WalletDto;

/// <summary>One wallet transaction in the administrator's cross-wallet view.</summary>
public sealed record WalletTransactionAdminItem(
    int Id, int WalletId, string Owner, decimal Amount, string Description,
    string TransactionId, string Status, string VendorTranId, DateTime TransactionDate);

/// <summary>A bounded page of wallet transactions across all wallets.</summary>
public sealed record WalletTransactionsPage(
    IReadOnlyList<WalletTransactionAdminItem> Items, int Page, int PageSize, bool HasMore);
