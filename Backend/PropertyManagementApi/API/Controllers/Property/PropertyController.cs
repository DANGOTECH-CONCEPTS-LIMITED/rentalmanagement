using Application.Interfaces.Property;
using Domain.Dtos.Property;
using Domain.Entities.PropertyMgt;
using Microsoft.AspNetCore.Authorization;
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
        [Authorize]
        public async Task<IActionResult> GetAllProperties()
        {
            try
            {
                var properties = await _landlordPropertyService.GetAllPropertiesAsync();
                return Ok(properties);
            }
            catch (Exception ex)
            {
                return HandleError(ex);
            }
        }

        [HttpGet("/GetPropertyById/{id}")]
        [Authorize]
        public async Task<IActionResult> GetPropertyById(int id)
        {
            try
            {
                var property = await _landlordPropertyService.GetPropertyByIdAsync(id);
                return Ok(property);
            }
            catch (Exception ex)
            {
                return HandleError(ex);
            }
        }

        [HttpGet("/GetPropertiesByLandLordId/{landlordId}")]
        [Authorize]
        public async Task<IActionResult> GetPropertiesByLandLordId(int landlordId)
        {
            try
            {
                var properties = await _landlordPropertyService.GetPropertiesByLandLordIdAsync(landlordId);
                return Ok(properties);
            }
            catch (Exception ex)
            {
                return HandleError(ex);
            }
        }

        [HttpPost("/AddProperty")]
        [Authorize]
        public async Task<IActionResult> AddProperty([FromForm]List<IFormFile> files, [FromForm] PropertyDto property)
        {
            if (property == null)
                return BadRequest(new { message = "Property data is required." });
            if (files == null || files.Count == 0)
                return BadRequest(new { message = "A property image is required." });
            try
            {
                await _landlordPropertyService.AddPropertyAsync(files[0], property);
                return Ok("Property added successfully.");
            }
            catch (Exception ex)
            {
                return HandleError(ex);
            }
        }

        [HttpPut("/UpdateProperty")]
        [Authorize]
        public async Task<IActionResult> UpdateProperty([FromForm] List<IFormFile> files, [FromForm] LandLordProperty property)
        {
            if (property == null)
                return BadRequest(new { message = "Property data is required." });
            try
            {
                var image = files is { Count: > 0 } ? files[0] : null;
                await _landlordPropertyService.UpdatePropertyAsync(image, property);
                return Ok("Property updated successfully.");
            }
            catch (Exception ex)
            {
                return HandleError(ex);
            }
        }

        [HttpDelete("/DeleteProperty/{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteProperty(int id)
        {
            try
            {
                await _landlordPropertyService.DeletePropertyAsync(id);
                return Ok("Property deleted successfully.");
            }
            catch (Exception ex)
            {
                return HandleError(ex);
            }
        }

        [HttpGet("/GetPropertyByLandLordId/{landlordId}")]
        [Authorize]
        public async Task<IActionResult> GetPropertyByLandLordId(int landlordId)
        {
            try
            {
                var properties = await _landlordPropertyService.GetPropertiesByLandLordIdAsync(landlordId);
                return Ok(properties);
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
