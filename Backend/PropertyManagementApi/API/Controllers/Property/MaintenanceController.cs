using Application.Interfaces.Property;
using Domain.Dtos.Property;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Property
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class MaintenanceController : ControllerBase
    {
        private readonly IMaintenanceService _service;

        public MaintenanceController(IMaintenanceService service)
        {
            _service = service;
        }

        [HttpGet("/GetMaintenanceByLandlordId/{landlordId}")]
        public async Task<IActionResult> GetByLandlordId(int landlordId, CancellationToken ct)
        {
            try { return Ok(await _service.GetByLandlordIdAsync(landlordId, ct)); }
            catch (Exception ex) { return HandleError(ex); }
        }

        [HttpGet("/GetMaintenanceByTenantId/{tenantId}")]
        public async Task<IActionResult> GetByTenantId(int tenantId, CancellationToken ct)
        {
            try { return Ok(await _service.GetByTenantIdAsync(tenantId, ct)); }
            catch (Exception ex) { return HandleError(ex); }
        }

        [HttpGet("/GetMaintenanceById/{id}")]
        public async Task<IActionResult> GetById(int id, CancellationToken ct)
        {
            try { return Ok(await _service.GetByIdAsync(id, ct)); }
            catch (Exception ex) { return HandleError(ex); }
        }

        [HttpPost("/AddMaintenanceRequest")]
        public async Task<IActionResult> Add([FromBody] MaintenanceRequestDto dto, CancellationToken ct)
        {
            try { return Ok(await _service.CreateAsync(dto, ct)); }
            catch (Exception ex) { return HandleError(ex); }
        }

        [HttpPut("/UpdateMaintenanceRequest/{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] MaintenanceUpdateDto dto, CancellationToken ct)
        {
            try { return Ok(await _service.UpdateAsync(id, dto, ct)); }
            catch (Exception ex) { return HandleError(ex); }
        }

        [HttpDelete("/DeleteMaintenanceRequest/{id}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            try
            {
                await _service.DeleteAsync(id, ct);
                return Ok("Maintenance request deleted successfully.");
            }
            catch (Exception ex) { return HandleError(ex); }
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
