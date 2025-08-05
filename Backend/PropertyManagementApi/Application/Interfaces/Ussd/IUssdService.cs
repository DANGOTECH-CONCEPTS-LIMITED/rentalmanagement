using Domain.Dtos.Ussd;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces.Ussd
{
    public interface IUssdService
    {
        public Task<string> ProcessUssdRequestAsync(UssdDto ussdDto);
    }
}
