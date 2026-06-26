using Application.Interfaces.Tenant;
using Domain.Dtos.Tenant;
using Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Tenant
{
    [Route("api/[controller]")]
    [ApiController]
    public class TenantController : ControllerBase
    {
        private readonly ITenantService _tenantService;
        public TenantController(ITenantService tenantService)
        {
            _tenantService = tenantService;
        }

        [HttpPost("/CreateTenant")]
        [Authorize]
        public async Task<IActionResult> CreateTenant(List<IFormFile> files, [FromForm] TenantDto tenantDto)
        {
            try
            {
                if (files.Count != 3)
                    return BadRequest("Please upload exactly 3 files: passport photo, ID front, and ID back.");
                await _tenantService.CreateTenantAsync(files[0], files[1], files[2], tenantDto);
                return Ok("Tenant created successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("/UpdateTenant")]
        [Authorize]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UpdateTenant([FromForm] UpdateTenantRequest request)
        {
            try
            {
                await _tenantService.UpdateTenantAsync(
                    request.PassportPhoto,
                    request.IdFront,
                    request.IdBack,
                    request.Tenant,
                    request.TenantId);
                return Ok("Tenant updated successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        public sealed class UpdateTenantRequest
        {
            public IFormFile? PassportPhoto { get; set; }
            public IFormFile? IdFront { get; set; }
            public IFormFile? IdBack { get; set; }
            public TenantDto Tenant { get; set; } = new();
            public int TenantId { get; set; }
        }

        [HttpDelete("/DeleteTenant/{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteTenant(int id)
        {
            try
            {
                await _tenantService.DeleteTenantAsync(id);
                return Ok("Tenant deleted successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("/GetTenantById/{id}")]
        [Authorize]
        public async Task<IActionResult> GetTenantById(int id)
        {
            try
            {
                var tenant = await _tenantService.GetTenantByIdAsync(id);
                if (tenant == null)
                    return NotFound("Tenant not found.");
                return Ok(tenant);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("/UpdateTenantInvoiceDay")]
        [Authorize]
        public async Task<IActionResult> UpdateTenantInvoiceDay([FromBody] UpdateTenantInvoiceDayRequest request)
        {
            try
            {
                await _tenantService.UpdateTenantInvoiceDayAsync(request.TenantId, request.InvoiceGenerationDay);
                return Ok("Tenant invoice day updated.");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        public sealed class UpdateTenantInvoiceDayRequest
        {
            public int TenantId { get; set; }
            public int? InvoiceGenerationDay { get; set; }
        }

        [HttpGet("/GetAllTenants")]
        [Authorize]
        public async Task<IActionResult> GetAllTenants()
        {
            try
            {
                var tenants = await _tenantService.GetAllTenantsAsync();
                return Ok(tenants);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("/GetTenantsByPropertyId/{propertyId}")]
        [Authorize]
        public async Task<IActionResult> GetTenantsByPropertyId(int propertyId)
        {
            try
            {
                var tenants = await _tenantService.GetTenantsByPropertyIdAsync(propertyId);
                return Ok(tenants);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("/GetTenantsByCaretakerId/{caretakerId}")]
        [Authorize]
        public async Task<IActionResult> GetTenantsByCaretakerId(int caretakerId)
        {
            try
            {
                var tenants = await _tenantService.GetTenantsByCaretakerIdAsync(caretakerId);
                return Ok(tenants);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("/GetTenantsByCaretakerIdAndPropertyId/{caretakerId}/{propertyId}")]
        [Authorize]
        public async Task<IActionResult> GetTenantsByCaretakerIdAndPropertyId(int caretakerId, int propertyId)
        {
            try
            {
                var tenants = await _tenantService.GetTenantsByCaretakerIdAndPropertyIdAsync(caretakerId, propertyId);
                return Ok(tenants);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
