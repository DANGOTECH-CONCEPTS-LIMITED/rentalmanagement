using Application.Interfaces.Settings;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Settings
{
    [Route("api/[controller]")]
    [ApiController]
    public class SettingsController : ControllerBase
    {
        private readonly ISettings _settings;

        public SettingsController(ISettings settings)
        {
            _settings = settings;
        }

        [HttpGet("/GetRequestResponseByDate")]
        public async Task<IActionResult> GetRequestResponseByDate([FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
        {
            try
            {
                var logs = await _settings.GetRequestResponseByDate(startDate, endDate);
                return Ok(logs);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "An error occurred while retrieving the logs.", error = ex.Message });
            }
        }
    }
}
