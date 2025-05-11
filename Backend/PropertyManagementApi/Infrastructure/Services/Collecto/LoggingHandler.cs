using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Application.Interfaces.Settings;
using Domain.Dtos.HtpRequestsResponse;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.Collecto
{
    public class LoggingHandler : DelegatingHandler
    {
        private readonly ILogger<LoggingHandler> _logger;
        private readonly ISettings _settings;

        private static readonly string ReqSep = new string('*', 43) + " Request " + new string('*', 43);
        private static readonly string ReqEndSep = new string('*', 41) + " End of Request " + new string('*', 41);
        private static readonly string ResSep = new string('*', 42) + " Response " + new string('*', 42);
        private static readonly string ResEndSep = new string('*', 38) + " End of Response " + new string('*', 38);

        public LoggingHandler(ILogger<LoggingHandler> logger, ISettings settings)
        {
            _logger = logger;
            _settings = settings;
        }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            // build & log request, then get response
            var (reqLog, resLog, response) = await BuildAndLogAsync(request, cancellationToken);

            // persist to your DB
            var dto = new HttpRequesRequestResponseDto
            {
                Request = reqLog,
                Response = resLog,
                Status = response.StatusCode.ToString(),
                RequestType = request.Method.Method,
                RequestUrl = request.RequestUri.ToString()
            };
            await _settings.LogHttpRequestResponse(dto)
                           .ConfigureAwait(false);

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
            var response = await base.SendAsync(request, ct)
                                     .ConfigureAwait(false);

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
