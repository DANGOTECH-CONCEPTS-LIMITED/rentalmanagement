using Application.Interfaces.AuditTrail;
using Domain.Dtos.AuditTrail;
using Microsoft.AspNetCore.Mvc.Filters;
using System;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;

namespace API.Filters
{
    public class AuditTrailFilter : IAsyncActionFilter
    {
        private readonly IAuditTrailRepository _auditTrailRepository;

        public AuditTrailFilter(IAuditTrailRepository auditTrailRepository)
        {
            _auditTrailRepository = auditTrailRepository;
        }

        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var httpContext = context.HttpContext;
            var request = httpContext.Request;
            var method = request.Method?.ToUpperInvariant();

            if (!(httpContext.User.Identity?.IsAuthenticated ?? false) ||
                method is not ("POST" or "PUT" or "PATCH" or "DELETE"))
            {
                await next();
                return;
            }

            string requestBody = string.Empty;
            try
            {
                request.EnableBuffering();
                if (request.ContentLength > 0 && request.ContentType?.Contains("application/json", StringComparison.OrdinalIgnoreCase) == true)
                {
                    request.Body.Position = 0;
                    using var reader = new StreamReader(request.Body, Encoding.UTF8, leaveOpen: true);
                    requestBody = await reader.ReadToEndAsync();
                    request.Body.Position = 0;
                }
            }
            catch
            {
                requestBody = string.Empty;
            }

            var userId = httpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "Unknown";
            var userName = httpContext.User.Identity?.Name ?? httpContext.User.FindFirst("name")?.Value;
            var userRole = httpContext.User.FindFirst(ClaimTypes.Role)?.Value;
            var route = request.Path.Value ?? string.Empty;
            var action = context.ActionDescriptor.DisplayName ?? route;
            var sourceIp = httpContext.Connection.RemoteIpAddress?.ToString();
            var arguments = context.ActionArguments.Any()
                ? string.Join("; ", context.ActionArguments.Select(kvp => $"{kvp.Key}={kvp.Value}"))
                : string.Empty;

            try
            {
                var resultContext = await next();
                await _auditTrailRepository.LogAuditAsync(new AuditTrailWriteDto
                {
                    CreatedAt = DateTime.UtcNow,
                    UserId = userId,
                    UserName = userName,
                    UserRole = userRole,
                    HttpMethod = method ?? string.Empty,
                    Route = route,
                    Action = action,
                    RequestData = string.IsNullOrWhiteSpace(requestBody)
                        ? arguments
                        : requestBody,
                    ResultStatus = resultContext.HttpContext.Response?.StatusCode.ToString(),
                    SourceIp = sourceIp,
                    Description = string.IsNullOrWhiteSpace(arguments) ? null : arguments,
                });
            }
            catch (Exception ex)
            {
                await _auditTrailRepository.LogAuditAsync(new AuditTrailWriteDto
                {
                    CreatedAt = DateTime.UtcNow,
                    UserId = userId,
                    UserName = userName,
                    UserRole = userRole,
                    HttpMethod = method ?? string.Empty,
                    Route = route,
                    Action = action,
                    RequestData = string.IsNullOrWhiteSpace(requestBody)
                        ? arguments
                        : requestBody,
                    ResultStatus = "500",
                    SourceIp = sourceIp,
                    Description = ex.Message,
                });
                throw;
            }
        }
    }
}
