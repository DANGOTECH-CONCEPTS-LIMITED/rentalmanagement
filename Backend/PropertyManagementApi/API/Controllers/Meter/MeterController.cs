using Infrastructure.Services.BackgroundServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Meter
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class MeterController : ControllerBase
    {
        private readonly MeterTokenGeneratorService _tokenGeneratorService;

        public MeterController(MeterTokenGeneratorService tokenGeneratorService)
        {
            _tokenGeneratorService = tokenGeneratorService;
        }

        [HttpPost("generate-tokens")]
        public async Task<IActionResult> GenerateTokens([FromBody] decimal amount)
        {
            if (amount <= 0)
            {
                return BadRequest("Amount must be greater than zero.");
            }

            try
            {
                // Trigger the background service
                await _tokenGeneratorService.GenerateTokensAsync(amount);
                return Ok("Token generation started for all meters.");
            }
            catch (Exception ex)
            {
                return BadRequest($"Error generating tokens: {ex.Message}");
            }
        }
    }
}