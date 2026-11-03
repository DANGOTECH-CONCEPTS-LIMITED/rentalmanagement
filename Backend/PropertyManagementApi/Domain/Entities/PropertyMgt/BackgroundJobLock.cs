using System.ComponentModel.DataAnnotations;

namespace Domain.Entities.PropertyMgt;

// A database-backed lease used to ensure a background job runs on only one instance at a time.
public class BackgroundJobLock
{
    [MaxLength(128)]
    public string Name { get; set; } = string.Empty;
    [MaxLength(64)]
    public string OwnerId { get; set; } = string.Empty;
    public DateTime LeaseUntilUtc { get; set; }
}
