using Application.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Domain.Entities;

namespace API.Controllers.UserControllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;
        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpPost("/RegisterUser")]
        public async Task<IActionResult> Register([FromBody] User user)
        {
            try
            {
                await _userService.RegisterUserAsync(user);
                return Ok("User registered successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest($"Error registering user: {ex.Message}");
            }            
        }

        [HttpGet("/GetAllUsers1")]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var users = await _userService.GetAllUsersAsync();
                return Ok(users);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving users: {ex.Message}");
            }
        }

        [HttpGet("/GetAllRoles")]
        public async Task<IActionResult> GetAllRoles()
        {
            try
            {
                var roles = await _userService.GetAllRolesAsync();
                return Ok(roles);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving roles: {ex.Message}");
            }
        }
    }
}
