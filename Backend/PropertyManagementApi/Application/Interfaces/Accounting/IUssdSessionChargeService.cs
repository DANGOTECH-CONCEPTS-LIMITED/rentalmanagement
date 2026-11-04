using Domain.Dtos.Accounting;
using Microsoft.AspNetCore.Http;

namespace Application.Interfaces.Accounting
{
    public interface IUssdSessionChargeService
    {
        Task<UssdSessionChargePage> GetAsync(int page, int pageSize, DateTime? from, DateTime? to, CancellationToken ct = default);
        Task<int> ImportAsync(IFormFile file, DateTime? billingDate, CancellationToken ct = default);
    }
}
