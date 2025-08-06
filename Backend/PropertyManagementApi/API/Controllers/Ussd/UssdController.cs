using Application.Interfaces.Ussd;
using Domain.Dtos.Ussd;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Ussd
{
    [Route("api/[controller]")]
    [ApiController]
    public class UssdController : ControllerBase
    {
        private readonly IUssdService _ussdService;

        public UssdController(IUssdService ussdService)
        {
            _ussdService = ussdService;
        }

        [HttpPost("/ussd")]
        [Consumes("application/x-www-form-urlencoded")]
        public async Task<IActionResult> ProcessUssdRequest([FromForm] UssdDto ussdDto)
        {
            if (ussdDto == null || string.IsNullOrEmpty(ussdDto.Text))
            {
                return BadRequest("Invalid USSD request.");
            }
            try
            {
                var response = await _ussdService.ProcessUssdRequestAsync(ussdDto);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, $"Error processing USSD request: {ex.Message}");
            }
        }
    }
}
