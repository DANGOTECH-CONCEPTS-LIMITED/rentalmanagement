using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace API.Controllers.Property
{
    [ApiController]
    [Route("api/[controller]")]
    public class ViewingRequestController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ViewingRequestController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost("/RequestViewing")]
        [Authorize]
        public async Task<IActionResult> RequestViewing([FromBody] ViewingRequestDto dto)
        {
            try
            {
                var request = new ViewingRequest
                {
                    PropertyId = dto.PropertyId,
                    TenantId = dto.TenantId,
                    TenantName = dto.TenantName,
                    TenantEmail = dto.TenantEmail,
                    TenantPhone = dto.TenantPhone,
                    PreferredDate = dto.PreferredDate,
                    Message = dto.Message ?? string.Empty,
                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow,
                };
                _context.ViewingRequests.Add(request);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Viewing request submitted successfully.", id = request.Id });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("/GetViewingRequestsByPropertyId/{propertyId}")]
        [Authorize]
        public async Task<IActionResult> GetByProperty(int propertyId)
        {
            var requests = await _context.ViewingRequests
                .Where(r => r.PropertyId == propertyId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
            return Ok(requests);
        }

        [HttpGet("/GetMyViewingRequests/{tenantId}")]
        [Authorize]
        public async Task<IActionResult> GetByTenant(int tenantId)
        {
            var requests = await _context.ViewingRequests
                .Include(r => r.Property)
                .Where(r => r.TenantId == tenantId)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
            return Ok(requests);
        }

        [HttpGet("/GetViewingRequestsByLandlordId/{landlordId}")]
        [Authorize]
        public async Task<IActionResult> GetByLandlord(int landlordId)
        {
            var propertyIds = await _context.LandLordProperties
                .Where(p => p.OwnerId == landlordId)
                .Select(p => p.Id)
                .ToListAsync();

            var requests = await _context.ViewingRequests
                .Include(r => r.Property)
                .Where(r => propertyIds.Contains(r.PropertyId))
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
            return Ok(requests);
        }

        [HttpGet("/GetAllViewingRequests")]
        [Authorize]
        public async Task<IActionResult> GetAll()
        {
            var requests = await _context.ViewingRequests
                .Include(r => r.Property)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
            return Ok(requests);
        }

        [HttpPut("/UpdateViewingRequestStatus/{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateViewingStatusDto dto)
        {
            var request = await _context.ViewingRequests.FindAsync(id);
            if (request == null) return NotFound("Viewing request not found.");
            request.Status = dto.Status;
            await _context.SaveChangesAsync();
            return Ok(new { message = "Status updated." });
        }
    }

    public class ViewingRequestDto
    {
        public int PropertyId { get; set; }
        public int TenantId { get; set; }
        public string TenantName { get; set; } = string.Empty;
        public string TenantEmail { get; set; } = string.Empty;
        public string TenantPhone { get; set; } = string.Empty;
        public DateTime PreferredDate { get; set; }
        public string? Message { get; set; }
    }

    public class UpdateViewingStatusDto
    {
        public string Status { get; set; } = string.Empty;
    }
}
