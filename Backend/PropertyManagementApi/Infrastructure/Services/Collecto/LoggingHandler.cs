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
            // Log request line
            _logger.LogInformation("→ {Method} {Uri}", request.Method, request.RequestUri);

            // Log all request headers
            foreach (var header in request.Headers)
                _logger.LogInformation("→ Header: {Name} = {Value}", header.Key, string.Join(";", header.Value));

            // If there’s a body, log its headers + content
            if (request.Content != null)
            {
                foreach (var header in request.Content.Headers)
                    _logger.LogInformation("→ Content-Header: {Name} = {Value}", header.Key, string.Join(";", header.Value));

                var body = await request.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogInformation("→ Body: {Body}", body);
            }

            // let the request go
            var response = await base.SendAsync(request, cancellationToken);

            // Optionally log the response status too
            _logger.LogInformation("← {StatusCode} {ReasonPhrase}",
                                   (int)response.StatusCode, response.ReasonPhrase);

            return response;
        }
    }

}
