using Domain.Dtos.Meters;
using System;
using System.Threading.Tasks;

namespace Application.Interfaces.Meter
{
    public interface IMeterFeeService
    {
        Task<MeterFeeSummaryDto> SetMonthlyFeeAsync(int ownerId, double monthlyFee, string requesterEmail, bool isAdmin);
        Task<MeterFeeSummaryDto> GetFeeSummaryAsync(int ownerId, string requesterEmail, bool isAdmin);
        Task<int> ApplyDueMonthlyFeesAsync(DateTime now);
        // Null when the meter's owner charges no fee and nothing is outstanding.
        Task<double?> GetOutstandingForMeterAsync(string meterNumber);
        Task<MeterFeeReportDto> GetFeeReportAsync(string requesterEmail, bool isAdmin, string? fromPeriod, string? toPeriod);
        // Applies the payment to the meter's outstanding fees (oldest first) and returns the amount consumed.
        Task<double> SettleFeesForPaymentAsync(int paymentId);
    }
}
