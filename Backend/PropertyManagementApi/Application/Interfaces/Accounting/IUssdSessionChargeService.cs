using Domain.Dtos.Accounting;
using Domain.Dtos.Ussd;
using Domain.Entities.USSD;
using Microsoft.AspNetCore.Http;

namespace Application.Interfaces.Accounting
{
    public interface IUssdSessionChargeService
    {
        Task<UssdSessionChargePage> GetAsync(int page, int pageSize, DateTime? from, DateTime? to, string? outcome, CancellationToken ct = default);
        Task<IEnumerable<UssdImportBatch>> GetBatchesAsync(CancellationToken ct = default);
        Task<UssdImportBatch> QueueAsync(IFormFile file, DateTime? billingDate, CancellationToken ct = default);
        Task<(int Imported, int Skipped, int Total)> ProcessBatchAsync(int batchId, CancellationToken ct = default);
        Task IngestNotificationAsync(UssdSessionNotificationDto notification, CancellationToken ct = default);
    }
}
