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

namespace Infrastructure.Services.UserServices
{
    public class UserService : IUserService
    {
        private readonly IPasswordHasher<User> _passwordHasher;
        private readonly AppDbContext _context;

        public UserService(AppDbContext context, IPasswordHasher<User> passwordHasher)
        {
            _context = context;
            _passwordHasher = passwordHasher;
        }

        public async Task RegisterUserAsync(UserDto userdto)
        {
            //generate a unique password
            var password = Guid.NewGuid().ToString().Substring(0, 8);


            // Map UserDto to User entity

            var user = new User
            {
                FullName = userdto.FullName,
                Email = userdto.Email,
                PhoneNumber = userdto.PhoneNumber,
                Password = userdto.Password, // Consider hashing the password before saving
                Active = userdto.Active,
                PassportPhoto = userdto.PassportPhoto,
                IdFront = userdto.IdFront,
                IdBack = userdto.IdBack,
                SystemRoleId = userdto.SystemRoleId
            };

            // Hash the password
            var hashedPassword = _passwordHasher.HashPassword(user, password);
            user.Password = hashedPassword;
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<User>> GetAllUsersAsync()
        {
            return await _context.Users.ToListAsync();
        }

        public async Task<IEnumerable<SystemRole>> GetAllRolesAsync()
        {
            return await _context.SystemRoles.ToListAsync();
        }
    }
}
