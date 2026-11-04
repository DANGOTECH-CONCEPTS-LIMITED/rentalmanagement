using Application.Interfaces.Tenant;
using Domain.Dtos.Tenant;
using Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Linq;

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
            if (tenantDto == null)
                return BadRequest(new { message = "Tenant data is required." });
            if (files == null || files.Count != 3)
                return BadRequest("Please upload exactly 3 files: passport photo, ID front, and ID back.");
            try
            {
                await _tenantService.CreateTenantAsync(files[0], files[1], files[2], tenantDto);
                return Ok("Tenant created successfully.");
            }
            catch (Exception ex)
            {
                return HandleError(ex);
            }
        }

        [HttpPut("/UpdateTenant")]
        [Authorize]
        public async Task<IActionResult> UpdateTenant(List<IFormFile> files, [FromForm] TenantDto tenant, [FromForm] int tenantid)
        {
            if (tenant == null)
                return BadRequest(new { message = "Tenant data is required." });
            try
            {
                var passport = files?.ElementAtOrDefault(0);
                var idFront = files?.ElementAtOrDefault(1);
                var idBack = files?.ElementAtOrDefault(2);
                await _tenantService.UpdateTenantAsync(passport, idFront, idBack, tenant, tenantid);
                return Ok("Tenant updated successfully.");
            }
            catch (Exception ex)
            {
                return HandleError(ex);
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
                return HandleError(ex);
            }
        }

        [HttpGet("/GetTenantById/{id}")]
        [Authorize]
        public async Task<IActionResult> GetTenantById(int id)
        {
            try
            {
                var tenant = await _tenantService.GetTenantByIdAsync(id);
                return Ok(tenant);
            }
            catch (Exception ex)
            {
                return HandleError(ex);
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
                return HandleError(ex);
            }
        }

        private IActionResult HandleError(Exception ex) => ex switch
        {
            ArgumentException or ArgumentNullException => BadRequest(new { message = ex.Message }),
            KeyNotFoundException => NotFound(new { message = ex.Message }),
            InvalidOperationException => BadRequest(new { message = ex.Message }),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." })
        };
    }
}
