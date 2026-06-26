using Domain.Dtos.User;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Application.Interfaces.UserServices;
using Infrastructure.Services.Email;
using Microsoft.AspNetCore.Http;
using Application.Interfaces.Settings;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Configuration;
using System.Security.Claims;
using System.Text;
using Domain.Entities.PropertyMgt;
using Domain.Dtos.Meters;
using System.IO;

namespace Infrastructure.Services.UserServices
{
    public class UserService : IUserService
    {
        private const string LandlordRoleName = "Landlord";
        private const string CaretakerRoleName = "Caretaker";

        private readonly IConfiguration _configuration;
        private readonly IPasswordHasher<User> _passwordHasher;
        private readonly EmailService _emailService;
        private readonly AppDbContext _context;
        private readonly ISettings _settings;

        public UserService(AppDbContext context, IPasswordHasher<User> passwordHasher,
            EmailService emailService, ISettings settings, IConfiguration configuration)
        {
            _context = context;
            _passwordHasher = passwordHasher;
            _emailService = emailService;
            _settings = settings;
            _configuration = configuration;
        }

        public async Task RegisterUserAsync(
    IFormFile passportPhoto,
    IFormFile idFront,
    IFormFile idBack,
    UserDto userDto)
        {
            // 1. Guard clauses
            if (passportPhoto is null) throw new ArgumentNullException(nameof(passportPhoto));
            if (idFront is null) throw new ArgumentNullException(nameof(idFront));
            if (idBack is null) throw new ArgumentNullException(nameof(idBack));
            if (userDto is null) throw new ArgumentNullException(nameof(userDto));

            // File validation
            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".pdf" };
            var maxFileSize = 5 * 1024 * 1024; // 5MB
            foreach (var file in new[] { passportPhoto, idFront, idBack })
            {
                if (file.Length > maxFileSize)
                    throw new ArgumentException($"File {file.FileName} exceeds maximum size of 5MB.");
                var extension = Path.GetExtension(file.FileName).ToLower();
                if (!allowedExtensions.Contains(extension))
                    throw new ArgumentException($"File {file.FileName} has invalid extension. Allowed: {string.Join(", ", allowedExtensions)}");
            }

            // 2. Duplicate‐email check
            if (await _context.Users.AnyAsync(u => u.Email == userDto.Email))
                throw new InvalidOperationException($"A user with email '{userDto.Email}' already exists.");

            // 3. Load the role
            var systemRole = await _context.SystemRoles
                .FirstOrDefaultAsync(r => r.Id == userDto.SystemRoleId)
                ?? throw new KeyNotFoundException($"SystemRoleId {userDto.SystemRoleId} not found.");

            var landlordId = await ResolveCaretakerLandlordIdAsync(systemRole.Name, userDto.LandlordId);

            // 4. Upload files in parallel (single‐arg overload)
            var passportTask = _settings.SaveFileAndReturnPathAsync(passportPhoto);
            var frontTask = _settings.SaveFileAndReturnPathAsync(idFront);
            var backTask = _settings.SaveFileAndReturnPathAsync(idBack);
            await Task.WhenAll(passportTask, frontTask, backTask);

            var passportPath = await passportTask;
            var idFrontPath = await frontTask;
            var idBackPath = await backTask;

            // 5. Create user & temp password
            var tempPassword = Guid.NewGuid().ToString("N")[..8];
            var user = new User
            {
                FullName = userDto.FullName,
                Email = userDto.Email,
                PhoneNumber = userDto.PhoneNumber,
                PassportPhoto = passportPath,
                IdFront = idFrontPath,
                IdBack = idBackPath,
                SystemRoleId = systemRole.Id,
                NationalIdNumber = userDto.NationalIdNumber,
                LandlordId = landlordId,
                PasswordChanged = false,
                Verified = false,
            };
            // Hash against the new user instance
            user.Password = _passwordHasher.HashPassword(user, tempPassword);

            // 6. Persist user (and wallet) in one transaction
            await using var tx = await _context.Database.BeginTransactionAsync();
            await _context.Users.AddAsync(user);
            await _context.SaveChangesAsync();

            // Only create wallet for specific roles (replace 2/4 with your constants or enum)
            if (systemRole.Id == 2 || systemRole.Id == 4)
            {
                var wallet = new Wallet
                {
                    LandlordId = user.Id,
                    Balance = 0m,
                    CreatedAt = DateTime.UtcNow
                };
                await _context.Wallets.AddAsync(wallet);
                await _context.SaveChangesAsync();
            }

            await tx.CommitAsync();

