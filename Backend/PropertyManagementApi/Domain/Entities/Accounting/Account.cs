using Domain.Enums.Accounting;

namespace Domain.Entities.Accounting
{
    public class Account
    {
        public int Id { get; set; }
        public string Code { get; set; } = string.Empty;   // e.g. 1000
        public string Name { get; set; } = string.Empty;   // e.g. Cash
        public AccountType Type { get; set; }
        public bool IsActive { get; set; } = true;
    }
}