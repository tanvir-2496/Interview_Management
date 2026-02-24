using InterviewManagement.Application.DTOs;
using InterviewManagement.Application.Interfaces;
using InterviewManagement.Domain.Enums;
using InterviewManagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InterviewManagement.WebApi.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public class DashboardController(AppDbContext db, ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var canApprove = currentUser.HasPermission("Jobs.Approve");

        var summary = new
        {
            totalJobs = await db.Jobs.CountAsync(),
            activeJobs = await db.Jobs.CountAsync(x => x.Status == JobStatus.Active),
            pendingApprovals = await db.Jobs.CountAsync(x => x.Status == JobStatus.PendingApproval),
            totalCandidates = await db.Candidates.CountAsync(),
            interviews = await db.InterviewSessions.CountAsync()
        };

        var approvalQueue = new List<object>();
        if (canApprove)
        {
            approvalQueue = await db.Jobs
                .AsNoTracking()
                .Where(x => x.Status == JobStatus.PendingApproval)
                .OrderByDescending(x => x.UpdatedAtUtc)
                .Take(10)
                .Select(x => new
                {
                    x.Id,
                    x.Title,
                    x.JobCode,
                    x.Department,
                    x.LocationText,
                    x.ApplicationDeadlineUtc,
                    x.CreatedAtUtc,
                    x.UpdatedAtUtc
                } as object)
                .ToListAsync();
        }

        var notifications = await db.AppNotifications
            .AsNoTracking()
            .Where(x => x.UserId == currentUser.UserId)
            .OrderByDescending(x => x.CreatedAtUtc)
            .Take(20)
            .Select(x => new
            {
                x.Id,
                x.Type,
                x.Title,
                x.Message,
                x.EntityName,
                x.EntityId,
                x.IsRead,
                x.CreatedAtUtc
            })
            .ToListAsync();

        return Ok(new
        {
            summary,
            canApprove,
            approvalQueue,
            notifications,
            unreadCount = notifications.Count(x => !x.IsRead)
        });
    }

    [HttpPost("notifications/{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var notification = await db.AppNotifications.FirstOrDefaultAsync(x => x.Id == id && x.UserId == currentUser.UserId);
        if (notification is null) return NotFound();
        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAtUtc = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }
        return Ok(notification);
    }

    [HttpPost("notifications/read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var rows = await db.AppNotifications
            .Where(x => x.UserId == currentUser.UserId && !x.IsRead)
            .ExecuteUpdateAsync(s => s
                .SetProperty(x => x.IsRead, true)
                .SetProperty(x => x.ReadAtUtc, DateTime.UtcNow));
        return Ok(new { updated = rows });
    }
}