            // 7. Send welcome email
            var body = new StringBuilder()
                .AppendLine($"Hello {user.FullName},")
                .AppendLine()
                .AppendLine($"Welcome to Marple Properties as “{systemRole.Name}.”")
                .AppendLine()
                .AppendLine($"Username: {user.Email}")
                .AppendLine($"One-time password: {tempPassword}")
                .AppendLine()
                .AppendLine($"Link to access the system is : https://dangopay.dangotechconcepts.com/")
                .AppendLine()
                .AppendLine("Please change your password on first login.")
                .ToString();

            await _emailService.SendEmailAsync(user.Email, "Welcome to Marple Properties", body);
        }


        public async Task<IEnumerable<User>> GetAllUsersAsync()
        {
            // Use AsNoTracking for read-only queries to improve performance
            return await _context.Users
                .AsNoTracking()
                .Include(u => u.SystemRole)
                .Include(u => u.Landlord)
                .ToListAsync();
        }

        public async Task<IEnumerable<SystemRole>> GetAllRolesAsync()
        {
            // Roles are read-only in this flow; use AsNoTracking to improve perf
            return await _context.SystemRoles
                .AsNoTracking()
                .ToListAsync();
        }

        public async Task ChangeUserPassword(ChangePasswordDto changePassword)
        {
            // Validate user existence and current password
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == changePassword.UserName);
            if (user == null || _passwordHasher.VerifyHashedPassword(user, user.Password, changePassword.CurrentPassword) == PasswordVerificationResult.Failed)
                throw new Exception("Invalid username or current password.");

            //enforce new password policy to be minimum 8 characters
            if (changePassword.NewPassword.Length < 8)
                throw new Exception("New password must be at least 8 characters long.");

