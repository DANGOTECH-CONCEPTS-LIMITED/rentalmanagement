using Application.Interfaces.AuditTrail;
using Domain.Dtos.AuditTrail;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace API.Controllers.Audit
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuditController : ControllerBase
    {
        private readonly IAuditTrailRepository _auditTrailRepository;

        public AuditController(IAuditTrailRepository auditTrailRepository)
        {
            _auditTrailRepository = auditTrailRepository;
        }

        [HttpGet("/GetAuditTrail")]
        [Authorize]
        public async Task<IActionResult> GetAuditTrail(
            [FromQuery] DateTime startDate,
            [FromQuery] DateTime endDate,
            [FromQuery] string? userId = null,
            [FromQuery] string? action = null,
            [FromQuery] string? route = null,
            [FromQuery] string? userRole = null)
        {
            try
            {
                var userRoleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
                if (userRoleClaim == null || !userRoleClaim.Equals("Administrator", StringComparison.OrdinalIgnoreCase))
                {
                    return Unauthorized();
                }

                var entries = await _auditTrailRepository.GetByDateRangeAsync(startDate, endDate, userId, action, route, userRole);
                return Ok(entries.Select(entry => new
                {
                    entry.Id,
                    entry.CreatedAt,
                    entry.UserId,
                    entry.UserName,
                    entry.UserRole,
                    entry.HttpMethod,
                    entry.Route,
                    entry.Action,
                    entry.RequestData,
                    entry.ResultStatus,
                    entry.SourceIp,
                    entry.Description,
                }));
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "An error occurred while retrieving the audit trail.", error = ex.Message });
            }
        }

        [HttpPost("/WriteAuditTrail")]
        [Authorize]
        public async Task<IActionResult> WriteAuditTrail([FromBody] AuditTrailWriteDto dto)
        {
            try
            {
                var userRoleClaim = User.FindFirst(ClaimTypes.Role)?.Value;
                if (userRoleClaim == null || !userRoleClaim.Equals("Administrator", StringComparison.OrdinalIgnoreCase))
                {
                    return Unauthorized();
                }

                if (dto == null)
                {
                    return BadRequest(new { message = "Payload is required." });
                }

                dto.CreatedAt = dto.CreatedAt == default ? DateTime.UtcNow : dto.CreatedAt;
                await _auditTrailRepository.LogAuditAsync(dto);
                return Ok(new { message = "Audit event written." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "An error occurred while writing the audit event.", error = ex.Message });
            }
        }
    }
}
