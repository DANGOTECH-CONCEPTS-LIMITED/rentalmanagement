using Domain.Dtos.Accounting;

namespace Application.Interfaces.Accounting
{
    public interface IUtilityProfitabilityService
    {
        Task<UtilityProfitabilityReportDto> GetReportAsync(DateTime from, DateTime to, CancellationToken ct = default);
    }
}
