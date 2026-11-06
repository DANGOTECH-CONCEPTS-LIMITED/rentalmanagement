using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Application.Interfaces.Settings;
using Domain.Dtos.HtpRequestsResponse;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;

namespace Infrastructure.Services.Collecto
{
    public class LoggingHandler : DelegatingHandler
    {
        private readonly ILogger<LoggingHandler> _logger;
        private readonly IServiceScopeFactory _scopeFactory;

        private static readonly string ReqSep = new string('*', 43) + " Request " + new string('*', 43);
        private static readonly string ReqEndSep = new string('*', 41) + " End of Request " + new string('*', 41);
        private static readonly string ResSep = new string('*', 42) + " Response " + new string('*', 42);
        private static readonly string ResEndSep = new string('*', 38) + " End of Response " + new string('*', 38);

        public LoggingHandler(ILogger<LoggingHandler> logger, IServiceScopeFactory scopeFactory)
        {
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            // Build and log the request before sending: a connection failure or timeout must still be
            // recorded, otherwise a payment can fail with no bill-payment request anywhere in the log.
            var reqLog = await BuildRequestLogAsync(request, cancellationToken).ConfigureAwait(false);
            _logger.LogInformation(reqLog);

            HttpResponseMessage response;
            string resLog;
            try
            {
                response = await base.SendAsync(request, cancellationToken).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                resLog = BuildTransportFailureLog(ex);
                _logger.LogWarning(ex, "HTTP request {RequestUri} failed before a response was received.", request.RequestUri);
                await PersistAsync(request, reqLog, resLog, "TransportFailure").ConfigureAwait(false);
                throw;
            }

            resLog = await BuildResponseLogAsync(response, cancellationToken).ConfigureAwait(false);
            _logger.LogInformation(resLog);
            await PersistAsync(request, reqLog, resLog, response.StatusCode.ToString()).ConfigureAwait(false);

            return response;
        }

        // Logging must never break a payment, so persistence failures are swallowed after being logged.
        private async Task PersistAsync(HttpRequestMessage request, string reqLog, string resLog, string status)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var settings = scope.ServiceProvider.GetRequiredService<ISettings>();
                await settings.LogHttpRequestResponse(new HttpRequesRequestResponseDto
                {
                    Request = reqLog,
                    Response = resLog,
                    Status = status,
                    RequestType = request.Method.Method,
                    RequestUrl = request.RequestUri?.ToString(),
                    Source = ResolveSource(request.RequestUri?.ToString())
                }).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unable to persist the HTTP log for {RequestUri}.", request.RequestUri);
            }
        }

        private static async Task<string> BuildRequestLogAsync(HttpRequestMessage request, CancellationToken ct)
        {
            var reqSb = new StringBuilder()
                .AppendLine(ReqSep)
                .AppendLine($"{request.Method} {request.RequestUri}");
            AppendHeaders(reqSb, request.Headers);

            if (request.Content is not null)
            {
                AppendHeaders(reqSb, request.Content.Headers);
                var reqBody = await request.Content
                                              .ReadAsStringAsync(ct)
                                              .ConfigureAwait(false);
                reqSb.AppendLine()
                     .AppendLine(reqBody);
            }
            reqSb.AppendLine(ReqEndSep);

            return reqSb.ToString();
        }

        private static async Task<string> BuildResponseLogAsync(HttpResponseMessage response, CancellationToken ct)
        {
            var resSb = new StringBuilder()
                .AppendLine()
                .AppendLine(ResSep)
                .AppendLine($"HTTP/{response.Version} {(int)response.StatusCode} {response.ReasonPhrase}");
            AppendHeaders(resSb, response.Headers);

            if (response.Content is not null)
            {
                AppendHeaders(resSb, response.Content.Headers);
                var resBody = await response.Content
                                              .ReadAsStringAsync(ct)
                                              .ConfigureAwait(false);
                resSb.AppendLine()
                     .AppendLine(resBody);
            }
            resSb.AppendLine(ResEndSep);

            return resSb.ToString();
        }

        private static string BuildTransportFailureLog(Exception ex) =>
            new StringBuilder()
                .AppendLine()
                .AppendLine(ResSep)
                .AppendLine("NO RESPONSE")
                .AppendLine($"Transport failure: {ex.GetType().Name}: {ex.Message}")
                .AppendLine(ResEndSep)
                .ToString();

        private static void AppendHeaders(StringBuilder sb, HttpHeaders headers)
        {
            foreach (var header in headers)
            {
                sb.AppendLine($"{header.Key}: {string.Join(", ", header.Value)}");
            }
        }

        private static string ResolveSource(string? requestUrl)
        {
            if (string.IsNullOrWhiteSpace(requestUrl))
            {
                return "Unknown";
            }

            if (requestUrl.Contains("/api/Stanbic/", StringComparison.OrdinalIgnoreCase) ||
                requestUrl.Contains("dangotech", StringComparison.OrdinalIgnoreCase))
            {
                return "DangoPay";
            }
            if (requestUrl.Contains("collecto", StringComparison.OrdinalIgnoreCase))
            {
                return "Collecto";
            }
            if (requestUrl.Contains("egosms", StringComparison.OrdinalIgnoreCase))
            {
                return "EgoSMS";
            }
            if (requestUrl.Contains("africastalking", StringComparison.OrdinalIgnoreCase))
            {
                return "Africa's Talking";
            }
            if (requestUrl.Contains("airtel", StringComparison.OrdinalIgnoreCase))
            {
                return "Airtel";
            }
            if (requestUrl.Contains("momodeveloper", StringComparison.OrdinalIgnoreCase))
            {
                return "MTN MoMo";
            }
            if (requestUrl.Contains("stanbic", StringComparison.OrdinalIgnoreCase))
            {
                return "Stanbic";
            }

            return "Other";
        }
    }
}
