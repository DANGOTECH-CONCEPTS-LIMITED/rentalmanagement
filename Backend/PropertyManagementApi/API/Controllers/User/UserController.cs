using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Application.Interfaces.UserServices;
using Domain.Dtos.User;
using Microsoft.AspNetCore.Authorization;
using Domain.Entities.PropertyMgt;
using Domain.Dtos.Meters;
using Microsoft.Extensions.Logging;

namespace API.Controllers.UserControllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly ILogger<UserController> _logger;
        public UserController(IUserService userService, ILogger<UserController> logger)
        {
            _userService = userService;
            _logger = logger;
        }

        [HttpPost("/RegisterUser")]
        public async Task<IActionResult> Register([FromForm] List<IFormFile> files, [FromForm] UserDto user)
        {
            try
            {
                //check if files submited are three
                if (files == null || files.Count != 3)
                {
                    return BadRequest("Please submit three files: passport photo, ID front, and ID back.");
                }
                await _userService.RegisterUserAsync(files[0], files[1], files[2], user);
                return Ok("User registered successfully.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error registering user");
                return BadRequest("An error occurred while registering the user.");
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
                _logger.LogError(ex, "Error retrieving users");
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
                _logger.LogError(ex, "Error retrieving roles");
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
                _logger.LogError(ex, "Error changing password");
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
                _logger.LogError(ex, "Error authenticating user");
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
                _logger.LogError(ex, "Error retrieving user");
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
                if (files == null || files.Count != 3)
                {
                    return BadRequest("Please submit three files: passport photo, ID front, and ID back.");
                }
                await _userService.UpdateUser(files[0], files[1], files[2], user);
                return Ok("User updated successfully.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user");
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
                _logger.LogError(ex, "Error deleting user");
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
                _logger.LogError(ex, "Error retrieving landlords");
                return BadRequest($"Error retrieving landlords: {ex.Message}");
            }
        }

        [HttpPost("/ForgotPassword")]
        public async Task<IActionResult> ForgotPassword([FromBody] string email)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(email) || !IsValidEmail(email))
                {
                    return BadRequest("Invalid email address.");
                }
                await _userService.ForgotPassword(email);
                return Ok("Password reset link sent successfully.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error sending password reset for {Email}", email);
                return BadRequest("An error occurred while processing the request.");
            }
        }

        private bool IsValidEmail(string email)
        {
            try
            {
                var addr = new System.Net.Mail.MailAddress(email);
                return addr.Address == email;
            }
            catch
            {
                return false;
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
                _logger.LogError(ex, "Error registering user");
                return BadRequest("An error occurred while registering the user.");
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
                _logger.LogError(ex, "Error adding utility meter");
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
                _logger.LogError(ex, "Error retrieving utility meters");
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
                _logger.LogError(ex, "Error retrieving all utility meters");
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
                _logger.LogError(ex, "Error updating utility meter");
                return BadRequest($"Error updating utility meter: {ex.Message}");
            }
        }

        [HttpDelete("/DeleteUtilityMeter/{id}")]
        [Authorize]
        public async Task<IActionResult> DeleteUtilityMeter(int id)
        {
            try
            {
                await _userService.DeleteUtilityMeterAsync(id);
                return Ok("Utility meter deleted successfully.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting utility meter");
                return BadRequest($"Error deleting utility meter: {ex.Message}");
            }
        }
    }
}
