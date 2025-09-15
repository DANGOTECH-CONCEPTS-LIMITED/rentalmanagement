using Application.Interfaces.PrepaidApi;
using Application.Interfaces.Ussd;
using Domain.Dtos.PrepaidApi;
using Domain.Dtos.Ussd;
using Domain.Entities.USSD;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace Infrastructure.Services.Ussd
{
    public class UssdService : IUssdService
    {
        private readonly AppDbContext  _context;

        public UssdService(AppDbContext context)
        {
            _context = context;
        }

        public Task DeleteSessionAsync(UssdSession s)
        {
            throw new NotImplementedException();
        }

        public async Task<string> HandleAsync(string sessionId, string serviceCode, string phone, string text, string menuCode = "waterpay", string currency = "UGX")
        {
            var menu = await _context.UssdMenus.Include(m => m.Nodes).FirstAsync(m => m.Code == menuCode);
            var nodes = await _context.UssdNodes.Where(n => n.MenuId == menu.Id)
                                       .Include(n => n.Options)
                                       .ToDictionaryAsync(n => n.Id);

            // load or create session
            var sess = await _context.UssdSessions.FirstOrDefaultAsync(s => s.SessionId == sessionId);
            if (sess == null)
            {
                sess = new UssdSession
                {
                    SessionId = sessionId,
                    ServiceCode = serviceCode,
                    PhoneNumber = phone,
                    CurrentNodeId = menu.RootNodeId,
                    DataJson = JsonSerializer.Serialize(new Dictionary<string, string>())
                };
                _context.UssdSessions.Add(sess);
                await _context.SaveChangesAsync();
            }

            var data = JsonSerializer.Deserialize<Dictionary<string, string>>(sess.DataJson) ?? new();

            // Africa's Talking sends complete history in text ("1*<input>*<input>...").
            // We only need the *last* segment for this interaction step.
            var parts = string.IsNullOrWhiteSpace(text) ? Array.Empty<string>() : text.Split('*', StringSplitOptions.TrimEntries);
            var lastInput = parts.Length == 0 ? "" : parts[^1];

            var node = nodes[sess.CurrentNodeId];

            // For Menu nodes, the last input selects an option *except* on first load (no input).
            if (node.Type == NodeType.Menu)
            {
                if (sess.CurrentNodeId == menu.RootNodeId && string.IsNullOrWhiteSpace(lastInput))
                    return Con(RenderPrompt(node.Prompt, data, currency));

                if (!string.IsNullOrWhiteSpace(lastInput))
                {
                    var opt = node.Options.FirstOrDefault(o => o.Value == lastInput);
                    if (opt == null) return Con(RenderPrompt(node.Prompt, data, currency) + "\n\nInvalid choice.");
                    sess.CurrentNodeId = opt.NextNodeId;
                    await TouchAsync(sess, data);
                    node = nodes[sess.CurrentNodeId];
                }
            }

            if (node.Type == NodeType.Input)
            {
                // If this is the first time we’re displaying this Input node, show prompt
                if (string.IsNullOrWhiteSpace(lastInput) || nodes.Values.Any(n => n.Options.Any(o => o.NextNodeId == node.Id)))
                    return Con(RenderPrompt(node.Prompt, data, currency));

                // Validate input
                if (!string.IsNullOrEmpty(node.ValidationRegex) && !Regex.IsMatch(lastInput, node.ValidationRegex))
                    return Con("Invalid input.\n" + RenderPrompt(node.Prompt, data, currency));

                if (!string.IsNullOrWhiteSpace(node.DataKey))
                    data[node.DataKey] = lastInput;

                // advance
                sess.CurrentNodeId = node.NextNodeId ?? sess.CurrentNodeId;
                await TouchAsync(sess, data);

                node = nodes[sess.CurrentNodeId];
            }

            if (node.Type == NodeType.Action)
            {
                switch (node.ActionKey)
                {
                    case "LookupCustomer":
                        var (ok, name) = await FakeLookupCustomerByMeterAsync(data.GetValueOrDefault("meter", ""));
                        if (!ok) return Con("Meter not found. Enter Meter Number:");
                        data["customerName"] = name;
                        sess.CurrentNodeId = node.NextNodeId ?? sess.CurrentNodeId;
                        await TouchAsync(sess, data);
                        node = nodes[sess.CurrentNodeId];
                        break;

                    case "Checkout":
                        var meter = data.GetValueOrDefault("meter", "");
                        var amountText = data.GetValueOrDefault("amount", "0");
                        if (!decimal.TryParse(amountText, out var amount) || amount <= 0)
                            return End("Invalid amount.");

                        var checkoutOk = true;//await _payments.MobileCheckoutAsync(phone, amount, currency, new { meter, customer = data.GetValueOrDefault("customerName", ""), sessionId });
                        await DeleteSessionAsync(sess);
                        return checkoutOk
                            ? End("Checkout initiated. Approve the prompt on your phone. Thank you.")
                            : End("We couldn’t start the payment right now. Please try again later.");

                    case "Cancel":
                        await DeleteSessionAsync(sess);
                        return End("Payment canceled. Goodbye.");

                    default:
                        // fall through to next
                        sess.CurrentNodeId = node.NextNodeId ?? sess.CurrentNodeId;
                        await TouchAsync(sess, data);
                        node = nodes[sess.CurrentNodeId];
                        break;
                }
            }

            if (node.Type == NodeType.Exit)
            {
                await DeleteSessionAsync(sess);
                return End(RenderPrompt(node.Prompt, data, currency));
            }

            // If we land on a Menu node (like confirm), render it
            if (node.Type == NodeType.Menu)
                return Con(RenderPrompt(node.Prompt, data, currency));

            // Otherwise prompt again (safety)
            return Con(RenderPrompt(node.Prompt, data, currency));


            // Helpers
            string RenderPrompt(string prompt, Dictionary<string, string> d, string curr) =>
                prompt.Replace("{meter}", d.GetValueOrDefault("meter", ""))
                      .Replace("{amount}", d.GetValueOrDefault("amount", ""))
                      .Replace("{customerName}", d.GetValueOrDefault("customerName", ""))
                      .Replace("{CURRENCY}", curr);

            static string Con(string body) => "CON " + body;
            static string End(string body) => "END " + body;
        }

        public async Task TouchAsync(UssdSession s, Dictionary<string, string> data)
        {
            s.DataJson = JsonSerializer.Serialize(data);
            s.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(); ;
        }

        private static Task<(bool found, string name)> FakeLookupCustomerByMeterAsync(string meter)
        => Task.FromResult(meter.Length >= 6 ? (true, "James Kaate") : (false, ""));
    }
}
