using Domain.Dtos.User;
using Domain.Entities;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Application.Interfaces.UserServices;
using Infrastructure.Services.Email;
using Microsoft.AspNetCore.Http;
using Application.Interfaces.Settings;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Configuration;
using System.Security.Claims;

namespace Infrastructure.Services.UserServices
{
    public class UserService : IUserService
    {
        private readonly IConfiguration _configuration;
        private readonly IPasswordHasher<User> _passwordHasher;
        private readonly EmailService _emailService;
        private readonly AppDbContext _context;
        private readonly ISettings _settings;

        public UserService(AppDbContext context, IPasswordHasher<User> passwordHasher, EmailService emailService, ISettings settings, IConfiguration configuration)
        {
            _context = context;
            _passwordHasher = passwordHasher;
            _emailService = emailService;
            _settings = settings;
            _configuration = configuration;
        }

        public async Task RegisterUserAsync(IFormFile passportphoto,IFormFile idfront,IFormFile idback,UserDto userdto)
        {
            // Check if the files have been uploaded
            if (passportphoto == null)
                throw new Exception("Passport photo is required.");
            if (idfront == null)
                throw new Exception("ID front is required.");
            if (idback == null)
                throw new Exception("ID back is required.");

            // save file
            string passportPhotoPath = await _settings.SaveFileAndReturnPathAsync(passportphoto);
            string idFrontPath = await _settings.SaveFileAndReturnPathAsync(idfront);
            string idBackPath = await _settings.SaveFileAndReturnPathAsync(idback);

            // Check if the email already exists
            var existingUser = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == userdto.Email);
            if (existingUser == null)
                throw new Exception("User with this email already exists.");

            // get the system role
            var systemRole = await _context.SystemRoles
                .FirstOrDefaultAsync(r => r.Id == userdto.SystemRoleId);

            if (systemRole == null)
                throw new Exception("System role not found.");

            //generate a unique password
            var password = Guid.NewGuid().ToString().Substring(0, 8);

            // Map UserDto to User entity
            var user = new User
            {
                FullName = userdto.FullName,
                Email = userdto.Email,
                PhoneNumber = userdto.PhoneNumber,
                PassportPhoto = passportPhotoPath,
                IdFront = idFrontPath,
                IdBack = idBackPath,
                SystemRoleId = userdto.SystemRoleId,
                PasswordChanged = false,
                Verified = false,
                NationalIdNumber = userdto.NationalIdNumber
            };

            // Hash the password
            var hashedPassword = _passwordHasher.HashPassword(user, password);
            user.Password = hashedPassword;
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            // Send email with the password
            var emailContent = $"Hello {user.FullName}. Thank you for" +
                $"registering to Nyumba Yo. You have been registered as {systemRole.Name} on the platform Your one time password is: {password}. Please endevear to change it on your first time login";
            await _emailService.SendEmailAsync(user.Email, "Welcome to Nyumba Yo", emailContent);
        }

        public async Task<IEnumerable<User>> GetAllUsersAsync()
        {
            return await _context.Users.ToListAsync();
        }

        public async Task<IEnumerable<SystemRole>> GetAllRolesAsync()
        {
            return await _context.SystemRoles.ToListAsync();
        }

        public async Task ChangeUserPassword(ChangePasswordDto changePassword) 
        {
            // Check if the user exists
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == changePassword.UserName);
            if (user == null || _passwordHasher.VerifyHashedPassword(user, user.Password, changePassword.CurrentPassword) == PasswordVerificationResult.Failed)
                throw new Exception("User not found.");
            // Hash the new password
            var hashedPassword = _passwordHasher.HashPassword(user, changePassword.NewPassword);
            user.Password = hashedPassword;
            user.PasswordChanged = true;
            user.Verified = true;
            // Save changes to the database
            _context.Users.Update(user);
            await _context.SaveChangesAsync();

            // Send email notifying them of successful change of password
            var emailContent = $"Hello {user.FullName}. Your password has been changed successfully on Nyumba Yo. If you did not make this change, please contact support.";
            await _emailService.SendEmailAsync(user.Email, "Password Change Notification", emailContent);
        }

        public async Task<User> AuthenticateUser(AuthenticateDto login) 
        {
            // Check if the user exists
            var user = await _context.Users
                .FirstOrDefaultAsync(u => u.Email == login.UserName);
            if (user == null || _passwordHasher.VerifyHashedPassword(user, user.Password, login.Password) == PasswordVerificationResult.Failed)
                throw new Exception("User not found.");
            // Check if the password is correct
            if (user.Password != login.Password)
                throw new Exception("Invalid password.");

            // generate token for the user that he will use to access other endpoints
            //generate JWT token
            var jwtsettings = _configuration.GetSection("JwtSettings");
            var secretKey = jwtsettings["SecretKey"];
            var issuer = jwtsettings["Issuer"];
            var audience = jwtsettings["Audience"];
            var expirationminutes = int.Parse(jwtsettings["ExpiryMinutes"]);

            var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
            var signcredentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes("2387jkasdasd8232knsodjas9d023j23oadasodPASD23O2LASDP2O3KLKASMDPO23E2MASDIOWSDFSDFSDSDLKFSDKLFSDNFNASDIO2");

            // Create claims – add any additional claims if required
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Email),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            // Create the JWT security token
            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(expirationminutes),
                signingCredentials: signcredentials
            );

            var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
            user.Token = tokenString;
            return user;
        }
    }
}
