using Domain.Dtos.User;
using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace Application.Interfaces.UserServices
{
    public interface IUserService
    {
        Task RegisterUserAsync(IFormFile passportphoto,IFormFile idfront,IFormFile idback, UserDto user);
        Task<IEnumerable<User>> GetAllUsersAsync();
        Task<IEnumerable<SystemRole>> GetAllRolesAsync();
        Task ChangeUserPassword(ChangePasswordDto changePassword);
    }
}
