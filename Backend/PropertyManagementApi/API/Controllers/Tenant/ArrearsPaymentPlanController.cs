using Application.Interfaces.Tenant;
using Domain.Dtos.Tenant;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Tenant
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ArrearsPaymentPlanController : ControllerBase
    {
        private readonly IArrearsPaymentPlanService _service;

        public ArrearsPaymentPlanController(IArrearsPaymentPlanService service)
        {
            _service = service;
        }

        [HttpGet("/GetArrearsPlansByTenantId/{tenantId}")]
        public async Task<IActionResult> GetByTenantId(int tenantId, CancellationToken ct)
        {
            try { return Ok(await _service.GetByTenantIdAsync(tenantId, ct)); }
            catch (Exception ex) { return HandleError(ex); }
        }

        [HttpGet("/GetArrearsPlansByLandlordId/{landlordId}")]
        public async Task<IActionResult> GetByLandlordId(int landlordId, CancellationToken ct)
        {
            try { return Ok(await _service.GetByLandlordIdAsync(landlordId, ct)); }
            catch (Exception ex) { return HandleError(ex); }
        }

        [HttpPost("/AddArrearsPaymentPlan")]
        public async Task<IActionResult> Add([FromBody] ArrearsPaymentPlanDto dto, CancellationToken ct)
        {
            try { return Ok(await _service.CreateAsync(dto, ct)); }
            catch (Exception ex) { return HandleError(ex); }
        }

        [HttpPut("/CancelArrearsPlan/{id}")]
        public async Task<IActionResult> Cancel(int id, CancellationToken ct)
        {
            try { return Ok(await _service.CancelAsync(id, ct)); }
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
