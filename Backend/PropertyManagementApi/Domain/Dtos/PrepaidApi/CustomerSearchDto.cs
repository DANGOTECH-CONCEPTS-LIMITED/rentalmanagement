﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Sockets;
using System.Text;
using System.Threading.Tasks;

namespace Domain.Dtos.PrepaidApi
{
    public class CustomerSearchDto
    {
        public string MeterNumber { get; set; } = string.Empty;
    }
}
