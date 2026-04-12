using Application.Interfaces.ServiceLogs;
using Domain.Dtos.ServiceLogs;
using Domain.Entities.ServiceLogs;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace Infrastructure.Services.ServiceLogs
{
    public class ServiceLogsRepository : IServiceLogsRepository
    {
        private readonly AppDbContext _context;
        private static readonly Regex SerilogHeaderPattern = new(
            "^(?<timestamp>\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}:\\d{2}\\.\\d{3} [+-]\\d{2}:\\d{2}) \\[(?<level>[A-Z]{3})\\] (?<message>.*)$",
            RegexOptions.Compiled);

        public ServiceLogsRepository(AppDbContext context) => _context = context;

        public async Task LogErrorAsync(string serviceName, string level, string message, string exception)
        {
            var logEntry = new Domain.Entities.ServiceLogs.ServiceLogs
            {
                ServiceName = serviceName,
                LogDate = DateTime.UtcNow,
                LogLevel = level,
                Message = message,
                Exception = exception,
                SourceType = "ApplicationError",
                EventHash = ComputeHash($"ApplicationError|{serviceName}|{level}|{message}|{exception}")
            };

            if (!string.IsNullOrWhiteSpace(logEntry.EventHash) &&
                await _context.ServiceLogs.AsNoTracking().AnyAsync(x => x.EventHash == logEntry.EventHash))
            {
                return;
            }

            _context.ServiceLogs.Add(logEntry);
            await _context.SaveChangesAsync();

            // Also log to Windows Event Viewer
            try
            {
                using var eventLog = new EventLog("Application");
                eventLog.Source = serviceName;
                string fullMessage = $"{level}: {message} - Exception: {exception}";
                eventLog.WriteEntry(fullMessage, EventLogEntryType.Error);
            }
            catch (Exception ex)
            {
                // If EventLog fails, don't throw; perhaps log to console or ignore
                Console.WriteLine($"Failed to write to EventLog: {ex.Message}");
            }
        }

        public async Task LogAsync(ServiceLogWriteDto dto)
        {
            var entity = new Domain.Entities.ServiceLogs.ServiceLogs
            {
                ServiceName = string.IsNullOrWhiteSpace(dto.ServiceName) ? "Application" : dto.ServiceName,
                LogDate = dto.LogDate == default ? DateTime.UtcNow : dto.LogDate,
                LogLevel = string.IsNullOrWhiteSpace(dto.LogLevel) ? "INF" : dto.LogLevel,
                Message = dto.Message ?? string.Empty,
                Exception = dto.Exception ?? string.Empty,
                SourceType = dto.SourceType,
                SourceIdentifier = dto.SourceIdentifier,
                RawContent = dto.RawContent,
                EventHash = string.IsNullOrWhiteSpace(dto.EventHash)
                    ? ComputeHash($"{dto.LogDate:o}|{dto.LogLevel}|{dto.ServiceName}|{dto.Message}|{dto.Exception}|{dto.SourceType}|{dto.SourceIdentifier}")
                    : dto.EventHash,
            };

            if (!string.IsNullOrWhiteSpace(entity.EventHash) &&
                await _context.ServiceLogs.AsNoTracking().AnyAsync(x => x.EventHash == entity.EventHash))
            {
                return;
            }

            await _context.ServiceLogs.AddAsync(entity);
            await _context.SaveChangesAsync();
        }

        public async Task<IReadOnlyList<Domain.Entities.ServiceLogs.ServiceLogs>> GetByDateRangeAsync(
            DateTime startDate,
            DateTime endDate,
            string? sourceType = null)
        {
            var start = startDate.Date;
            var end = endDate.Date.AddDays(1).AddTicks(-1);

            var query = _context.ServiceLogs
                .Where(x => x.LogDate >= start && x.LogDate <= end)
                .AsNoTracking();

            if (!string.IsNullOrWhiteSpace(sourceType))
            {
                query = query.Where(x => x.SourceType == sourceType);
            }

            return await query
                .OrderByDescending(x => x.LogDate)
                .ToListAsync();
        }

        public async Task<SerilogImportResultDto> ImportSerilogFilesAsync(string logsDirectory, string? fileName = null)
        {
            var result = new SerilogImportResultDto();
            if (!Directory.Exists(logsDirectory))
            {
                return result;
            }

            var files = ResolveFiles(logsDirectory, fileName, result);
            foreach (var filePath in files)
            {
                result.FilesProcessed++;
                result.ImportedFiles.Add(Path.GetFileName(filePath));

                var parsedEntries = await ParseSerilogFileAsync(filePath);
                result.EventsDiscovered += parsedEntries.Count;

                if (parsedEntries.Count == 0)
                {
                    continue;
                }

                var candidateHashes = parsedEntries
                    .Select(x => x.EventHash)
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Distinct()
                    .ToList();

                var existingHashes = candidateHashes.Count == 0
                    ? new HashSet<string>()
                    : (await _context.ServiceLogs
                        .AsNoTracking()
                        .Where(x => x.EventHash != null && candidateHashes.Contains(x.EventHash))
                        .Select(x => x.EventHash!)
                        .ToListAsync())
                        .ToHashSet();

                var distinctEntries = parsedEntries
                    .GroupBy(x => x.EventHash ?? Guid.NewGuid().ToString("N"))
                    .Select(x => x.First())
                    .Where(x => string.IsNullOrWhiteSpace(x.EventHash) || !existingHashes.Contains(x.EventHash))
                    .ToList();

                if (distinctEntries.Count > 0)
                {
                    await _context.ServiceLogs.AddRangeAsync(distinctEntries);
                    await _context.SaveChangesAsync();
                }

                result.EventsImported += distinctEntries.Count;
                result.EventsSkipped += parsedEntries.Count - distinctEntries.Count;
            }

            return result;
        }

        private static IEnumerable<string> ResolveFiles(string logsDirectory, string? fileName, SerilogImportResultDto result)
        {
            if (string.IsNullOrWhiteSpace(fileName))
            {
                return Directory.GetFiles(logsDirectory, "*.txt", SearchOption.TopDirectoryOnly)
                    .OrderBy(path => path)
                    .ToList();
            }

            var sanitizedFileName = Path.GetFileName(fileName);
            var filePath = Path.Combine(logsDirectory, sanitizedFileName);
            if (!File.Exists(filePath))
            {
                result.MissingFiles.Add(sanitizedFileName);
                return Array.Empty<string>();
            }

            return new[] { filePath };
        }

        private static async Task<List<Domain.Entities.ServiceLogs.ServiceLogs>> ParseSerilogFileAsync(string filePath)
        {
            var lines = await File.ReadAllLinesAsync(filePath);
            var entries = new List<Domain.Entities.ServiceLogs.ServiceLogs>();
            var currentBlock = new List<string>();

            void FlushCurrentBlock()
            {
                if (currentBlock.Count == 0)
                {
                    return;
                }

                entries.Add(ParseLogBlock(filePath, currentBlock));
                currentBlock.Clear();
            }

            foreach (var line in lines)
            {
                if (SerilogHeaderPattern.IsMatch(line))
                {
                    FlushCurrentBlock();
                }

                currentBlock.Add(line);
            }

            FlushCurrentBlock();

            return entries;
        }

        private static Domain.Entities.ServiceLogs.ServiceLogs ParseLogBlock(string filePath, List<string> block)
        {
            var header = block[0];
            var rawContent = string.Join(Environment.NewLine, block).Trim();
            var match = SerilogHeaderPattern.Match(header);

            if (!match.Success)
            {
                return new Domain.Entities.ServiceLogs.ServiceLogs
                {
                    ServiceName = "SerilogFile",
                    LogDate = File.GetLastWriteTime(filePath),
                    LogLevel = "UNK",
                    Message = header,
                    Exception = block.Count > 1 ? string.Join(Environment.NewLine, block.Skip(1)) : string.Empty,
                    SourceType = "SerilogFile",
                    SourceIdentifier = Path.GetFileName(filePath),
                    RawContent = rawContent,
                    EventHash = ComputeHash(rawContent),
                };
            }

            var timestamp = DateTimeOffset.ParseExact(
                match.Groups["timestamp"].Value,
                "yyyy-MM-dd HH:mm:ss.fff zzz",
                CultureInfo.InvariantCulture);

            return new Domain.Entities.ServiceLogs.ServiceLogs
            {
                ServiceName = "SerilogFile",
                LogDate = timestamp.LocalDateTime,
                LogLevel = match.Groups["level"].Value,
                Message = match.Groups["message"].Value,
                Exception = block.Count > 1 ? string.Join(Environment.NewLine, block.Skip(1)) : string.Empty,
                SourceType = "SerilogFile",
                SourceIdentifier = Path.GetFileName(filePath),
                RawContent = rawContent,
                EventHash = ComputeHash(rawContent),
            };
        }

        private static string ComputeHash(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return string.Empty;
            }

            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
            return Convert.ToHexString(bytes);
        }
    }
}
