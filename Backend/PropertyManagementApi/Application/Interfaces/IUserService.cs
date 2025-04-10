using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces
{
    public interface IUserService
    {
        Task RegisterUserAsync(User user);
        Task<IEnumerable<User>> GetAllUsersAsync();
        Task<IEnumerable<SystemRole>> GetAllRolesAsync();
    }
}
