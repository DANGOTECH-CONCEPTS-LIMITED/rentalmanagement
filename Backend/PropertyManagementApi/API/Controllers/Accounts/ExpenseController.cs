using Application.Interfaces.Accounting;
using Domain.Dtos.Accounting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Accounts
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ExpenseController : ControllerBase
    {
        private readonly IExpenseService _service;

        public ExpenseController(IExpenseService service)
        {
            _service = service;
        }

        [HttpGet("/GetExpensesByLandlordId/{landlordId}")]
        public async Task<IActionResult> GetByLandlordId(int landlordId, CancellationToken ct,
            [FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
        {
            try { return Ok(await _service.GetByLandlordIdAsync(landlordId, from, to, ct)); }
            catch (Exception ex) { return HandleError(ex); }
        }

        [HttpPost("/AddExpense")]
        public async Task<IActionResult> Add([FromBody] ExpenseDto dto, CancellationToken ct)
        {
            try { return Ok(await _service.CreateAsync(dto, ct)); }
            catch (Exception ex) { return HandleError(ex); }
        }

        [HttpDelete("/DeleteExpense/{id}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            try
            {
                await _service.DeleteAsync(id, ct);
                return Ok("Expense deleted successfully.");
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
