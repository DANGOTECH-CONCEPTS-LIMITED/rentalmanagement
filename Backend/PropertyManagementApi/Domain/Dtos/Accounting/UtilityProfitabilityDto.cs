using System;
using System.Collections.Generic;
using Domain.Entities.USSD;

namespace Domain.Dtos.Accounting
{
    public class UssdSessionChargePage
    {
        public List<UssdSessionCharge> Items { get; set; } = new();
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int Total { get; set; }
        public bool HasMore { get; set; }
        public decimal TotalCharge { get; set; }
    }

    public class MeterProfitabilityRowDto
    {
        public string MeterNumber { get; set; } = string.Empty;
        public decimal GrossCollected { get; set; }
        public decimal Commission { get; set; }
        public decimal BankFee { get; set; }
        public decimal SmsFee { get; set; }
        public decimal Net { get; set; }
        public int TokenCount { get; set; }
    }

    public class UtilityProfitabilityReportDto
    {
        public DateTime From { get; set; }
        public DateTime To { get; set; }
        public decimal GrossCollected { get; set; }
        public decimal CommissionIncome { get; set; }
        public decimal BankFee { get; set; }
        public decimal SmsFee { get; set; }
        public decimal UssdFee { get; set; }
        public decimal Net { get; set; }
        public int TokenCount { get; set; }
        public int UssdSessionCount { get; set; }
        public List<MeterProfitabilityRowDto> Meters { get; set; } = new();
    }
}
