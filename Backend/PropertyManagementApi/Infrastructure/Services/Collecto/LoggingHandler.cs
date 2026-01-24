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
            // build & log request, then get response
            var (reqLog, resLog, response) = await BuildAndLogAsync(request, cancellationToken);

            // persist to your DB using a new scope
            var dto = new HttpRequesRequestResponseDto
            {
                Request = reqLog,
                Response = resLog,
                Status = response.StatusCode.ToString(),
                RequestType = request.Method.Method,
                RequestUrl = request.RequestUri.ToString()
            };

            using var scope = _scopeFactory.CreateScope();
            var settings = scope.ServiceProvider.GetRequiredService<ISettings>();
            await settings.LogHttpRequestResponse(dto);

            return response;
        }

        private async Task<(string ReqLog, string ResLog, HttpResponseMessage Response)> BuildAndLogAsync(
            HttpRequestMessage request,
            CancellationToken ct)
        {
            // — REQUEST —
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

            _logger.LogInformation(reqSb.ToString());

            // — SEND —
            HttpResponseMessage response;
            try
            {
                response = await base.SendAsync(request, ct)
                                     .ConfigureAwait(false);
            }
            catch (TaskCanceledException ex)
            {
                _logger.LogWarning(ex, "HTTP request was cancelled for {RequestUri}", request.RequestUri);
                throw; // Re-throw to maintain behavior
            }

            // — RESPONSE —
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

            _logger.LogInformation(resSb.ToString());

            return (reqSb.ToString(), resSb.ToString(), response);
        }

        private static void AppendHeaders(StringBuilder sb, HttpHeaders headers)
        {
            foreach (var header in headers)
            {
                sb.AppendLine($"{header.Key}: {string.Join(", ", header.Value)}");
            }
        }
    }
}
