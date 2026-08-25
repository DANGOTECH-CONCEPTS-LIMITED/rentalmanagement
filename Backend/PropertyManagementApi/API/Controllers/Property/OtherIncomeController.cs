using Application.Interfaces.Property;
using Domain.Dtos.Property.OtherIncome;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Property
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class OtherIncomeController : ControllerBase
    {
        private readonly IOtherIncomeService _service;

        public OtherIncomeController(IOtherIncomeService service)
        {
            _service = service;
        }

        [HttpPost("/CreateOtherIncome")]
        public async Task<IActionResult> Create([FromBody] CreateOtherIncomeDto dto)
        {
            try { return Ok(await _service.CreateAsync(dto)); }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpGet("/GetOtherIncomeByOwnerId/{ownerId}")]
        public async Task<IActionResult> GetByOwnerId(int ownerId)
        {
            try { return Ok(await _service.GetByOwnerIdAsync(ownerId)); }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpPut("/UpdateOtherIncome")]
        public async Task<IActionResult> Update([FromBody] UpdateOtherIncomeDto dto)
        {
            try { return Ok(await _service.UpdateAsync(dto)); }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpDelete("/DeleteOtherIncome/{id}")]
        public async Task<IActionResult> Delete(int id, [FromQuery] int ownerId)
        {
            try { await _service.DeleteAsync(id, ownerId); return Ok(); }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }
    }
}
