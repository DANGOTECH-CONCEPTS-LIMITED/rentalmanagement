using System;

namespace Domain.Dtos.Property
{
    public class RentalContractDto
    {
        public int TenantId { get; set; }
        public int PropertyId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public decimal RentAmount { get; set; }
        public decimal Deposit { get; set; }
        public string Status { get; set; } = "PENDING";
    }
}
