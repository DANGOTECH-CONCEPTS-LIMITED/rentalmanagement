using Domain.Dtos.User;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Domain.Entities.PropertyMgt;
using Domain.Dtos.Meters;

namespace Application.Interfaces.UserServices
{
    public interface IUserService
    {
        Task RegisterUserAsync(IFormFile passportphoto,IFormFile idfront,IFormFile idback, UserDto user);
        Task<IEnumerable<User>> GetAllUsersAsync();
        Task<IEnumerable<SystemRole>> GetAllRolesAsync();
        Task ChangeUserPassword(ChangePasswordDto changePassword);
        Task<User> AuthenticateUser(AuthenticateDto authenticateDto);
        Task<User> RegisterUserMinusFiles(User user);
        Task<User> GetUserByIdAsync(int id);
        Task UpdateUser(IFormFile passportphoto, IFormFile idfront, IFormFile idback, User user);
        Task ForgotPassword(string email);

        Task DeleteUser(int id);
        Task<IEnumerable<User>> GetLandlordsAsync();
        Task AddUtilityMeter(UtilityMeterDto utilityMeter);
        Task<IEnumerable<UtilityMeter>> GetUtilityMetersByLandLordIdAsync(int landlordId);
        Task<IEnumerable<UtilityMeter>> GetAllUtilityMetersAsync();
        Task UpdateUtilityMeterAsync(UtilityMeterDto utilityMeter, int id);
        Task DeleteUtilityMeterAsync(int id);
    }
}
