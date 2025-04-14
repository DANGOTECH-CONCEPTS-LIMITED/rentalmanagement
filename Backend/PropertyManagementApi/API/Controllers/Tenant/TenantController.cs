using Application.Interfaces.Tenant;
using Domain.Dtos.Tenant;
using Domain.Entities;
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

        [HttpPost("CreateTenant")]
        public async Task<IActionResult> CreateTenant([FromForm] IFormFile passportphoto, [FromForm] IFormFile idfront, [FromForm] IFormFile idback, [FromForm] TenantDto tenantDto)
        {
            try
            {
                await _tenantService.CreateTenantAsync(passportphoto, idfront, idback, tenantDto);
                return Ok("Tenant created successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("UpdateTenant")]
        public async Task<IActionResult> UpdateTenant([FromForm] IFormFile passportphoto, [FromForm] IFormFile idfront, [FromForm] IFormFile idback, [FromForm] PropertyTenant tenant)
        {
            try
            {
                await _tenantService.UpdateTenantAsync(passportphoto, idfront, idback, tenant);
                return Ok("Tenant updated successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("DeleteTenant/{id}")]
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

        [HttpGet("GetTenantById/{id}")]
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

        [HttpGet("GetAllTenants")]
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
