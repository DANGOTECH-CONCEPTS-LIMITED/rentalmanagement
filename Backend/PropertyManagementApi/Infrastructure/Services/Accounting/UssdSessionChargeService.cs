using System.Globalization;
using Application.Interfaces.Accounting;
using Domain.Entities.USSD;
using Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services.Accounting
{
    public class UssdSessionChargeService : IUssdSessionChargeService
    {
        private readonly AppDbContext _db;
        private readonly IAccountingService _accounting;

        public UssdSessionChargeService(AppDbContext db, IAccountingService accounting)
        {
            _db = db;
            _accounting = accounting;
        }

        public async Task<IEnumerable<UssdSessionCharge>> GetAsync(DateTime? from, DateTime? to, CancellationToken ct = default)
        {
            var query = _db.UssdSessionCharges.AsNoTracking();
            if (from.HasValue) query = query.Where(x => x.BillingDate >= from.Value.Date);
            if (to.HasValue) query = query.Where(x => x.BillingDate < to.Value.Date.AddDays(1));
            return await query.OrderByDescending(x => x.BillingDate).ToListAsync(ct);
        }

        public async Task<int> ImportAsync(IFormFile file, DateTime? billingDate, CancellationToken ct = default)
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("A CSV file is required.");

            using var reader = new StreamReader(file.OpenReadStream());
            var content = await reader.ReadToEndAsync(ct);
            var rows = ParseCsv(content);
            if (rows.Count == 0)
                throw new ArgumentException("The file is empty.");

            // Expected columns (header optional): sessionId, phoneNumber, durationSeconds, charge, outcome, billingDate
            var header = rows[0];
            var hasHeader = header.Any(c => c.Equals("sessionid", StringComparison.OrdinalIgnoreCase) ||
                                            c.Equals("charge", StringComparison.OrdinalIgnoreCase));
            var start = hasHeader ? 1 : 0;

            var colSession = hasHeader ? IndexOf(header, "sessionid") : 0;
            var colPhone = hasHeader ? IndexOf(header, "phonenumber") : 1;
            var colDuration = hasHeader ? IndexOf(header, "durationseconds") : 2;
            var colCharge = hasHeader ? IndexOf(header, "charge") : 3;
            var colOutcome = hasHeader ? IndexOf(header, "outcome") : 4;
            var colDate = hasHeader ? IndexOf(header, "billingdate") : -1;

            var imported = 0;
            for (var i = start; i < rows.Count; i++)
            {
                var row = rows[i];
                if (row.Length == 0) continue;
                var sessionId = Get(row, colSession);
                var chargeText = Get(row, colCharge);
                if (string.IsNullOrWhiteSpace(sessionId) || !decimal.TryParse(chargeText, NumberStyles.Any, CultureInfo.InvariantCulture, out var charge))
                    continue;

                var rowDate = billingDate ?? DateTime.UtcNow.Date;
                if (colDate >= 0 && DateTime.TryParse(Get(row, colDate), out var parsedDate))
                    rowDate = parsedDate.Date;

                var correlationId = $"USSD_FEE:{sessionId}:{rowDate:yyyyMMdd}";
                if (await _db.UssdSessionCharges.AnyAsync(x => x.CorrelationId == correlationId, ct))
                    continue; // idempotent re-import

                var record = new UssdSessionCharge
                {
                    SessionId = sessionId,
                    PhoneNumber = Get(row, colPhone),
                    DurationSeconds = int.TryParse(Get(row, colDuration), out var dur) ? dur : null,
                    Charge = charge,
                    Outcome = string.IsNullOrWhiteSpace(Get(row, colOutcome)) ? "UNKNOWN" : Get(row, colOutcome).ToUpperInvariant(),
                    BillingDate = rowDate,
                    CorrelationId = correlationId
                };
                _db.UssdSessionCharges.Add(record);

                await _accounting.PostAsync(PostingRules.UssdSessionFee(
                    correlationId: correlationId,
                    transactionId: sessionId,
                    amount: charge,
                    memo: $"USSD session fee {sessionId} ({record.Outcome})"));
                imported++;
            }

            await _db.SaveChangesAsync(ct);
            return imported;
        }

        private static List<string[]> ParseCsv(string content)
        {
            var rows = new List<string[]>();
            foreach (var rawLine in content.Split('\n', StringSplitOptions.RemoveEmptyEntries))
            {
                var line = rawLine.TrimEnd('\r');
                if (string.IsNullOrWhiteSpace(line)) continue;
                rows.Add(line.Split(',').Select(c => c.Trim().Trim('"')).ToArray());
            }
            return rows;
        }

        private static int IndexOf(string[] header, string name) =>
            Array.FindIndex(header, c => c.Equals(name, StringComparison.OrdinalIgnoreCase));

        private static string Get(string[] row, int index) =>
            index >= 0 && index < row.Length ? row[index] : string.Empty;
    }
}
