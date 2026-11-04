using Application.Interfaces.Ussd;
using Domain.Dtos.Ussd;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers.Ussd
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Administrator")]
    public class UssdMenuController : ControllerBase
    {
        private readonly IUssdMenuService _service;

        public UssdMenuController(IUssdMenuService service)
        {
            _service = service;
        }

        /// <summary>Returns the editable USSD menu tree for a menu code (default: waterpay).</summary>
        [HttpGet("/GetUssdMenu")]
        public async Task<IActionResult> Get(CancellationToken ct, [FromQuery] string menuCode = "waterpay")
        {
            try
            {
                var menu = await _service.GetMenuAsync(menuCode, ct);
                return menu == null ? NotFound(new { message = "Menu not found." }) : Ok(menu);
            }
            catch (Exception ex)
            {
                return HandleError(ex);
            }
        }

        [HttpGet("/ListUssdMenus")]
        public async Task<IActionResult> List(CancellationToken ct)
        {
            try
            {
                return Ok(await _service.ListMenusAsync(ct));
            }
            catch (Exception ex)
            {
                return HandleError(ex);
            }
        }

        [HttpPost("/CreateUssdMenu")]
        public async Task<IActionResult> Create([FromBody] CreateUssdMenuRequest request, CancellationToken ct)
        {
            try
            {
                return Ok(await _service.CreateMenuAsync(request.Code, request.Title, ct));
            }
            catch (Exception ex)
            {
                return HandleError(ex);
            }
        }

        /// <summary>Saves the edited USSD menu tree.</summary>
        [HttpPut("/SaveUssdMenu")]
        public async Task<IActionResult> Save([FromBody] UssdMenuDto menu, CancellationToken ct)
        {
            try
            {
                return Ok(await _service.SaveMenuAsync(menu, ct));
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
            _ => StatusCode(StatusCodes.Status500InternalServerError, new { message = "An unexpected error occurred." })
        };
    }
}
