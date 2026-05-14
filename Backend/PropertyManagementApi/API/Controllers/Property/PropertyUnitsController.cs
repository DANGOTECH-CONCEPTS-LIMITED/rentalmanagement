using Application.Interfaces.Property;
using Domain.Dtos.Property;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Property
{
    [Route("api/[controller]")]
    [ApiController]
    public class PropertyUnitsController : ControllerBase
    {
        private readonly IPropertyUnitService _service;

        public PropertyUnitsController(IPropertyUnitService service)
        {
            _service = service;
        }

        [HttpPost("/AddPropertyUnit")]
        [Authorize]
        public async Task<IActionResult> AddPropertyUnit([FromBody] PropertyUnitDto dto)
        {
            try
            {
                var unit = await _service.AddUnitAsync(dto);
                return Ok(unit);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("/GetPropertyUnitsByPropertyId/{propertyId}")]
        [Authorize]
        public async Task<IActionResult> GetPropertyUnitsByPropertyId(int propertyId)
        {
            try
            {
                var units = await _service.GetUnitsByPropertyIdAsync(propertyId);
                return Ok(units);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("/GetPropertyUnitsByLandLordId/{landlordId}")]
        [Authorize]
        public async Task<IActionResult> GetPropertyUnitsByLandLordId(int landlordId)
        {
            try
            {
                var units = await _service.GetUnitsByLandlordIdAsync(landlordId);
                return Ok(units);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("/GetPropertyUnitById/{unitId}")]
        [Authorize]
        public async Task<IActionResult> GetPropertyUnitById(int unitId)
        {
            try
            {
                var unit = await _service.GetUnitByIdAsync(unitId);
                return Ok(unit);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("/UpdatePropertyUnit/{unitId}")]
        [Authorize]
        public async Task<IActionResult> UpdatePropertyUnit(int unitId, [FromBody] PropertyUnitDto dto)
        {
            try
            {
                var unit = await _service.UpdateUnitAsync(unitId, dto);
                return Ok(unit);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("/DeletePropertyUnit/{unitId}")]
        [Authorize]
        public async Task<IActionResult> DeletePropertyUnit(int unitId)
        {
            try
            {
                await _service.DeleteUnitAsync(unitId);
                return Ok("Unit deleted successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("/AssignTenantToUnit")]
        [Authorize]
        public async Task<IActionResult> AssignTenantToUnit([FromBody] AssignTenantToUnitDto dto)
        {
            try
            {
                var tenant = await _service.AssignTenantToUnitAsync(dto);
                return Ok(tenant);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("/RemoveTenantFromUnit/{tenantId}")]
        [Authorize]
        public async Task<IActionResult> RemoveTenantFromUnit(int tenantId)
        {
            try
            {
                var tenant = await _service.RemoveTenantFromUnitAsync(tenantId);
                return Ok(tenant);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
