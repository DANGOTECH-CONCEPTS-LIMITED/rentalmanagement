using System.Globalization;
using System.Text;
using Application.Interfaces.Accounting;
using Domain.Dtos.Accounting;
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

        public async Task<UssdSessionChargePage> GetAsync(int page, int pageSize, DateTime? from, DateTime? to, CancellationToken ct = default)
        {
            if (page < 1 || page > 100000 || pageSize < 1 || pageSize > 200)
                throw new ArgumentException("Invalid pagination.");

            var query = _db.UssdSessionCharges.AsNoTracking();
            if (from.HasValue) query = query.Where(x => x.BillingDate >= from.Value.Date);
            if (to.HasValue) query = query.Where(x => x.BillingDate < to.Value.Date.AddDays(1));

            var total = await query.CountAsync(ct);
            var items = await query.OrderByDescending(x => x.BillingDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(ct);

            return new UssdSessionChargePage
            {
                Items = items,
                Page = page,
                PageSize = pageSize,
                Total = total,
                HasMore = page * pageSize < total
            };
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

            // Operator statement header: Date, SessionId, Service Code, Phone Number, Hops, Hops Metadata, Duration, Cost, Status, Input
            var header = rows[0];
            var hasHeader = header.Any(c => Normalize(c) == "sessionid");
            var start = hasHeader ? 1 : 0;

            var colSession = hasHeader ? IndexOf(header, "sessionid") : 1;
            var colPhone = hasHeader ? IndexOf(header, "phonenumber") : 3;
            var colDuration = hasHeader ? IndexOf(header, "duration") : 6;
            var colCharge = hasHeader ? IndexOf(header, "cost") : 7;
            var colOutcome = hasHeader ? IndexOf(header, "status") : 8;
            var colDate = hasHeader ? IndexOf(header, "date") : 0;

            var imported = 0;
            for (var i = start; i < rows.Count; i++)
            {
                var row = rows[i];
                if (row.Length == 0) continue;

                var sessionId = Get(row, colSession);
                var charge = ParseCost(Get(row, colCharge));
                if (string.IsNullOrWhiteSpace(sessionId) || charge <= 0)
                    continue;

                var rowDate = billingDate ?? DateTime.UtcNow.Date;
                if (colDate >= 0 && DateTime.TryParse(Get(row, colDate), CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate))
                    rowDate = parsedDate.Date;

                var correlationId = $"USSD_FEE:{sessionId}:{rowDate:yyyyMMdd}";
                if (await _db.UssdSessionCharges.AnyAsync(x => x.CorrelationId == correlationId, ct))
                    continue; // idempotent re-import

                var outcome = Get(row, colOutcome);
                var record = new UssdSessionCharge
                {
                    SessionId = sessionId,
                    PhoneNumber = Get(row, colPhone),
                    DurationSeconds = ParseDuration(Get(row, colDuration)),
                    Charge = charge,
                    Outcome = string.IsNullOrWhiteSpace(outcome) ? "UNKNOWN" : outcome.ToUpperInvariant(),
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

        // RFC-4180-ish parser that handles quoted fields containing commas and newlines.
        private static List<string[]> ParseCsv(string content)
        {
            var rows = new List<string[]>();
            var field = new StringBuilder();
            var row = new List<string>();
            var inQuotes = false;

            for (var i = 0; i < content.Length; i++)
            {
                var c = content[i];
                if (inQuotes)
                {
                    if (c == '"')
                    {
                        if (i + 1 < content.Length && content[i + 1] == '"') { field.Append('"'); i++; }
                        else inQuotes = false;
                    }
                    else field.Append(c);
                }
                else if (c == '"') inQuotes = true;
                else if (c == ',') { row.Add(field.ToString().Trim()); field.Clear(); }
                else if (c == '\n') { row.Add(field.ToString().Trim()); field.Clear(); rows.Add(row.ToArray()); row.Clear(); }
                else if (c != '\r') field.Append(c);
            }

            if (field.Length > 0 || row.Count > 0)
            {
                row.Add(field.ToString().Trim());
                rows.Add(row.ToArray());
            }
            return rows;
        }

        private static int IndexOf(string[] header, string name)
        {
            for (var i = 0; i < header.Length; i++)
                if (Normalize(header[i]) == name) return i;
            return -1;
        }

        private static string Normalize(string value) =>
            new string(value.Where(c => !char.IsWhiteSpace(c)).ToArray()).ToLowerInvariant();

        private static string Get(string[] row, int index) =>
            index >= 0 && index < row.Length ? row[index] : string.Empty;

        private static decimal ParseCost(string text)
        {
            var cleaned = new string(text.Where(c => char.IsDigit(c) || c == '.').ToArray());
            return decimal.TryParse(cleaned, NumberStyles.Number, CultureInfo.InvariantCulture, out var value) ? value : 0m;
        }

        private static int? ParseDuration(string text)
        {
            var cleaned = new string(text.Where(char.IsDigit).ToArray());
            return int.TryParse(cleaned, out var seconds) ? seconds : null;
        }
    }
}
