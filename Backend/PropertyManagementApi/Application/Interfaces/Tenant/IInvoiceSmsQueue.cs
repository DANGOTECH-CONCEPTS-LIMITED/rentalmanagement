namespace Application.Interfaces.Tenant;

public interface IInvoiceSmsQueue
{
    bool TryQueue(string phoneNumber, string message, string invoiceNumber);
}