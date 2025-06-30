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
        public async Task<IActionResult> UpdateTenant(List<IFormFile> files, [FromForm] TenantDto tenant, [FromForm] int tenantid)
        {
            try
            {
                if (files.Count != 3)
                    return BadRequest("Please upload exactly 3 files: passport photo, ID front, and ID back.");
                await _tenantService.UpdateTenantAsync(files[0], files[1], files[2], tenant, tenantid);
                return Ok("Tenant updated successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
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
    }
}
