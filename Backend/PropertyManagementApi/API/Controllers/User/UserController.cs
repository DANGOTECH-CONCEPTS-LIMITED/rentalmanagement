using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Domain.Entities;
using Application.Interfaces.UserServices;
using Domain.Dtos.User;
using Microsoft.AspNetCore.Authorization;

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
        public async Task<IActionResult> Register([FromForm] List<IFormFile> files,[FromForm] UserDto user)
        {
            try
            {
                await _userService.RegisterUserAsync(files[0], files[1], files[2],user);
                return Ok("User registered successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest($"Error registering user: {ex.Message}");
            }            
        }

        [HttpGet("/GetAllUsers")]
        [Authorize]
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
        [Authorize]
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

        [HttpPost("/ChangePassword")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto changePassword)
        {
            try
            {
                await _userService.ChangeUserPassword(changePassword);
                return Ok("Password changed successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest($"Error changing password: {ex.Message}");
            }
        }

        [HttpPost("/AuthenticateUser")]
        public async Task<IActionResult> Authenticate([FromBody] AuthenticateDto authenticateDto)
        {
            try
            {
                var user = await _userService.AuthenticateUser(authenticateDto);
                return Ok(user);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error authenticating user: {ex.Message}");
            }
        }
    }
}
