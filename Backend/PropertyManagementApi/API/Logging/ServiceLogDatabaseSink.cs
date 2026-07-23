using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Serilog.Core;
using Serilog.Debugging;
using Serilog.Events;
using System.Security.Cryptography;
using System.Text;

namespace API.Logging
{
    public class ServiceLogDatabaseSink : ILogEventSink
    {
        private static readonly AsyncLocal<bool> IsPersisting = new();
        private readonly IServiceScopeFactory _scopeFactory;

        public ServiceLogDatabaseSink(IServiceScopeFactory scopeFactory)
        {
            _scopeFactory = scopeFactory;
        }

        public void Emit(LogEvent logEvent)
        {
            if (IsPersisting.Value || IsEntityFrameworkLog(logEvent))
            {
                return;
            }

            try
            {
                IsPersisting.Value = true;
                using var scope = _scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var serviceName = ResolveServiceName(logEvent);
                var exception = logEvent.Exception?.ToString() ?? string.Empty;
                var renderedMessage = logEvent.RenderMessage();
                var level = ToCompactLevel(logEvent.Level);
                var rawContent = BuildRawContent(logEvent, level, renderedMessage, exception);
                var eventHash = ComputeHash(rawContent);

                context.Database.ExecuteSqlInterpolated($"""
                    INSERT IGNORE INTO `ServiceLogs`
                        (`EventHash`, `Exception`, `LogDate`, `LogLevel`, `Message`, `RawContent`, `ServiceName`, `SourceIdentifier`, `SourceType`)
                    VALUES
                        ({eventHash}, {exception}, {logEvent.Timestamp.LocalDateTime}, {level}, {renderedMessage}, {rawContent}, {serviceName}, {serviceName}, {"SerilogSink"});
                    """);
            }
            catch (Exception ex)
            {
                SelfLog.WriteLine("Failed to persist Serilog event to database: {0}", ex);
            }
            finally
            {
                IsPersisting.Value = false;
            }
        }

        private static bool IsEntityFrameworkLog(LogEvent logEvent)
        {
            return logEvent.Properties.TryGetValue("SourceContext", out var sourceContext)
                && sourceContext.ToString().Trim('"').StartsWith("Microsoft.EntityFrameworkCore", StringComparison.Ordinal);
        }

        private static string ResolveServiceName(LogEvent logEvent)
        {
            if (logEvent.Properties.TryGetValue("SourceContext", out var sourceContext))
            {
                var sourceValue = sourceContext.ToString().Trim('"');
                if (!string.IsNullOrWhiteSpace(sourceValue))
                {
                    return sourceValue;
                }
            }

            return "Application";
        }

        private static string ToCompactLevel(LogEventLevel level)
        {
            return level switch
            {
                LogEventLevel.Verbose => "VRB",
                LogEventLevel.Debug => "DBG",
                LogEventLevel.Information => "INF",
                LogEventLevel.Warning => "WRN",
                LogEventLevel.Error => "ERR",
                LogEventLevel.Fatal => "FTL",
                _ => level.ToString().ToUpperInvariant(),
            };
        }

        private static string BuildRawContent(LogEvent logEvent, string level, string message, string exception)
        {
            var builder = new StringBuilder()
                .Append(logEvent.Timestamp.ToString("yyyy-MM-dd HH:mm:ss.fff zzz"))
                .Append(" [")
                .Append(level)
                .Append("] ")
                .Append(message);

            if (!string.IsNullOrWhiteSpace(exception))
            {
                builder.AppendLine();
                builder.Append(exception);
            }

            return builder.ToString();
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