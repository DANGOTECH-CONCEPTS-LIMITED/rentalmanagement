using Domain.Dtos.Meters;
using Domain.Entities.PropertyMgt;

namespace Application.Interfaces.Meter;

public interface IMeterLienService
{
    Task<MeterLienSummaryDto> GetAsync(int meterId, string requesterEmail);
    Task<MeterLienSummaryDto> AddAsync(int meterId, AddMeterLienDto request, string requesterEmail);
    Task<MeterLienSummaryDto> SetPolicyAsync(int meterId, SetMeterLienPolicyDto request, string requesterEmail);
    Task<MeterLienRepayment> AllocatePaymentAsync(int paymentId);
    Task<bool> TryClaimVendAsync(int paymentId);
    Task CompleteVendAsync(int paymentId, string? token, string units);
    Task RecordVendFailureAsync(int paymentId, string error, bool definitiveFailure);
    Task<T> WithVendAuthorizationAsync<T>(string meterNumber, decimal amount, int? paymentId, Func<Task<T>> vend);
}
