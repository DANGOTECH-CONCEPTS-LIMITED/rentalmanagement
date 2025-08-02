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

namespace Infrastructure.Services.UserServices
{
    public class UserService : IUserService
    {
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

        //public async Task RegisterUserAsync(IFormFile passportphoto, IFormFile idfront, IFormFile idback, UserDto userdto)
        //{
        //    // Validate file uploads
        //    if (passportphoto == null) throw new Exception("Passport photo is required.");
        //    if (idfront == null) throw new Exception("ID front is required.");
        //    if (idback == null) throw new Exception("ID back is required.");

        //    // Save files and retrieve paths
        //    var passportPhotoPath = await _settings.SaveFileAndReturnPathAsync(passportphoto);
        //    var idFrontPath = await _settings.SaveFileAndReturnPathAsync(idfront);
        //    var idBackPath = await _settings.SaveFileAndReturnPathAsync(idback);

        //    // Check for duplicate email
        //    var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == userdto.Email);
        //    if (existingUser != null)
        //        throw new Exception("User with this email already exists.");

        //    // Retrieve system role
        //    var systemRole = await _context.SystemRoles.FirstOrDefaultAsync(r => r.Id == userdto.SystemRoleId);
        //    if (systemRole == null)
        //        throw new Exception("System role not found.");

        //    // Generate a unique, temporary password
        //    var password = Guid.NewGuid().ToString("N").Substring(0, 8);

        //    // Map UserDto to User entity
        //    var user = new User
        //    {
        //        FullName = userdto.FullName,
        //        Email = userdto.Email,
        //        PhoneNumber = userdto.PhoneNumber,
        //        PassportPhoto = passportPhotoPath,
        //        IdFront = idFrontPath,
        //        IdBack = idBackPath,
        //        SystemRoleId = userdto.SystemRoleId,
        //        NationalIdNumber = userdto.NationalIdNumber,
        //        PasswordChanged = false,
        //        Verified = false,
        //    };

        //    // Hash and set password
        //    user.Password = _passwordHasher.HashPassword(user, password);

            
        //    _context.Users.Add(user);
        //    await _context.SaveChangesAsync();

        //    //check if user is a landlord or a Utility payment to create the wallet instantly
        //    if (systemRole.Id == 2 || systemRole.Id == 4)
        //    {
        //        var wallet = new Wallet
        //        {
        //            LandlordId = user.Id,
        //            Balance = 0,
        //            CreatedAt = DateTime.UtcNow
        //        };
        //        _context.Wallets.Add(wallet);
        //    }

        //    // Compose and send welcome email
        //    var emailContent = $"Hello {user.FullName},\n\nThank you for registering with Nyumba Yo. " +
        //                       $"You have been registered as {systemRole.Name} on our platform.\n\n" +
        //                       $"Username: {user.Email}\nOne-time password: {password}\n\n" +
        //                       "Please change your password on your first login.";
        //    await _emailService.SendEmailAsync(user.Email, "Welcome to Nyumba Yo", emailContent);
        //}

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

            // 2. Duplicate‐email check
            if (await _context.Users.AnyAsync(u => u.Email == userDto.Email))
                throw new InvalidOperationException($"A user with email '{userDto.Email}' already exists.");

            // 3. Load the role
            var systemRole = await _context.SystemRoles
                .FirstOrDefaultAsync(r => r.Id == userDto.SystemRoleId)
                ?? throw new KeyNotFoundException($"SystemRoleId {userDto.SystemRoleId} not found.");

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
                .AppendLine($"Welcome to Nyumba Yo as “{systemRole.Name}.”")
                .AppendLine()
                .AppendLine($"Username: {user.Email}")
                .AppendLine($"One-time password: {tempPassword}")
                .AppendLine()
                .AppendLine("Please change your password on first login.")
                .ToString();

            await _emailService.SendEmailAsync(user.Email, "Welcome to Nyumba Yo", body);
        }


        public async Task<IEnumerable<User>> GetAllUsersAsync()
        {
            return await _context.Users
                .Include(u => u.SystemRole)
                .ToListAsync();
        }

        public async Task<IEnumerable<SystemRole>> GetAllRolesAsync()
        {
            return await _context.SystemRoles.ToListAsync();
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
            var emailContent = $"Hello {user.FullName},\n\nYour password on Nyumba Yo has been changed successfully. " +
                               "If you did not initiate this change, please contact our support immediately.";
            await _emailService.SendEmailAsync(user.Email, "Password Change Notification", emailContent);
        }

        public async Task<User> AuthenticateUser(AuthenticateDto login)
        {
            // Validate user existence and password
            var user = await _context.Users
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

                //assign userid as a tenant
                user.Id = tenant.Id;
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
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

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

            // Check for duplicate user
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == user.Email);
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
            var emailContent = $"Hello {user.FullName},\n\nThank you for registering with Nyumba Yo. " +
                               $"You have been registered as {systemRole.Name} on our platform.\n\n" +
                               $"Username: {user.Email}\n Your password is {password}Please log in to change your password.";
            await _emailService.SendEmailAsync(user.Email, "Welcome to Nyumba Yo", emailContent);

            return user;
        }

        public async Task<User> GetUserByIdAsync(int id)
        {
            var user = await _context.Users
                .Include(u => u.SystemRole)
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

            // 2. Map any simple properties you allow to be updated
            existingUser.FullName = userDto.FullName;
            existingUser.PhoneNumber = userDto.PhoneNumber;
            existingUser.NationalIdNumber = userDto.NationalIdNumber;
            existingUser.Active = userDto.Active;
            existingUser.Verified = userDto.Verified;
            existingUser.SystemRoleId = userDto.SystemRoleId; // Assuming this is allowed to be changed
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
            return await _context.Users
                .Include(u => u.SystemRole)
                .Where(u => u.SystemRole.Name == "Landlord")
                .ToListAsync();
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
            var landlord = await _context.Users.FirstOrDefaultAsync(u => u.Id == landlordId);
            if (landlord == null)
                throw new Exception("Landlord not found.");
            // Retrieve utility meters for the specified landlord
            return await _context.UtilityMeters
                .Include(m => m.User) // Include the User navigation property if needed
                .Where(m => m.LandLordId == landlordId)
                .ToListAsync();
        }

        public async Task<IEnumerable<UtilityMeter>> GetAllUtilityMetersAsync()
        {
            // Validate utility meter existence
            var meter = await _context.UtilityMeters
                .Include(m => m.User)
                .ToListAsync();
            if (meter == null)
                throw new Exception("Utility meter not found.");
            // Return the found utility meter
            return meter;
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
    }
}
