using Domain.Entities.USSD;
using Microsoft.AspNetCore.Http;

namespace Application.Interfaces.Accounting
{
    public interface IUssdSessionChargeService
    {
        Task<IEnumerable<UssdSessionCharge>> GetAsync(DateTime? from, DateTime? to, CancellationToken ct = default);
        Task<int> ImportAsync(IFormFile file, DateTime? billingDate, CancellationToken ct = default);
    }
}
