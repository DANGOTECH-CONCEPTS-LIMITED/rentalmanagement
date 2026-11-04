namespace Domain.Dtos.Tenant
{
    public class ArrearsPaymentPlanDto
    {
        public int TenantId { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal InstallmentAmount { get; set; }
        public int TotalInstallments { get; set; }
    }
}
