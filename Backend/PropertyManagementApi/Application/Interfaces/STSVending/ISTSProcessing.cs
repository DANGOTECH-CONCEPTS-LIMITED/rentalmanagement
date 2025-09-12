using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces.STSVending
{
    public interface ISTSProcessing
    {
        public Task<string> ValidateSTSMeter(string meterno);
        public Task<string> GetVendingToken(string meterno, int amount);
    }
}
