using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces.Settings
{
    public interface ISettings
    {
        Task<string> SaveFileAndReturnPathAsync(IFormFile file);
    }
}
