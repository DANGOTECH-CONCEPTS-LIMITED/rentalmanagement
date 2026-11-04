using System.Globalization;
using System.Text;
using Application.Interfaces.Accounting;
using Domain.Dtos.Accounting;
using Domain.Dtos.Ussd;
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

        public async Task<UssdSessionChargePage> GetAsync(int page, int pageSize, DateTime? from, DateTime? to, string? outcome, CancellationToken ct = default)
        {
            if (page < 1 || page > 100000 || pageSize < 1 || pageSize > 200)
                throw new ArgumentException("Invalid pagination.");

            var query = _db.UssdSessionCharges.AsNoTracking();
            if (from.HasValue) query = query.Where(x => x.BillingDate >= from.Value.Date);
            if (to.HasValue) query = query.Where(x => x.BillingDate < to.Value.Date.AddDays(1));
            if (!string.IsNullOrWhiteSpace(outcome))
                query = query.Where(x => x.Outcome == outcome.Trim().ToUpperInvariant());

            var total = await query.CountAsync(ct);
            var totalCharge = await query.SumAsync(x => x.Charge, ct);
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
                HasMore = page * pageSize < total,
                TotalCharge = totalCharge
            };
        }

        public async Task<IEnumerable<UssdImportBatch>> GetBatchesAsync(CancellationToken ct = default)
        {
            return await _db.UssdImportBatches.AsNoTracking()
                .OrderByDescending(b => b.CreatedAt)
                .Take(50)
                .ToListAsync(ct);
        }

        // Upload path: store the file immediately and let the background worker process it.
        public async Task<UssdImportBatch> QueueAsync(IFormFile file, DateTime? billingDate, CancellationToken ct = default)
        {
            if (file == null || file.Length == 0)
                throw new ArgumentException("A CSV file is required.");

            using var reader = new StreamReader(file.OpenReadStream());
            var content = await reader.ReadToEndAsync(ct);
            if (string.IsNullOrWhiteSpace(content))
                throw new ArgumentException("The file is empty.");

            var batch = new UssdImportBatch
            {
                FileName = file.FileName ?? "ussd.csv",
                Content = content,
                BillingDate = billingDate,
                Status = "PENDING"
            };
            _db.UssdImportBatches.Add(batch);
            await _db.SaveChangesAsync(ct);
            return batch;
        }

        // Background processing path: claim one PENDING batch atomically and import its rows.
        public async Task<(int Imported, int Skipped, int Total)> ProcessBatchAsync(int batchId, CancellationToken ct = default)
        {
            var claimed = await _db.UssdImportBatches
                .Where(b => b.Id == batchId && b.Status == "PENDING")
                .ExecuteUpdateAsync(s => s.SetProperty(b => b.Status, "PROCESSING"), ct);
            if (claimed != 1)
                return (0, 0, 0); // another instance claimed it, or it was already processed

            var batch = await _db.UssdImportBatches.FirstOrDefaultAsync(b => b.Id == batchId, ct);
            if (batch == null)
                return (0, 0, 0);

            try
            {
                var (imported, skipped, total) = await ImportContentAsync(batch.Content, batch.BillingDate, ct);
                batch.Status = "COMPLETED";
                batch.ImportedRows = imported;
                batch.SkippedRows = skipped;
                batch.TotalRows = total;
                batch.ProcessedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync(ct);
                return (imported, skipped, total);
            }
            catch (Exception ex)
            {
                batch.Status = "FAILED";
                batch.Error = ex.Message;
                batch.ProcessedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync(CancellationToken.None);
                throw;
            }
        }

        // Ingest an Africa's Talking end-of-session notification directly.
        public async Task IngestNotificationAsync(UssdSessionNotificationDto notification, CancellationToken ct = default)
        {
            if (notification == null || string.IsNullOrWhiteSpace(notification.SessionId))
                return;

            var charge = ParseCost(notification.Cost ?? string.Empty);
            if (charge <= 0)
                return; // free/sandbox sessions are not an expense

            var correlationId = $"USSD_FEE:{notification.SessionId}";
            if (await _db.UssdSessionCharges.AnyAsync(x => x.CorrelationId == correlationId, ct))
                return; // duplicate notification

            var billingDate = DateTime.UtcNow.Date;
            if (DateTime.TryParse(notification.Date, CultureInfo.InvariantCulture,
                    DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var parsedDate))
                billingDate = parsedDate.Date;

            var record = new UssdSessionCharge
            {
                SessionId = notification.SessionId,
                PhoneNumber = notification.PhoneNumber,
                DurationSeconds = ParseDurationMillis(notification.DurationInMillis),
                Charge = charge,
                Outcome = MapOutcome(notification.Status),
                BillingDate = billingDate,
                CorrelationId = correlationId
            };
            _db.UssdSessionCharges.Add(record);

            await _accounting.PostAsync(PostingRules.UssdSessionFee(
                correlationId: correlationId,
                transactionId: notification.SessionId,
                amount: charge,
                memo: $"USSD session fee {notification.SessionId} ({record.Outcome})"));

            await _db.SaveChangesAsync(ct);
        }

        private static string MapOutcome(string? status) =>
            (status ?? string.Empty).Trim().ToUpperInvariant() switch
            {
                "SUCCESS" => "SUCCESS",
                "FAILED" => "FAILED",
                "INCOMPLETE" => "INCOMPLETE",
                _ => "UNKNOWN"
            };

        private static int? ParseDurationMillis(string? text)
        {
            if (int.TryParse(new string((text ?? string.Empty).Where(char.IsDigit).ToArray()), out var millis))
                return millis / 1000;
            return null;
        }

        public async Task<UssdSessionStatsDto> GetSessionStatsAsync(DateTime? from, DateTime? to, CancellationToken ct = default)
        {
            var query = _db.UssdSessions.AsNoTracking().Where(s => s.EndedAt != null);
            if (from.HasValue) query = query.Where(s => s.CreatedAt >= from.Value.Date);
            if (to.HasValue) query = query.Where(s => s.CreatedAt < to.Value.Date.AddDays(1));

            var sessions = await query
                .Select(s => new { s.Outcome, s.DataJson, s.DurationSeconds, s.CreatedAt })
                .ToListAsync(ct);

            var total = sessions.Count;
            int Count(string? outcome) => sessions.Count(s => s.Outcome == outcome);
            bool HasKey(string? json, string key) => json != null && json.Contains($"\"{key}\"", StringComparison.Ordinal);

            var daily = sessions
                .GroupBy(s => s.CreatedAt.Date)
                .Select(g => new UssdSessionDailyDto
                {
                    Date = g.Key,
                    Total = g.Count(),
                    Success = g.Count(x => x.Outcome == "SUCCESS")
                })
                .OrderBy(x => x.Date)
                .ToList();

            return new UssdSessionStatsDto
            {
                Total = total,
                Success = Count("SUCCESS"),
                Failed = Count("FAILED"),
                Incomplete = Count("INCOMPLETE"),
                Cancelled = Count("CANCELLED"),
                AvgDurationSeconds = sessions.Where(s => s.DurationSeconds.HasValue)
                    .Select(s => s.DurationSeconds)
                    .DefaultIfEmpty(0)
                    .Average(),
                Funnel = new UssdFunnelDto
                {
                    Started = total,
                    ReachedMeter = sessions.Count(s => HasKey(s.DataJson, "meter")),
                    ReachedAmount = sessions.Count(s => HasKey(s.DataJson, "amount")),
                    Completed = Count("SUCCESS")
                },
                Daily = daily
            };
        }

        private async Task<(int Imported, int Skipped, int Total)> ImportContentAsync(string content, DateTime? billingDate, CancellationToken ct)
        {
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
            var skipped = 0;
            var total = Math.Max(0, rows.Count - start);

            for (var i = start; i < rows.Count; i++)
            {
                var row = rows[i];
                if (row.Length == 0) continue;

                var sessionId = Get(row, colSession);
                var charge = ParseCost(Get(row, colCharge));
                if (string.IsNullOrWhiteSpace(sessionId) || charge <= 0)
                {
                    skipped++;
                    continue;
                }

                var rowDate = billingDate ?? DateTime.UtcNow.Date;
                if (colDate >= 0 && DateTime.TryParse(Get(row, colDate), CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate))
                    rowDate = parsedDate.Date;

                var correlationId = $"USSD_FEE:{sessionId}:{rowDate:yyyyMMdd}";
                if (await _db.UssdSessionCharges.AnyAsync(x => x.CorrelationId == correlationId, ct))
                {
                    skipped++; // idempotent re-import
                    continue;
                }

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
            return (imported, skipped, total);
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
