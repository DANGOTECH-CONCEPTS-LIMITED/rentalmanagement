using System.ComponentModel.DataAnnotations;

namespace Domain.Entities.PropertyMgt;

public class CollectionTransactionIdentity
{
    [MaxLength(64)]
    public string TransactionId { get; set; } = string.Empty;
    [MaxLength(1)]
    public string Category { get; set; } = string.Empty;
    [MaxLength(64)]
    public string? ClientReferenceHash { get; set; }
}
