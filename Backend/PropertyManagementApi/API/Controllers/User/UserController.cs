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

        [HttpGet("/GetCaretakersByLandLordId/{landlordId}")]
        [Authorize]
        public async Task<IActionResult> GetCaretakersByLandLordId(int landlordId)
        {
            try
            {
                var caretakers = await _userService.GetCaretakersByLandlordIdAsync(landlordId);
                return Ok(caretakers);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving caretakers for landlord {LandlordId}", landlordId);
                return BadRequest($"Error retrieving caretakers: {ex.Message}");
            }
        }

        [HttpPost("/AssignPropertiesToCaretaker")]
        [Authorize]
        public async Task<IActionResult> AssignPropertiesToCaretaker([FromBody] CaretakerPropertyAssignmentDto request)
        {
            try
            {
                var properties = await _userService.AssignPropertiesToCaretakerAsync(request);
                return Ok(properties);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error assigning properties to caretaker {CaretakerId}", request?.CaretakerId);
                return BadRequest($"Error assigning properties to caretaker: {ex.Message}");
            }
        }

        [HttpGet("/GetCaretakerProperties/{caretakerId}")]
        [Authorize]
        public async Task<IActionResult> GetCaretakerProperties(int caretakerId)
        {
            try
            {
                var properties = await _userService.GetCaretakerPropertiesAsync(caretakerId);
                return Ok(properties);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving properties for caretaker {CaretakerId}", caretakerId);
                return BadRequest($"Error retrieving caretaker properties: {ex.Message}");
            }
        }

        [HttpDelete("/RemovePropertyFromCaretaker/{caretakerId}/{propertyId}")]
        [Authorize]
        public async Task<IActionResult> RemovePropertyFromCaretaker(int caretakerId, int propertyId)
        {
            try
            {
                await _userService.RemovePropertyFromCaretakerAsync(caretakerId, propertyId);
                return Ok("Property removed from caretaker successfully.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing property {PropertyId} from caretaker {CaretakerId}", propertyId, caretakerId);
                return BadRequest($"Error removing property from caretaker: {ex.Message}");
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
        public async Task<IActionResult> RegisterUserMinusFiles([FromBody] User user, [FromQuery] int? landlordId = null)
        {
            try
            {
                if (landlordId.HasValue && !user.LandlordId.HasValue)
                    user.LandlordId = landlordId;
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
                // Ensure landlord exists
                var landlordExists = await _db.Users.AsNoTracking().AnyAsync(u => u.Id == landlordId);
                if (!landlordExists)
                    return NotFound("Landlord not found.");

                // Prepare status buckets as arrays (EF can translate .Contains on arrays to SQL IN)
                var successfulStatuses = new[] { "SUCCESSFUL", "SUCCESSFUL AT TELECOM", "SUCCESSFUL AT THE BANK", "SUCCESSFUL AT TELCOM" };
                var pendingStatuses = new[] { "PENDING", "PENDING AT TELCOM", "PENDING AT THE BANK" };
                var failedStatuses = new[] { "FAILED", "FAILED AT TELECOM", "FAILED AT THE BANK" };

                // Count distinct meters for landlord (non-empty meter numbers)
                var totalMeters = await _db.UtilityMeters
                    .AsNoTracking()
                    .Where(m => m.LandLordId == landlordId && !string.IsNullOrWhiteSpace(m.MeterNumber))
                    .Select(m => m.MeterNumber)
                    .Distinct()
                    .CountAsync();

                var landlordMetersQuery = _db.UtilityMeters.AsNoTracking()
                    .Where(m => m.LandLordId == landlordId);

                // Build a query of payments that belong to meters of this landlord.
                var paymentsQuery = _db.UtilityPayments.AsNoTracking()
                    .Where(p =>
                        !string.IsNullOrWhiteSpace(p.MeterNumber) ||
                        !string.IsNullOrWhiteSpace(p.UtilityAccountNumber))
                    .Where(p => landlordMetersQuery.Any(m =>
                        (!string.IsNullOrWhiteSpace(m.MeterNumber) &&
                            ((!string.IsNullOrWhiteSpace(p.MeterNumber) && m.MeterNumber.Trim() == p.MeterNumber.Trim()) ||
                             (!string.IsNullOrWhiteSpace(p.UtilityAccountNumber) && m.MeterNumber.Trim() == p.UtilityAccountNumber.Trim()))) ||
                        (!string.IsNullOrWhiteSpace(m.NWSCAccount) &&
                            ((!string.IsNullOrWhiteSpace(p.MeterNumber) && m.NWSCAccount.Trim() == p.MeterNumber.Trim()) ||
                             (!string.IsNullOrWhiteSpace(p.UtilityAccountNumber) && m.NWSCAccount.Trim() == p.UtilityAccountNumber.Trim())))))
                    .Select(p => new
                    {
                        MeterNumber = !string.IsNullOrWhiteSpace(p.MeterNumber) ? p.MeterNumber : p.UtilityAccountNumber ?? string.Empty,
                        p.Amount,
                        p.Charges,
                        p.Status,
                        p.CreatedAt
                    });

                var totalUtilityPayments = await paymentsQuery.CountAsync();
                var totalUtilityAmount = await paymentsQuery.Where(p => successfulStatuses.Contains(p.Status)).SumAsync(p => (decimal?)p.Amount) ?? 0m;
                var totalUtilityCharges = await paymentsQuery.Where(p => successfulStatuses.Contains(p.Status)).SumAsync(p => (decimal?)p.Charges) ?? 0m;

                var successfulPayments = await paymentsQuery.CountAsync(p => successfulStatuses.Contains(p.Status));
                var pendingPayments = await paymentsQuery.CountAsync(p => pendingStatuses.Contains(p.Status));
                var failedPayments = await paymentsQuery.CountAsync(p => failedStatuses.Contains(p.Status));

                DateTime? firstPaymentAt = null;
                DateTime? lastPaymentAt = null;
                if (totalUtilityPayments > 0)
                {
                    firstPaymentAt = await paymentsQuery.MinAsync(p => p.CreatedAt);
                    lastPaymentAt = await paymentsQuery.MaxAsync(p => p.CreatedAt);
                }

                var metersStats = await paymentsQuery
                    .GroupBy(p => p.MeterNumber)
                    .Where(g => g.Key != null && g.Key != string.Empty)
                    .Select(g => new MeterPaymentStatsDto
                    {
                        MeterNumber = g.Key,
                        Payments = g.Count(),
                        Amount = g.Sum(x => x.Amount),
                        LastPaymentAt = g.Max(x => (DateTime?)x.CreatedAt)
                    })
                    .OrderByDescending(x => x.Payments)
                    .ToListAsync();

                // Fetch landlord name and include in DTO
                var landlord = await _db.Users.AsNoTracking()
                    .Where(u => u.Id == landlordId)
                    .Select(u => new { u.Id, u.FullName })
                    .FirstOrDefaultAsync();

                var dto = new LandlordUtilityStatsDto
                {
                    LandlordId = landlordId,
                    LandlordName = landlord?.FullName ?? string.Empty,
                    TotalMeters = totalMeters,
                    ActiveMeters = metersStats.Count,
                    InactiveMeters = Math.Max(0, totalMeters - metersStats.Count),
                    TotalUtilityPayments = totalUtilityPayments,
                    TotalUtilityAmount = (double)totalUtilityAmount,
                    TotalUtilityCharges = (double)totalUtilityCharges,
                    SuccessfulPayments = successfulPayments,
                    PendingPayments = pendingPayments,
                    FailedPayments = failedPayments,
                    FirstPaymentAt = firstPaymentAt,
                    LastPaymentAt = lastPaymentAt,
                    Meters = metersStats
                };

                return Ok(dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving landlord utility stats for {LandlordId}", landlordId);
                return BadRequest("An error occurred while retrieving landlord statistics.");
            }
        }

        [HttpGet("/GetLandlordInvoiceSettings/{landlordId}")]
        [Authorize]
        public async Task<IActionResult> GetLandlordInvoiceSettings(int landlordId)
        {
            try
            {
                var landlord = await _db.Users
                    .AsNoTracking()
                    .Where(u => u.Id == landlordId)
                    .Select(u => new { u.Id, u.InvoiceGenerationDay, u.InvoiceDueDays })
                    .FirstOrDefaultAsync();

                if (landlord == null)
                    return NotFound("Landlord not found.");

                return Ok(new
                {
                    landlordId = landlord.Id,
                    generationDay = landlord.InvoiceGenerationDay ?? 1,
                    dueDays = landlord.InvoiceDueDays ?? 7
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving invoice settings for landlord {LandlordId}", landlordId);
                return BadRequest("An error occurred while retrieving invoice settings.");
            }
        }

        [HttpPut("/UpdateLandlordInvoiceSettings")]
        [Authorize]
        public async Task<IActionResult> UpdateLandlordInvoiceSettings([FromBody] LandlordInvoiceSettingsDto request)
        {
            try
            {
                if (request == null)
                    return BadRequest("Request is required.");

                if (request.GenerationDay < 1 || request.GenerationDay > 28)
                    return BadRequest("Generation day must be between 1 and 28.");

                if (request.DueDays < 1 || request.DueDays > 90)
                    return BadRequest("Due days must be between 1 and 90.");

                var landlord = await _db.Users.FirstOrDefaultAsync(u => u.Id == request.LandlordId);
                if (landlord == null)
                    return NotFound("Landlord not found.");

                landlord.InvoiceGenerationDay = request.GenerationDay;
                landlord.InvoiceDueDays = request.DueDays;
                _db.Users.Update(landlord);
                await _db.SaveChangesAsync();

                return Ok(new
                {
                    landlordId = landlord.Id,
                    generationDay = landlord.InvoiceGenerationDay,
                    dueDays = landlord.InvoiceDueDays
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating invoice settings for landlord {LandlordId}", request?.LandlordId);
                return BadRequest("An error occurred while updating invoice settings.");
            }
        }
    }
}
