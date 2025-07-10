using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Application.Interfaces.UserServices;
using Domain.Dtos.User;
using Microsoft.AspNetCore.Authorization;
using Domain.Entities.PropertyMgt;
using Domain.Dtos.Meters;

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
        public async Task<IActionResult> Register([FromForm] List<IFormFile> files, [FromForm] UserDto user)
        {
            try
            {
                //check if files submited are three
                if (files.Count != 3)
                {
                    return BadRequest("Please submit three files: passport photo, ID front, and ID back.");
                }
                await _userService.RegisterUserAsync(files[0], files[1], files[2], user);
                return Ok("User registered successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest($"Error registering user: {ex.Message}");
            }
        }

        [HttpGet("/GetAllUsers")]
        [Authorize]
        public async Task<IActionResult> GetAllUsers()
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

        [HttpGet("/GetUserById/{id}")]
        [Authorize]
        public async Task<IActionResult> GetUserById(int id)
        {
            try
            {
                var user = await _userService.GetUserByIdAsync(id);
                return Ok(user);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving user: {ex.Message}");
            }
        }

        [HttpPut("/UpdateUser")]
        [Authorize]
        public async Task<IActionResult> UpdateUser([FromForm] List<IFormFile> files, [FromForm] User user)
        {
            try
            {
                //check if files submited are three
                if (files.Count != 3)
                {
                    return BadRequest("Please submit three files: passport photo, ID front, and ID back.");
                }
                await _userService.UpdateUser(files[0], files[1], files[2], user);
                return Ok("User updated successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest($"Error updating user: {ex.Message}");
            }
        }

        [HttpDelete("/DeleteUser/{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteUser(int id)
        {
            try
            {
                await _userService.DeleteUser(id);
                return Ok("User deleted successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest($"Error deleting user: {ex.Message}");
            }
        }

        [HttpGet("/GetLandlords")]
        [Authorize]
        public async Task<IActionResult> GetLandlords()
        {
            try
            {
                var landlords = await _userService.GetLandlordsAsync();
                return Ok(landlords);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving landlords: {ex.Message}");
            }
        }

        [HttpPost("/ForgotPassword")]
        public async Task<IActionResult> ForgotPassword([FromBody] string email)
        {
            try
            {
                await _userService.ForgotPassword(email);
                return Ok("Password reset link sent successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest($"Error sending password reset link: {ex.Message}");
            }
        }

        [HttpPost("/RegisterUserMinusFiles")]
        public async Task<IActionResult> RegisterUserMinusFiles([FromBody] User user)
        {
            try
            {
                await _userService.RegisterUserMinusFiles(user);
                return Ok("User registered successfully without files.");
            }
            catch (Exception ex)
            {
                return BadRequest($"Error registering user: {ex.Message}");
            }
        }

        [HttpPost("/AddUtilityMeter")]
        [Authorize]
        public async Task<IActionResult> AddUtilityMeter([FromBody] UtilityMeterDto utilityMeterDto)
        {
            try
            {
                await _userService.AddUtilityMeter(utilityMeterDto);
                return Ok("Utility meter added successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest($"Error adding utility meter: {ex.Message}");
            }
        }

        [HttpGet("/GetUtilityMetersByLandLordId/{landlordId}")]
        [Authorize]
        public async Task<IActionResult> GetUtilityMetersByLandLordId(int landlordId)
        {
            try
            {
                var utilityMeters = await _userService.GetUtilityMetersByLandLordIdAsync(landlordId);
                return Ok(utilityMeters);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving utility meters: {ex.Message}");
            }
        }

        [HttpGet("/GetAllUtilityMeters")]
        [Authorize]
        public async Task<IActionResult> GetAllUtilityMeters()
        {
            try
            {
                var utilityMeters = await _userService.GetAllUtilityMetersAsync();
                return Ok(utilityMeters);
            }
            catch (Exception ex)
            {
                return BadRequest($"Error retrieving all utility meters: {ex.Message}");
            }
        }

        [HttpPut("/UpdateUtilityMeter/{id}")]
        [Authorize]
        public async Task<IActionResult> UpdateUtilityMeter([FromBody] UtilityMeterDto utilityMeterDto, int id)
        {
            try
            {
                await _userService.UpdateUtilityMeterAsync(utilityMeterDto, id);
                return Ok("Utility meter updated successfully.");
            }
            catch (Exception ex)
            {
                return BadRequest($"Error updating utility meter: {ex.Message}");
            }
        }
    }
}
