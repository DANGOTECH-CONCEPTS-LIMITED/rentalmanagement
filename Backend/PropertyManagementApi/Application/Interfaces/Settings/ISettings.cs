using Domain.Dtos.HtpRequestsResponse;
using Domain.Entities.PropertyMgt;
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
        Task LogHttpRequestResponse(HttpRequesRequestResponseDto dto);
        Task<IEnumerable<HttpRequesRequestResponse>> GetRequestResponseByDate(DateTime startdate, DateTime enddate);
    }
}
