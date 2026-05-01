using Domain.Entities.External;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Interfaces.SMS
{
    public interface ISmsProcessor
    {
        Task<bool> SendAsync(string phoneNumber, string message);
        Task<bool> SendAfricaTalkingSms(AfricasTalkingSmsRequest africasTalkingrq);
    }
}
