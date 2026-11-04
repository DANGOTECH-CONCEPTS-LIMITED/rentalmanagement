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
    public class RentalContractController : ControllerBase
    {
        private readonly IRentalContractService _service;

        public RentalContractController(IRentalContractService service)
        {
            _service = service;
        }

        [HttpGet("/GetRentalContractsByLandlordId/{landlordId}")]
        public async Task<IActionResult> GetByLandlordId(int landlordId, CancellationToken ct)
        {
            try
            {
                return Ok(await _service.GetByLandlordIdAsync(landlordId, ct));
            }
            catch (Exception ex)
            {
                return HandleError(ex);
            }
        }

        [HttpGet("/GetRentalContractById/{id}")]
        public async Task<IActionResult> GetById(int id, CancellationToken ct)
        {
            try
            {
                return Ok(await _service.GetByIdAsync(id, ct));
            }
            catch (Exception ex)
            {
                return HandleError(ex);
            }
        }

        [HttpPost("/AddRentalContract")]
        public async Task<IActionResult> Add([FromBody] RentalContractDto dto, CancellationToken ct)
        {
            try
            {
                var created = await _service.CreateAsync(dto, ct);
                return Ok(created);
            }
            catch (Exception ex)
            {
                return HandleError(ex);
            }
        }

        public sealed class RenewRequest
        {
            public DateTime NewEndDate { get; set; }
        }

        [HttpPut("/RenewRentalContract/{id}")]
        public async Task<IActionResult> Renew(int id, [FromBody] RenewRequest request, CancellationToken ct)
        {
            try
            {
                return Ok(await _service.RenewAsync(id, request.NewEndDate, ct));
            }
            catch (Exception ex)
            {
                return HandleError(ex);
            }
        }

        public sealed class TerminateRequest
        {
            public string Reason { get; set; } = string.Empty;
        }

        [HttpPut("/TerminateRentalContract/{id}")]
        public async Task<IActionResult> Terminate(int id, [FromBody] TerminateRequest request, CancellationToken ct)
        {
            try
            {
                return Ok(await _service.TerminateAsync(id, request.Reason, ct));
            }
            catch (Exception ex)
            {
                return HandleError(ex);
            }
        }

        [HttpDelete("/DeleteRentalContract/{id}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            try
            {
                await _service.DeleteAsync(id, ct);
                return Ok("Rental contract deleted successfully.");
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
