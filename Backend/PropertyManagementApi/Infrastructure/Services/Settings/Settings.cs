using Application.Interfaces.Settings;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Services.Settings
{
    public class Settings : ISettings
    {
        private readonly IConfiguration _configuration;
        public Settings(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task<string> SaveFileAndReturnPathAsync(IFormFile file)
        {
            string uploadsDirectory = "uploads/";//Path.Combine("uploads", file.FileName);//Path.Combine(Directory.GetCurrentDirectory(), "uploads");

            // Check whether directory exists and create if it doesn't
            if (!Directory.Exists(uploadsDirectory))
            {
                Directory.CreateDirectory(uploadsDirectory);
            }

            string filename = Guid.NewGuid() + Path.GetExtension(file.FileName);
            string filepath = Path.Combine(uploadsDirectory, filename);

            using (var stream = new FileStream(filepath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            // Access the base URL from appsettings.json
            //string baseUrl = _configuration["BaseUrl"]; // Use indexer instead of GetValue

            string fileUrl = filepath;//$"{baseUrl}/files/{filename}";

            return fileUrl;
        }
    }
}
