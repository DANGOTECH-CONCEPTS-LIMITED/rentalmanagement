using Application.Interfaces.Settings;
using Domain.Dtos.HtpRequestsResponse;
using Domain.Entities.PropertyMgt;
using Infrastructure.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
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
        private readonly AppDbContext _context;
        public Settings(IConfiguration configuration,AppDbContext context)
        {
            _configuration = configuration;
            _context = context;
        }

        public async Task<IEnumerable<HttpRequesRequestResponse>> GetRequestResponseByDate(
        DateTime startDate,
        DateTime endDate)
        {
            // Normalize to whole-day bounds
            var start = startDate.Date;
            var end = endDate.Date.AddDays(1).AddTicks(-1);

            return await _context.HttpRequesRequestResponses
                .Where(x => x.CreatedAt >= start && x.CreatedAt <= end)
                .AsNoTracking()
                .ToListAsync()
                .ConfigureAwait(false);
        }


        public async Task LogHttpRequestResponse(HttpRequesRequestResponseDto dto)
        {
            //map dto to entity
            var entity = new HttpRequesRequestResponse
            {
                Request = dto.Request,
                Response = dto.Response,
                Status = dto.Status,
                ErrorMessage = dto.ErrorMessage,
                RequestType = dto.RequestType,
                RequestUrl = dto.RequestUrl
            };

            //save to database
            await _context.HttpRequesRequestResponses.AddAsync(entity);
            await _context.SaveChangesAsync();
        }

        public async Task<string> SaveFileAndReturnPathAsync(IFormFile file)
        {
            string uploadsDirectory = @"C:\propertymanagementfiles\uploads"; //"uploads/";//Path.Combine("uploads", file.FileName);//Path.Combine(Directory.GetCurrentDirectory(), "uploads");

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
