using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Application.Interfaces.UserServices;
using Domain.Dtos.User;
using Microsoft.AspNetCore.Authorization;
using Domain.Entities.PropertyMgt;
using Domain.Dtos.Meters;
using Microsoft.Extensions.Logging;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers.UserControllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly ILogger<UserController> _logger;
        private readonly AppDbContext _db;
        public UserController(IUserService userService, ILogger<UserController> logger, AppDbContext db)
        {
            _userService = userService;
            _logger = logger;
            _db = db;
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

        [HttpGet("/GetLandlordUtilityCharge/{landlordId}")]
        [Authorize]
        public async Task<IActionResult> GetLandlordUtilityCharge(int landlordId)
        {
            try
            {
                var landlord = await _db.Users
                    .AsNoTracking()
                    .Where(u => u.Id == landlordId)
                    .Select(u => new
                    {
                        u.Id,
                        u.UtilityChargeType,
                        u.UtilityChargePercentage,
                        u.UtilityChargeFlatFee,
                        u.UtilityChargeTiersJson
                    })
                    .FirstOrDefaultAsync();

                if (landlord == null)
                {
                    return NotFound("Landlord not found.");
                }

                return Ok(new LandlordUtilityChargeDto
                {
                    LandlordId = landlord.Id,
                    ChargeType = string.IsNullOrWhiteSpace(landlord.UtilityChargeType) ? "Percentage" : landlord.UtilityChargeType,
                    ChargePercentage = landlord.UtilityChargePercentage ?? 10d,
                    FlatFee = landlord.UtilityChargeFlatFee,
                    Tiers = string.IsNullOrWhiteSpace(landlord.UtilityChargeTiersJson)
                        ? new List<LandlordUtilityChargeTierDto>()
                        : System.Text.Json.JsonSerializer.Deserialize<List<LandlordUtilityChargeTierDto>>(landlord.UtilityChargeTiersJson) ?? new List<LandlordUtilityChargeTierDto>()
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving utility charge for landlord {LandlordId}", landlordId);
                return BadRequest("An error occurred while retrieving the landlord utility charge.");
            }
        }

        [HttpPut("/ConfigureLandlordUtilityCharge")]
        [Authorize]
        public async Task<IActionResult> ConfigureLandlordUtilityCharge([FromBody] LandlordUtilityChargeDto request)
        {
            try
            {
                if (request == null)
                {
                    return BadRequest("Request is required.");
                }

                if (!IsValidUtilityChargeRequest(request, out var validationError))
                {
                    return BadRequest(validationError);
                }

                var landlord = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.LandlordId);
                if (landlord == null)
                {
                    return NotFound("Landlord not found.");
                }

                landlord.UtilityChargeType = request.ChargeType;
                landlord.UtilityChargePercentage = request.ChargeType.Equals("Percentage", StringComparison.OrdinalIgnoreCase)
                    ? request.ChargePercentage
                    : null;
                landlord.UtilityChargeFlatFee = request.ChargeType.Equals("FlatFee", StringComparison.OrdinalIgnoreCase)
                    ? request.FlatFee
                    : null;
                landlord.UtilityChargeTiersJson = request.ChargeType.Equals("Tiered", StringComparison.OrdinalIgnoreCase)
                    ? System.Text.Json.JsonSerializer.Serialize(request.Tiers)
                    : null;
                _db.Users.Update(landlord);
                await _db.SaveChangesAsync();

                return Ok(new LandlordUtilityChargeDto
                {
                    LandlordId = landlord.Id,
                    ChargeType = landlord.UtilityChargeType ?? "Percentage",
                    ChargePercentage = landlord.UtilityChargePercentage,
                    FlatFee = landlord.UtilityChargeFlatFee,
                    Tiers = string.IsNullOrWhiteSpace(landlord.UtilityChargeTiersJson)
                        ? new List<LandlordUtilityChargeTierDto>()
                        : System.Text.Json.JsonSerializer.Deserialize<List<LandlordUtilityChargeTierDto>>(landlord.UtilityChargeTiersJson) ?? new List<LandlordUtilityChargeTierDto>()
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error configuring utility charge for landlord {LandlordId}", request?.LandlordId);
                return BadRequest("An error occurred while configuring the landlord utility charge.");
            }
        }

        private static bool IsValidUtilityChargeRequest(LandlordUtilityChargeDto request, out string validationError)
        {
            validationError = string.Empty;
            var chargeType = request.ChargeType?.Trim();

            if (string.IsNullOrWhiteSpace(chargeType))
            {
                validationError = "Charge type is required.";
                return false;
            }

            if (chargeType.Equals("Percentage", StringComparison.OrdinalIgnoreCase))
            {
                if (!request.ChargePercentage.HasValue || request.ChargePercentage.Value < 0)
                {
                    validationError = "Charge percentage must be provided and cannot be negative.";
                    return false;
                }

                return true;
            }

            if (chargeType.Equals("FlatFee", StringComparison.OrdinalIgnoreCase))
            {
                if (!request.FlatFee.HasValue || request.FlatFee.Value < 0)
                {
                    validationError = "Flat fee must be provided and cannot be negative.";
                    return false;
                }

                return true;
            }

            if (chargeType.Equals("Tiered", StringComparison.OrdinalIgnoreCase))
            {
                if (request.Tiers == null || request.Tiers.Count == 0)
                {
                    validationError = "At least one tier must be provided for tiered charges.";
                    return false;
                }

                foreach (var tier in request.Tiers)
                {
                    if (tier.Charge < 0)
                    {
                        validationError = "Tier charge cannot be negative.";
                        return false;
                    }

                    if (tier.MaxAmount.HasValue && tier.MinAmount.GetValueOrDefault() > tier.MaxAmount.Value)
                    {
                        validationError = "Tier minimum amount cannot be greater than maximum amount.";
                        return false;
                    }
                }

                return true;
            }

            validationError = "Charge type must be Percentage, FlatFee, or Tiered.";
            return false;
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

        [HttpGet("/GetLandlordUtilityStats/{landlordId}")]
        //[Authorize]
        public async Task<IActionResult> GetLandlordUtilityStats(int landlordId)
        {
            try
            {
                var metersQuery = _db.UtilityMeters.AsNoTracking().Where(m => m.LandLordId == landlordId);
                var meters = await metersQuery.Select(m => new { m.MeterNumber }).ToListAsync();

                var meterNumbers = meters.Select(m => m.MeterNumber).Where(m => !string.IsNullOrWhiteSpace(m)).Distinct().ToList();

                var paymentsQuery = _db.UtilityPayments.AsNoTracking().Where(p => meterNumbers.Contains(p.MeterNumber));

                var payments = await paymentsQuery
                    .Select(p => new { p.MeterNumber, p.Amount, p.Charges, p.Status, p.CreatedAt })
                    .ToListAsync();

                var successfulStatuses = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                {
                    "SUCCESSFUL",
                    "SUCCESSFUL AT TELECOM",
                    "SUCCESSFUL AT THE BANK",
                    "SUCCESSFUL AT TELCOM"
                };

                var pendingStatuses = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                {
                    "PENDING",
                    "PENDING AT TELCOM",
                    "PENDING AT THE BANK"
                };

                var failedStatuses = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                {
                    "FAILED",
                    "FAILED AT TELECOM",
                    "FAILED AT THE BANK"
                };

                var dto = new LandlordUtilityStatsDto
                {
                    LandlordId = landlordId,
                    TotalMeters = meters.Count,
                    ActiveMeters = 0,
                    InactiveMeters = 0,
                    TotalUtilityPayments = payments.Count,
                    TotalUtilityAmount = payments.Where(p => p.Status != null && successfulStatuses.Contains(p.Status)).Sum(p => p.Amount),
                    TotalUtilityCharges = payments.Where(p => p.Status != null && successfulStatuses.Contains(p.Status)).Sum(p => p.Charges),
                    SuccessfulPayments = payments.Count(p => p.Status != null && successfulStatuses.Contains(p.Status)),
                    PendingPayments = payments.Count(p => p.Status != null && pendingStatuses.Contains(p.Status)),
                    FailedPayments = payments.Count(p => p.Status != null && failedStatuses.Contains(p.Status)),
                    FirstPaymentAt = payments.Count == 0 ? null : payments.Min(p => (DateTime?)p.CreatedAt),
                    LastPaymentAt = payments.Count == 0 ? null : payments.Max(p => (DateTime?)p.CreatedAt)
                };

                dto.Meters = payments
                    .GroupBy(p => p.MeterNumber ?? string.Empty)
                    .Where(g => !string.IsNullOrWhiteSpace(g.Key))
                    .Select(g => new MeterPaymentStatsDto
                    {
                        MeterNumber = g.Key,
                        Payments = g.Count(),
                        Amount = g.Sum(x => x.Amount),
                        //Charges = g.Sum(x => x.Charges),
                        LastPaymentAt = g.Max(x => (DateTime?)x.CreatedAt)
                    })
                    .OrderByDescending(x => x.Payments)
                    .ToList();

                return Ok(dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving landlord utility stats for {LandlordId}", landlordId);
                return BadRequest("An error occurred while retrieving landlord statistics.");
            }
        }
    }
}
