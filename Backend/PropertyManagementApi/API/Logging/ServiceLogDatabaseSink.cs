using Infrastructure.Data;
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
        private readonly IServiceScopeFactory _scopeFactory;

        public ServiceLogDatabaseSink(IServiceScopeFactory scopeFactory)
        {
            _scopeFactory = scopeFactory;
        }

        public void Emit(LogEvent logEvent)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var serviceName = ResolveServiceName(logEvent);
                var exception = logEvent.Exception?.ToString() ?? string.Empty;
                var renderedMessage = logEvent.RenderMessage();
                var level = ToCompactLevel(logEvent.Level);
                var rawContent = BuildRawContent(logEvent, level, renderedMessage, exception);
                var eventHash = ComputeHash(rawContent);

                if (!string.IsNullOrWhiteSpace(eventHash) && context.ServiceLogs.Any(x => x.EventHash == eventHash))
                {
                    return;
                }

                context.ServiceLogs.Add(new Domain.Entities.ServiceLogs.ServiceLogs
                {
                    ServiceName = serviceName,
                    LogDate = logEvent.Timestamp.LocalDateTime,
                    LogLevel = level,
                    Message = renderedMessage,
                    Exception = exception,
                    SourceType = "SerilogSink",
                    SourceIdentifier = serviceName,
                    RawContent = rawContent,
                    EventHash = eventHash,
                });

                context.SaveChanges();
            }
            catch (Exception ex)
            {
                SelfLog.WriteLine("Failed to persist Serilog event to database: {0}", ex);
            }
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