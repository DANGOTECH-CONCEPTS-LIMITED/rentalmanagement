using Application.Interfaces.Property;
using Domain.Dtos.Property;
using Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Property
{
    [Route("api/[controller]")]
    [ApiController]
    public class PropertyController : ControllerBase
    {
        private readonly ILandlordPropertyService _landlordPropertyService;

        public PropertyController(ILandlordPropertyService landlordPropertyService)
        {
            _landlordPropertyService = landlordPropertyService;
        }

        [HttpGet("/GetAllProperties")]
        public IActionResult GetAllProperties()
        {
            try
            {
                var properties = _landlordPropertyService.GetAllPropertiesAsync();
                return Ok(properties);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving properties: {ex.Message}");
            }
        }

        [HttpGet("/GetPropertyById/{id}")]
        public IActionResult GetPropertyById(int id)
        {
            try
            {
                var property = _landlordPropertyService.GetPropertyByIdAsync(id);
                return Ok(property);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving property: {ex.Message}");
            }
        }

        [HttpGet("/GetPropertiesByLandLordId/{landlordId}")]
        public IActionResult GetPropertiesByLandLordId(int landlordId)
        {
            try
            {
                var properties = _landlordPropertyService.GetPropertiesByLandLordIdAsync(landlordId);
                return Ok(properties);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving properties: {ex.Message}");
            }
        }

        [HttpPost("/AddProperty")]
        public async Task<IActionResult> AddProperty([FromForm] IFormFile image, [FromForm] PropertyDto property)
        {
            try
            {
                await _landlordPropertyService.AddPropertyAsync(image, property);
                return Ok("Property added successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest($"Error adding property: {ex.Message}");
            }
        }

        [HttpPut("/UpdateProperty")]
        public async Task<IActionResult> UpdateProperty([FromForm] IFormFile image, [FromForm] LandLordProperty property)
        {
            try
            {
                await _landlordPropertyService.UpdatePropertyAsync(image, property);
                return Ok("Property updated successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest($"Error updating property: {ex.Message}");
            }
        }

        [HttpDelete("/DeleteProperty/{id}")]
        public async Task<IActionResult> DeleteProperty(int id)
        {
            try
            {
                await _landlordPropertyService.DeletePropertyAsync(id);
                return Ok("Property deleted successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest($"Error deleting property: {ex.Message}");
            }
        }

        [HttpGet("/GetPropertyByLandLordId/{landlordId}")]
        public async Task<IActionResult> GetPropertyByLandLordId(int landlordId)
        {
            try
            {
                var properties = await _landlordPropertyService.GetPropertiesByLandLordIdAsync(landlordId);
                return Ok(properties);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving properties: {ex.Message}");
            }
        }
    }

}
