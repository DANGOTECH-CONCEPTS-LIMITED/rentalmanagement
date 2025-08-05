using Application.Interfaces.PrepaidApi;
using Application.Interfaces.Ussd;
using Domain.Dtos.PrepaidApi;
using Domain.Dtos.Ussd;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Services.Ussd
{
    public class UssdService : IUssdService
    {
        private readonly IPrepaidApiClient _prepaidApiClient;
        public UssdService(IPrepaidApiClient prepaidApiClient)
        {
            _prepaidApiClient = prepaidApiClient;
        }

        public async Task<string> ProcessUssdRequestAsync(UssdDto ussdDto)
        {
            var text = ussdDto.Text?.Trim() ?? "";
            var input = text.Split("*", StringSplitOptions.RemoveEmptyEntries);
            string response;

            switch (input.Length)
            {
                case 0:
                    response = "CON Welcome to DangoPay\n1. Make Payment\n2. Check Last Token";
                    break;

                case 1:
                    if (input[0] == "1")
                    {
                        response = "CON Enter Meter Number:";
                    }
                    else if (input[0] == "2")
                    {
                        response = "CON Enter Meter Number:";
                    }
                    else
                    {
                        response = "END Invalid option";
                    }
                    break;

                case 2:
                    if (input[0] == "1")
                    {
                        var meterNumber = input[1];
                        var customerSearchDto = new CustomerSearchDto
                        {
                            MeterNumber = meterNumber
                        };
                        // Replace with actual logic to retrieve meter name
                        string meterName = await _prepaidApiClient.SearchCustomerAsync(customerSearchDto);
                        if (string.IsNullOrEmpty(meterName))
                            response = "END Invalid meter number.";
                        else
                            response = $"CON {meterName}\n1. Confirm Payment\n2. Cancel";
                    }
                    else if (input[0] == "2")
                    {
                        var meterNumber = input[1];
                        // Replace with actual logic to retrieve last token
                        string lastToken = "";//GetLastToken(meterNumber);
                        response = $"END Last token: {lastToken}";
                    }
                    else
                    {
                        response = "END Invalid path.";
                    }
                    break;

                case 3:
                    if (input[0] == "1")
                    {
                        if (input[2] == "1")
                        {
                            // Simulate payment logic
                            response = "END Request sent successfully.";
                        }
                        else
                        {
                            response = "END Payment cancelled.";
                        }
                    }
                    else
                    {
                        response = "END Invalid input.";
                    }
                    break;

                default:
                    response = "END Invalid input.";
                    break;
            }
            return response;
        }
    }
}
