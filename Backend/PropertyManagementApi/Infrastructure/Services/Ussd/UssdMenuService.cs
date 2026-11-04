using Application.Interfaces.Ussd;
using Domain.Dtos.Ussd;
using Domain.Entities.USSD;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Infrastructure.Services.Ussd
{
    public class UssdMenuService : IUssdMenuService
    {
        private readonly AppDbContext _db;

        public UssdMenuService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<UssdMenuDto?> GetMenuAsync(string menuCode, CancellationToken ct = default)
        {
            var menu = await _db.UssdMenus
                .Include(m => m.Nodes)
                    .ThenInclude(n => n.Options)
                .FirstOrDefaultAsync(m => m.Code == menuCode, ct);

            if (menu == null) return null;

            return new UssdMenuDto
            {
                Id = menu.Id,
                Code = menu.Code,
                Title = menu.Title,
                RootNodeId = menu.RootNodeId,
                Nodes = menu.Nodes.OrderBy(n => n.Id).Select(n => new UssdNodeDto
                {
                    Id = n.Id,
                    Type = (int)n.Type,
                    Prompt = n.Prompt,
                    ValidationRegex = n.ValidationRegex,
                    DataKey = n.DataKey,
                    NextNodeId = n.NextNodeId,
                    ActionKey = n.ActionKey,
                    Options = n.Options.OrderBy(o => o.Id).Select(o => new UssdOptionDto
                    {
                        Id = o.Id,
                        Label = o.Label,
                        Value = o.Value,
                        NextNodeId = o.NextNodeId
                    }).ToList()
                }).ToList()
            };
        }

        public async Task<IEnumerable<UssdMenuSummaryDto>> ListMenusAsync(CancellationToken ct = default)
        {
            return await _db.UssdMenus.AsNoTracking()
                .OrderBy(m => m.Id)
                .Select(m => new UssdMenuSummaryDto
                {
                    Id = m.Id,
                    Code = m.Code,
                    Title = m.Title,
                    RootNodeId = m.RootNodeId
                })
                .ToListAsync(ct);
        }

        public async Task<UssdMenuDto> CreateMenuAsync(string code, string title, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(code)) throw new ArgumentException("Menu code is required.");
            if (string.IsNullOrWhiteSpace(title)) throw new ArgumentException("Menu title is required.");

            var normalized = code.Trim().ToLowerInvariant();
            if (await _db.UssdMenus.AnyAsync(m => m.Code == normalized, ct))
                throw new ArgumentException("A menu with this code already exists.");

            var menu = new UssdMenu { Code = normalized, Title = title.Trim() };
            _db.UssdMenus.Add(menu);
            await _db.SaveChangesAsync(ct);

            var root = new UssdNode
            {
                MenuId = menu.Id,
                Type = NodeType.Menu,
                Prompt = $"Welcome to {title.Trim()}\n1. Option one\n0. Exit"
            };
            _db.UssdNodes.Add(root);
            await _db.SaveChangesAsync(ct);

            menu.RootNodeId = root.Id;
            await _db.SaveChangesAsync(ct);

            return (await GetMenuAsync(normalized, ct))!;
        }

        public async Task<UssdMenuDto> SaveMenuAsync(UssdMenuDto dto, CancellationToken ct = default)
        {
            if (dto == null) throw new ArgumentNullException(nameof(dto));

            var menu = await _db.UssdMenus.FirstOrDefaultAsync(m => m.Id == dto.Id, ct)
                ?? throw new KeyNotFoundException($"Menu '{dto.Id}' not found.");

            // 1) Create brand-new nodes first so their real ids can be mapped from the client's temp ids.
            var tempToReal = new Dictionary<int, int>();
            var newEntities = new Dictionary<int, UssdNode>();
            foreach (var n in dto.Nodes.Where(x => x.Id <= 0))
            {
                if (n.Type < 1 || n.Type > 4)
                    throw new ArgumentException($"Node has an invalid type ({n.Type}).");

                var entity = new UssdNode
                {
                    MenuId = menu.Id,
                    Type = (NodeType)n.Type,
                    Prompt = n.Prompt,
                    ValidationRegex = string.IsNullOrWhiteSpace(n.ValidationRegex) ? null : n.ValidationRegex,
                    DataKey = string.IsNullOrWhiteSpace(n.DataKey) ? null : n.DataKey,
                    ActionKey = string.IsNullOrWhiteSpace(n.ActionKey) ? null : n.ActionKey
                };
                _db.UssdNodes.Add(entity);
                newEntities[n.Id] = entity;
            }
            if (newEntities.Count > 0)
            {
                await _db.SaveChangesAsync(ct);
                foreach (var (tempId, entity) in newEntities)
                    tempToReal[tempId] = entity.Id;
            }

            int ResolveRef(int refId) =>
                refId == 0
                    ? 0
                    : refId < 0
                        ? (tempToReal.TryGetValue(refId, out var real) ? real : throw new ArgumentException("Invalid node reference."))
                        : refId;

            int? ResolveNodeRef(int? refId) => refId == null ? null : ResolveRef(refId.Value);

            var keptExistingIds = dto.Nodes.Where(n => n.Id > 0).Select(n => n.Id).ToHashSet();
            var allIds = keptExistingIds.Concat(tempToReal.Values).ToHashSet();

            var resolvedRoot = ResolveNodeRef(dto.RootNodeId);
            if (resolvedRoot == null || resolvedRoot == 0 || !allIds.Contains(resolvedRoot.Value))
                throw new ArgumentException("Root node must reference one of the menu's nodes.");

            menu.Title = dto.Title;
            menu.RootNodeId = resolvedRoot.Value;

            var allNodes = await _db.UssdNodes
                .Where(n => n.MenuId == menu.Id)
                .ToListAsync(ct);

            var allOptions = await _db.UssdOptions
                .Where(o => allNodes.Select(n => n.Id).Contains(o.NodeId))
                .ToListAsync(ct);

            // 2) Apply updates to existing nodes and create options for new nodes.
            foreach (var nodeDto in dto.Nodes)
            {
                if (nodeDto.Id <= 0)
                {
                    var entity = newEntities[nodeDto.Id];
                    entity.Prompt = nodeDto.Prompt;
                    entity.ValidationRegex = string.IsNullOrWhiteSpace(nodeDto.ValidationRegex) ? null : nodeDto.ValidationRegex;
                    entity.DataKey = string.IsNullOrWhiteSpace(nodeDto.DataKey) ? null : nodeDto.DataKey;
                    entity.ActionKey = string.IsNullOrWhiteSpace(nodeDto.ActionKey) ? null : nodeDto.ActionKey;
                    entity.NextNodeId = ResolveNodeRef(nodeDto.NextNodeId);

                    foreach (var optDto in nodeDto.Options)
                    {
                        var target = ResolveRef(optDto.NextNodeId);
                        if (target == 0 || !allIds.Contains(target))
                            throw new ArgumentException($"Option '{optDto.Label}' points to a node that does not exist.");
                        _db.UssdOptions.Add(new UssdOption
                        {
                            NodeId = entity.Id,
                            Label = optDto.Label,
                            Value = optDto.Value,
                            NextNodeId = target
                        });
                    }
                    continue;
                }

                var node = allNodes.FirstOrDefault(n => n.Id == nodeDto.Id);
                if (node == null) throw new KeyNotFoundException($"Node '{nodeDto.Id}' not found.");

                node.Prompt = nodeDto.Prompt;
                node.ValidationRegex = string.IsNullOrWhiteSpace(nodeDto.ValidationRegex) ? null : nodeDto.ValidationRegex;
                node.DataKey = string.IsNullOrWhiteSpace(nodeDto.DataKey) ? null : nodeDto.DataKey;
                node.ActionKey = string.IsNullOrWhiteSpace(nodeDto.ActionKey) ? null : nodeDto.ActionKey;
                node.NextNodeId = ResolveNodeRef(nodeDto.NextNodeId);

                var current = allOptions.Where(o => o.NodeId == node.Id).ToList();
                var incomingIds = nodeDto.Options.Where(o => o.Id > 0).Select(o => o.Id).ToHashSet();
                foreach (var opt in current.Where(o => !incomingIds.Contains(o.Id)).ToList())
                    _db.UssdOptions.Remove(opt);

                foreach (var optDto in nodeDto.Options)
                {
                    var target = ResolveRef(optDto.NextNodeId);
                    if (target == 0 || !allIds.Contains(target))
                        throw new ArgumentException($"Option '{optDto.Label}' points to a node that does not exist.");

                    if (optDto.Id <= 0)
                    {
                        _db.UssdOptions.Add(new UssdOption
                        {
                            NodeId = node.Id,
                            Label = optDto.Label,
                            Value = optDto.Value,
                            NextNodeId = target
                        });
                    }
                    else
                    {
                        var opt = current.FirstOrDefault(o => o.Id == optDto.Id);
                        if (opt != null)
                        {
                            opt.Label = optDto.Label;
                            opt.Value = optDto.Value;
                            opt.NextNodeId = target;
                        }
                    }
                }
            }

            // 3) Delete nodes removed by the admin (guarded against dangling references).
            foreach (var removed in allNodes.Where(n => !keptExistingIds.Contains(n.Id)).ToList())
            {
                if (removed.Id == resolvedRoot)
                    throw new ArgumentException("The root node cannot be deleted.");

                var referenced = allOptions.Any(o => o.NextNodeId == removed.Id)
                    || allNodes.Where(n => keptExistingIds.Contains(n.Id)).Any(n => n.NextNodeId == removed.Id)
                    || newEntities.Values.Any(n => n.NextNodeId == removed.Id);

                if (referenced)
                    throw new ArgumentException($"Node '#{removed.Id}' is referenced by another node and cannot be deleted.");

                _db.UssdOptions.RemoveRange(allOptions.Where(o => o.NodeId == removed.Id));
                _db.UssdNodes.Remove(removed);
            }

            await _db.SaveChangesAsync(ct);

            return (await GetMenuAsync(menu.Code, ct))!;
        }
    }
}
