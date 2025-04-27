using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.Collecto
{
    public class LoggingHandler : DelegatingHandler
    {
        private readonly ILogger<LoggingHandler> _logger;

        public LoggingHandler(ILogger<LoggingHandler> logger)
        {
            _logger = logger;
        }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            // — Build and emit the Request block —
            var reqSb = new StringBuilder();
            reqSb.AppendLine(new string('*', 43) + " Request " + new string('*', 43));
            reqSb.AppendLine($"{request.Method} {request.RequestUri}");
            foreach (var header in request.Headers)
                reqSb.AppendLine($"{header.Key}: {string.Join(", ", header.Value)}");
            if (request.Content != null)
            {
                foreach (var header in request.Content.Headers)
                    reqSb.AppendLine($"{header.Key}: {string.Join(", ", header.Value)}");
                var body = await request.Content.ReadAsStringAsync(cancellationToken);
                reqSb.AppendLine();
                reqSb.AppendLine(body);
            }
            reqSb.AppendLine(new string('*', 41) + " End of Request " + new string('*', 41));
            _logger.LogInformation(reqSb.ToString());

            // — Actually send the HTTP request —
            var response = await base.SendAsync(request, cancellationToken);

            // — Build and emit the Response block —
            var resSb = new StringBuilder();
            resSb.AppendLine(); // blank line between blocks
            resSb.AppendLine(new string('*', 42) + " Response " + new string('*', 42));
            resSb.AppendLine($"HTTP/{response.Version} {(int)response.StatusCode} {response.ReasonPhrase}");
            foreach (var header in response.Headers)
                resSb.AppendLine($"{header.Key}: {string.Join(", ", header.Value)}");
            if (response.Content != null)
            {
                foreach (var header in response.Content.Headers)
                    resSb.AppendLine($"{header.Key}: {string.Join(", ", header.Value)}");
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                resSb.AppendLine();
                resSb.AppendLine(body);
            }
            resSb.AppendLine(new string('*', 38) + " End of Response " + new string('*', 38));
            _logger.LogInformation(resSb.ToString());

            return response;
        }
    }


}