            // Update the password, mark as changed and verified
            user.Password = _passwordHasher.HashPassword(user, changePassword.NewPassword);
            user.PasswordChanged = true;
            user.Verified = true;
            user.Active = true;
            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            // Notify user via email about the password change
            var emailContent = $"Hello {user.FullName},\n\nYour password on Marple Properties has been changed successfully. " +
                               "If you did not initiate this change, please contact our support immediately.";
            await _emailService.SendEmailAsync(user.Email, "Password Change Notification", emailContent);
        }

        public async Task<User> AuthenticateUser(AuthenticateDto login)
        {
            // Validate user existence and password
            // Use AsNoTracking for read-only authentication query to reduce change-tracking overhead
            var user = await _context.Users
                .AsNoTracking()
                .Include(u => u.SystemRole) // Include SystemRole if needed
                .FirstOrDefaultAsync(u => u.Email == login.UserName);
            if (user == null || _passwordHasher.VerifyHashedPassword(user, user.Password, login.Password) == PasswordVerificationResult.Failed)
                throw new Exception("User not found or incorrect password.");

            //check user role is a tenant
            if (user.SystemRole.Name == "Tenant")
            {
                //get tenant with this user id
                var tenant = await _context.Tenants.FirstOrDefaultAsync(t => t.UserId == user.Id);
                if (tenant == null)
                    throw new Exception("User has a role of tenant but not registered in tenants");

                //assign userid as a tenant and carry over photo/name from tenant record
                user.Id = tenant.Id;
                if (!string.IsNullOrEmpty(tenant.PassportPhoto))
                    user.PassportPhoto = tenant.PassportPhoto;
                if (!string.IsNullOrEmpty(tenant.FullName))
                    user.FullName = tenant.FullName;
                if (!string.IsNullOrEmpty(tenant.PhoneNumber))
                    user.PhoneNumber = tenant.PhoneNumber;
            }

            // Retrieve JWT configuration settings
            var jwtSettings = _configuration.GetSection("JwtSettings");
            var secretKey = jwtSettings["SecretKey"];
            var issuer = jwtSettings["Issuer"];
            var audience = jwtSettings["Audience"];
            var expirationMinutes = int.Parse(jwtSettings["ExpiryMinutes"]);

            var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var signingCredentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

            // Create the claims to include in the token (expand as needed)
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Email),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim("role", user.SystemRole.Name),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            if (user.LandlordId.HasValue)
            {
                claims.Add(new Claim("landlord_id", user.LandlordId.Value.ToString()));
            }

            // Create the JWT token
            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(expirationMinutes),
                signingCredentials: signingCredentials
            );

            var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
            user.Token = tokenString; // Optionally set the token on your user object

            return user;
        }

        public async Task<User> RegisterUserMinusFiles(User user)
        {
            // Validate system role existence
            var systemRole = await _context.SystemRoles.FirstOrDefaultAsync(r => r.Id == user.SystemRoleId);
            if (systemRole == null)
                throw new Exception("System role not found.");

            user.LandlordId = await ResolveCaretakerLandlordIdAsync(systemRole.Name, user.LandlordId);

            // Check for duplicate user
            var existingUser = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Email == user.Email);
            if (existingUser != null)
                throw new Exception("User with this email already exists.");

            //generate a unique, temporary password
            var password = Guid.NewGuid().ToString("N").Substring(0, 8);

            // Hash the supplied password
            user.Password = _passwordHasher.HashPassword(user, password);
            user.PasswordChanged = false;
            user.Verified = false;
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Compose welcome email (note: ensure 'user.Password' is not sent in plaintext if already hashed)
            var emailContent = $"Hello {user.FullName},\n\nThank you for registering with Marple Properties. " +
                               $"You have been registered as {systemRole.Name} on our platform.\n\n" +
                               $"Username: {user.Email}\n Your password is {password}Please log in to change your password.";
            await _emailService.SendEmailAsync(user.Email, "Welcome to Marple Properties", emailContent);

            return user;
        }

        public async Task<User> GetUserByIdAsync(int id)
        {
            var user = await _context.Users
                .AsNoTracking()
                .Include(u => u.SystemRole)
                .Include(u => u.Landlord)
                .FirstOrDefaultAsync(u => u.Id == id);
            if (user == null)
                throw new Exception("User not found.");
            return user;
        }

        public async Task UpdateUser(
    IFormFile passportPhoto,
    IFormFile idFront,
    IFormFile idBack,
    User userDto)         // renamed to clarify this is incoming data, not the tracked entity
        {
            // 1. Load the tracked entity
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Id == userDto.Id);

            if (existingUser == null)
                throw new Exception("User not found.");

            var updatedRole = await _context.SystemRoles
                .AsNoTracking()
                .FirstOrDefaultAsync(r => r.Id == userDto.SystemRoleId)
                ?? throw new Exception("System role not found.");

            // 2. Map any simple properties you allow to be updated
            existingUser.FullName = userDto.FullName;
            existingUser.PhoneNumber = userDto.PhoneNumber;
            existingUser.NationalIdNumber = userDto.NationalIdNumber;
            existingUser.Active = userDto.Active;
            existingUser.Verified = userDto.Verified;
            existingUser.SystemRoleId = userDto.SystemRoleId; // Assuming this is allowed to be changed
            existingUser.LandlordId = await ResolveCaretakerLandlordIdAsync(updatedRole.Name, userDto.LandlordId);
            //existingUser.Email = userDto.Email; // Assuming this is allowed to be changed
            // (…and any other fields you want to let the caller change…)

            // 3. Handle file uploads on the tracked entity
            if (passportPhoto != null)
            {
                var path = await _settings.SaveFileAndReturnPathAsync(passportPhoto);
                existingUser.PassportPhoto = path;
            }
            if (idFront != null)
            {
                var path = await _settings.SaveFileAndReturnPathAsync(idFront);
                existingUser.IdFront = path;
            }
            if (idBack != null)
            {
                var path = await _settings.SaveFileAndReturnPathAsync(idBack);
                existingUser.IdBack = path;
            }

            // 4. Persist
            await _context.SaveChangesAsync();
        }


        public async Task DeleteUser(int id)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            if (user == null)
                throw new Exception("User not found.");
            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<User>> GetLandlordsAsync()
        {
            // Resolve the role id first to avoid joining SystemRoles for every user
            var landlordRoleId = await _context.SystemRoles
                .AsNoTracking()
                .Where(r => r.Name == LandlordRoleName)
                .Select(r => r.Id)
                .FirstOrDefaultAsync();

            if (landlordRoleId == 0)
            {
                return Enumerable.Empty<User>();
            }

            return await _context.Users
                .AsNoTracking()
                .Where(u => u.SystemRoleId == landlordRoleId)
                .Include(u => u.SystemRole)
                .ToListAsync();
        }

        public async Task<IEnumerable<User>> GetCaretakersByLandlordIdAsync(int landlordId)
        {
            await EnsureLandlordExistsAsync(landlordId);

            var caretakerRoleId = await _context.SystemRoles
                .AsNoTracking()
                .Where(r => r.Name == CaretakerRoleName)
                .Select(r => r.Id)
                .FirstOrDefaultAsync();

            if (caretakerRoleId == 0)
            {
                return [];
            }

            return await _context.Users
                .AsNoTracking()
                .Where(u => u.SystemRoleId == caretakerRoleId && u.LandlordId == landlordId)
                .Include(u => u.SystemRole)
                .Include(u => u.Landlord)
                .ToListAsync();
        }

        public async Task<IEnumerable<LandLordProperty>> AssignPropertiesToCaretakerAsync(CaretakerPropertyAssignmentDto assignment)
        {
            if (assignment == null)
                throw new ArgumentNullException(nameof(assignment));

            var propertyIds = assignment.PropertyIds
                .Where(id => id > 0)
                .Distinct()
                .ToList();

            if (!propertyIds.Any())
                throw new Exception("At least one property is required.");

            var caretaker = await GetCaretakerUserAsync(assignment.CaretakerId);
            if (!caretaker.LandlordId.HasValue)
                throw new Exception("Caretaker is not under a landlord.");

            var properties = await _context.LandLordProperties
                .AsNoTracking()
                .Where(p => propertyIds.Contains(p.Id))
                .ToListAsync();

            var missingPropertyIds = propertyIds.Except(properties.Select(p => p.Id)).ToList();
            if (missingPropertyIds.Any())
                throw new Exception($"Property not found: {string.Join(", ", missingPropertyIds)}.");

            var invalidPropertyIds = properties
                .Where(p => p.OwnerId != caretaker.LandlordId.Value)
                .Select(p => p.Id)
                .ToList();

            if (invalidPropertyIds.Any())
                throw new Exception($"Property does not belong to the caretaker's landlord: {string.Join(", ", invalidPropertyIds)}.");

            var existingPropertyIds = await _context.CaretakerPropertyAssignments
                .Where(a => a.CaretakerId == assignment.CaretakerId && propertyIds.Contains(a.PropertyId))
                .Select(a => a.PropertyId)
                .ToListAsync();

            foreach (var propertyId in propertyIds.Except(existingPropertyIds))
            {
                await _context.CaretakerPropertyAssignments.AddAsync(new CaretakerPropertyAssignment
                {
                    CaretakerId = assignment.CaretakerId,
                    PropertyId = propertyId,
                    AssignedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();
            return await GetCaretakerPropertiesAsync(assignment.CaretakerId);
        }

        public async Task<IEnumerable<LandLordProperty>> GetCaretakerPropertiesAsync(int caretakerId)
        {
            await GetCaretakerUserAsync(caretakerId);

            return await _context.LandLordProperties
                .AsNoTracking()
                .Where(p => _context.CaretakerPropertyAssignments
                    .Any(a => a.CaretakerId == caretakerId && a.PropertyId == p.Id))
                .Include(p => p.Owner)
                .ToListAsync();
        }

        public async Task RemovePropertyFromCaretakerAsync(int caretakerId, int propertyId)
        {
            await GetCaretakerUserAsync(caretakerId);

            var assignment = await _context.CaretakerPropertyAssignments
                .FirstOrDefaultAsync(a => a.CaretakerId == caretakerId && a.PropertyId == propertyId);

            if (assignment == null)
                throw new Exception("Property is not assigned to this caretaker.");

            _context.CaretakerPropertyAssignments.Remove(assignment);
            await _context.SaveChangesAsync();
        }

        private async Task<User> GetCaretakerUserAsync(int caretakerId)
        {
            var caretakerRoleId = await _context.SystemRoles
                .AsNoTracking()
                .Where(r => r.Name == CaretakerRoleName)
                .Select(r => r.Id)
                .FirstOrDefaultAsync();

            if (caretakerRoleId == 0)
                throw new Exception("Caretaker role not found.");

            var caretaker = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == caretakerId && u.SystemRoleId == caretakerRoleId);

            if (caretaker == null)
                throw new Exception("Caretaker not found.");

            return caretaker;
        }

        private async Task<int?> ResolveCaretakerLandlordIdAsync(string roleName, int? landlordId)
        {
            if (!string.Equals(roleName, CaretakerRoleName, StringComparison.OrdinalIgnoreCase))
            {
                return null;
            }

            if (!landlordId.HasValue || landlordId.Value <= 0)
            {
                throw new Exception("LandlordId is required for caretaker users.");
            }

            await EnsureLandlordExistsAsync(landlordId.Value);
            return landlordId.Value;
        }

        private async Task EnsureLandlordExistsAsync(int landlordId)
        {
            var landlordRoleId = await _context.SystemRoles
                .AsNoTracking()
                .Where(r => r.Name == LandlordRoleName)
                .Select(r => r.Id)
                .FirstOrDefaultAsync();

            if (landlordRoleId == 0)
            {
                throw new Exception("Landlord role not found.");
            }

            var landlordExists = await _context.Users
                .AsNoTracking()
                .AnyAsync(u => u.Id == landlordId && u.SystemRoleId == landlordRoleId);

            if (!landlordExists)
            {
                throw new Exception("Landlord not found.");
            }
        }

        public async Task ForgotPassword(string email)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
            if (user == null)
                throw new Exception("User not found.");
            // Generate a unique, temporary password
            var newPassword = Guid.NewGuid().ToString("N").Substring(0, 8);
            user.Password = _passwordHasher.HashPassword(user, newPassword);
            user.PasswordChanged = false;
            user.Verified = false;
            _context.Users.Update(user);
            await _context.SaveChangesAsync();
            // Compose and send password reset email
            var emailContent = $"Hello {user.FullName},\n\nYour password has been reset. " +
                               $"Your new password is: {newPassword}\n\n" +
                               "Please change your password on your first login.";
            await _emailService.SendEmailAsync(user.Email, "Password Reset", emailContent);
        }

        public Task AddUtilityMeter(UtilityMeterDto utilityMeter)
        {
            // Validate user existence
            var user = _context.Users.FirstOrDefault(u => u.Id == utilityMeter.LandLordId);
            if (user == null)
                throw new Exception("User not found.");
            // check whether the meter is supplied
            if (string.IsNullOrEmpty(utilityMeter.MeterNumber))
            {
                throw new Exception("Meter Number is not supplied");
            }
            // Map UtilityMeterDto to UtilityMeter entity
            var meter = new UtilityMeter
            {
                MeterNumber = utilityMeter.MeterNumber,
                MeterType = utilityMeter.MeterType,
                LandLordId = utilityMeter.LandLordId,
                NWSCAccount = utilityMeter.NwscAccount,
                LocationOfNwscMeter = utilityMeter.LocationOfNwscMeter,
            };
            _context.UtilityMeters.Add(meter);
            _context.SaveChanges();
            return Task.CompletedTask;
        }

        public async Task<IEnumerable<UtilityMeter>> GetUtilityMetersByLandLordIdAsync(int landlordId)
        {
            // Validate landlord existence
            var landlord = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == landlordId);
            if (landlord == null)
                throw new Exception("Landlord not found.");
            // Retrieve utility meters for the specified landlord
            return await _context.UtilityMeters
                .AsNoTracking()
                .Where(m => m.LandLordId == landlordId)
                .ToListAsync();
        }

        public async Task<IEnumerable<UtilityMeter>> GetAllUtilityMetersAsync()
        {
            // Validate utility meter existence
            var meters = await _context.UtilityMeters
                .AsNoTracking()
                .Include(m => m.User) // include landlord details
                .ToListAsync();

            return meters ?? [];
        }

        public async Task UpdateUtilityMeterAsync(UtilityMeterDto utilityMeter, int id)
        {
            // Validate utility meter existence
            var existingMeter = await _context.UtilityMeters.FirstOrDefaultAsync(m => m.Id == id);
            if (existingMeter == null)
                throw new Exception("Utility meter not found.");
            // Update properties
            existingMeter.MeterNumber = utilityMeter.MeterNumber;
            existingMeter.MeterType = utilityMeter.MeterType;
            existingMeter.NWSCAccount = utilityMeter.NwscAccount;
            existingMeter.LocationOfNwscMeter = utilityMeter.LocationOfNwscMeter;
            existingMeter.LandLordId = utilityMeter.LandLordId;
            // Save changes
            _context.UtilityMeters.Update(existingMeter);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteUtilityMeterAsync(int id)
        {
            // Validate utility meter existence
            var existingMeter = await _context.UtilityMeters.FirstOrDefaultAsync(m => m.Id == id);
            if (existingMeter == null)
                throw new Exception("Utility meter not found.");
            // Remove the utility meter
            _context.UtilityMeters.Remove(existingMeter);
            await _context.SaveChangesAsync();
        }

        public async Task<User> GetUserByUtilityMeter(string meter)
        {
            // Validate utility meter existence
            var utilityMeter = await _context.UtilityMeters
                .AsNoTracking()
                .Where(m => m.MeterNumber == meter)
                .Select(m => new UtilityMeter
                {
                    Id = m.Id,
                    MeterNumber = m.MeterNumber,
                    MeterType = m.MeterType,
                    LandLordId = m.LandLordId,
                    User = new User { Id = m.User.Id, FullName = m.User.FullName, Email = m.User.Email }
                })
                .FirstOrDefaultAsync();
            if (utilityMeter == null)
                throw new Exception("Utility meter not found.");
            // Return the associated user
            return utilityMeter.User;
        }
    }
}
