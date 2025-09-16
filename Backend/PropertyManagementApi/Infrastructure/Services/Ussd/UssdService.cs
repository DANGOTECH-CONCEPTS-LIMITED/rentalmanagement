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
        private readonly IPrepaidApiClient _prepaidApiClient;

        public UssdService(AppDbContext context, IPrepaidApiClient prepaidApiClient)
        {
            _context = context;
            _prepaidApiClient = prepaidApiClient;
        }

        public async Task DeleteSessionAsync(UssdSession s)
        {
            _context.UssdSessions.Remove(s);
            await _context.SaveChangesAsync();
        }

        public async Task<string> HandleAsync(string sessionId, string serviceCode, string phone, string text, string menuCode = "waterpay", string currency = "UGX")
        {
            var menu = await _context.UssdMenus.Include(m => m.Nodes).FirstAsync(m => m.Code == menuCode);
            var nodes = await _context.UssdNodes.Where(n => n.MenuId == menu.Id)
                                       .Include(n => n.Options)
                                       .ToDictionaryAsync(n => n.Id);
            var justNavigated = false;
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

            // --- MENU NODES ---
            if (node.Type == NodeType.Menu)
            {
                // first dial on root menu: show it
                if (sess.CurrentNodeId == menu.RootNodeId && string.IsNullOrWhiteSpace(lastInput))
                    return Con(RenderPrompt(node.Prompt, data, currency));

                if (!string.IsNullOrWhiteSpace(lastInput))
                {
                    var opt = node.Options.FirstOrDefault(o => o.Value == lastInput);
                    if (opt == null)
                        return Con(RenderPrompt(node.Prompt, data, currency) + "\n\nInvalid choice.");

                    sess.CurrentNodeId = opt.NextNodeId;
                    justNavigated = true;                    // <— we moved because of a menu choice
                    await TouchAsync(sess, data);
                    node = nodes[sess.CurrentNodeId];
                }
            }

            // --- INPUT NODES ---
            if (node.Type == NodeType.Input)
            {
                // If we just arrived from a Menu, show the prompt and wait for the next hit
                if (justNavigated || string.IsNullOrWhiteSpace(lastInput))
                    return Con(RenderPrompt(node.Prompt, data, currency));

                // Validate and capture the user's entry
                if (!string.IsNullOrEmpty(node.ValidationRegex) && !Regex.IsMatch(lastInput, node.ValidationRegex))
                    return Con("Invalid input.\n" + RenderPrompt(node.Prompt, data, currency));

                if (!string.IsNullOrWhiteSpace(node.DataKey))
                    data[node.DataKey] = lastInput;

                // advance to the next node
                sess.CurrentNodeId = node.NextNodeId ?? sess.CurrentNodeId;
                await TouchAsync(sess, data);
                node = nodes[sess.CurrentNodeId];
            }

            if (node.Type == NodeType.Action)
            {
                switch (node.ActionKey)
                {
                    case "LookupCustomer":
                        var (ok, name) = await ValidateMeter(data.GetValueOrDefault("meter", ""));//FakeLookupCustomerByMeterAsync(data.GetValueOrDefault("meter", ""));
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
                            ? End("Payment Prompt Initiated. Please approve on your phone. Thank you.")
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

        private async Task<(bool found,string name)> ValidateMeter(string meter)
        {
            if (string.IsNullOrWhiteSpace(meter))
                return (false, "Meter number is required.");
            if (!Regex.IsMatch(meter, @"^\d{6,16}$"))
                return (false, "Meter number must be 6 to 16 digits.");
            
            var customer = await _prepaidApiClient.SearchCustomerAsync(new CustomerSearchDto { MeterNumber = meter });
            ValidateMeterResponse resp = JsonSerializer.Deserialize<ValidateMeterResponse>(customer);
            if (resp.result_code != 0)
                return (false, "Meter not found.");
            if (resp.result_code==0)
            {
                return (true, resp.result[0].customer_name);
            }else
            {
                return (false, "Meter not found.");
            }

        }

        private class ValidateMeterResponse
        {
            public int result_code { get; set; }
            public List<Result> result { get; set; } = new();  // ✅ Change to List
            public string reason { get; set; } = null!;

            public class Result
            {
                public string customer_number { get; set; } = null!;
                public string customer_name { get; set; } = null!;
                public string meter_number { get; set; } = null!;
            }
        }

    }
}
