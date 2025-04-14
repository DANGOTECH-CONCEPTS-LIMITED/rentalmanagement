using Domain.Dtos.User;
using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces.UserServices
{
    public interface IUserService
    {
        Task RegisterUserAsync(UserDto user);
        Task<IEnumerable<User>> GetAllUsersAsync();
        Task<IEnumerable<SystemRole>> GetAllRolesAsync();
    }
}
