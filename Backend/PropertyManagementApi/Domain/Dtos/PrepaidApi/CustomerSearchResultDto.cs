using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.PrepaidApi
{
    public class CustomerSearchResultDto
    {
        int result_code { get; set; }
        public Result result { get; set; } = new Result();
    }

    public class Result 
    {
        public string customer_number { get; set; } = string.Empty;
        public string customer_name { get; set; } = string.Empty;
        public string meter_number { get; set; } = string.Empty;
        public string reason { get; set; } = string.Empty;
    }
}
