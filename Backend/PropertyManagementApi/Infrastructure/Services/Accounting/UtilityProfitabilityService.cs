using Application.Interfaces.Accounting;
using Domain.Dtos.Accounting;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Services.Accounting
{
    public class UtilityProfitabilityService : IUtilityProfitabilityService
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _cfg;

        public UtilityProfitabilityService(AppDbContext db, IConfiguration cfg)
        {
            _db = db;
            _cfg = cfg;
        }

        public async Task<UtilityProfitabilityReportDto> GetReportAsync(DateTime from, DateTime to, CancellationToken ct = default)
        {
            var fromDate = from.Date;
            var toEnd = to.Date.AddDays(1);
            var bankPct = _cfg.GetValue<decimal?>("Accounting:Fees:Utility:BankFeePercent") ?? 1.5m;
            var smsFlat = _cfg.GetValue<decimal?>("Accounting:Fees:Utility:SmsTokenFeeFlat") ?? 35m;

            var payments = await _db.UtilityPayments.AsNoTracking()
                .Where(p => p.Status == "SUCCESSFUL" && p.CreatedAt >= fromDate && p.CreatedAt < toEnd)
                .ToListAsync(ct);

            var gross = payments.Sum(p => (decimal)p.Amount + (decimal)p.Charges);
            var commission = payments.Sum(p => (decimal)p.Charges);
            var bankFee = Math.Round(gross * bankPct / 100m, 2);

            // SMS is sent once per vended token; UtilityPayment.IsSmsSent tracks it.
            var smsByMeter = payments
                .Where(p => p.IsSmsSent)
                .GroupBy(p => p.MeterNumber)
                .ToDictionary(g => g.Key, g => g.Count());

            var tokenCount = smsByMeter.Values.Sum();
            var smsFee = smsFlat * tokenCount;

            var ussdFee = await _db.UssdSessionCharges.AsNoTracking()
                .Where(u => u.BillingDate >= fromDate && u.BillingDate < toEnd)
                .SumAsync(u => u.Charge, ct);
            var ussdCount = await _db.UssdSessionCharges.AsNoTracking()
                .CountAsync(u => u.BillingDate >= fromDate && u.BillingDate < toEnd, ct);

            var meters = payments
                .GroupBy(p => p.MeterNumber)
                .Select(g =>
                {
                    var gGross = g.Sum(p => (decimal)p.Amount + (decimal)p.Charges);
                    var gComm = g.Sum(p => (decimal)p.Charges);
                    var gBank = Math.Round(gGross * bankPct / 100m, 2);
                    var gTokens = smsByMeter.TryGetValue(g.Key, out var smsCount) ? smsCount : 0;
                    var gSms = smsFlat * gTokens;
                    return new MeterProfitabilityRowDto
                    {
                        MeterNumber = g.Key,
                        GrossCollected = gGross,
                        Commission = gComm,
                        BankFee = gBank,
                        SmsFee = gSms,
                        TokenCount = gTokens,
                        Net = gComm - gBank - gSms
                    };
                })
                .OrderByDescending(m => m.Net)
                .ToList();

            var net = commission - bankFee - smsFee - ussdFee;

            return new UtilityProfitabilityReportDto
            {
                From = fromDate,
                To = to.Date,
                GrossCollected = gross,
                CommissionIncome = commission,
                BankFee = bankFee,
                SmsFee = smsFee,
                UssdFee = ussdFee,
                Net = net,
                TokenCount = tokenCount,
                UssdSessionCount = ussdCount,
                Meters = meters
            };
        }
    }
}
