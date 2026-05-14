using Application.Interfaces.Property;
using Domain.Dtos.Property.Expense;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Property
{
    [Route("api/[controller]")]
    [ApiController]
    public class ExpenseController : ControllerBase
    {
        private readonly IExpenseService _service;

        public ExpenseController(IExpenseService service)
        {
            _service = service;
        }

        [HttpPost("/AddExpense")]
        [Authorize]
        public async Task<IActionResult> AddExpense([FromBody] CreateExpenseDto dto)
        {
            try
            {
                var expense = await _service.CreateExpenseAsync(dto);
                return Ok(expense);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("/GetExpenseById/{expenseId}")]
        [Authorize]
        public async Task<IActionResult> GetExpenseById(int expenseId)
        {
            try
            {
                var expense = await _service.GetExpenseByIdAsync(expenseId);
                return Ok(expense);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("/GetExpenses")]
        [Authorize]
        public async Task<IActionResult> GetExpenses([FromBody] ExpenseQueryDto query)
        {
            try
            {
                var expenses = await _service.GetExpensesAsync(query);
                return Ok(expenses);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("/UpdateExpense/{expenseId}")]
        [Authorize]
        public async Task<IActionResult> UpdateExpense(int expenseId, [FromBody] UpdateExpenseDto dto)
        {
            try
            {
                var expense = await _service.UpdateExpenseAsync(expenseId, dto);
                return Ok(expense);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("/DeleteExpense/{expenseId}")]
        [Authorize]
        public async Task<IActionResult> DeleteExpense(int expenseId)
        {
            try
            {
                await _service.DeleteExpenseAsync(expenseId);
                return Ok("Expense deleted successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
