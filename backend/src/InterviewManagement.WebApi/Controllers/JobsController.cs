using InterviewManagement.Application.DTOs;
using InterviewManagement.Application.Interfaces;
using InterviewManagement.Domain.Entities;
using InterviewManagement.Domain.Enums;
using InterviewManagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InterviewManagement.WebApi.Controllers;

[ApiController]
[Authorize]
[Route("api/jobs")]
public class JobsController(AppDbContext db, ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = db.Jobs
            .AsNoTracking()
            .OrderByDescending(x => x.ApplicationDeadlineUtc ?? DateTime.MinValue)
            .ThenByDescending(x => x.CreatedAtUtc);
        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        var jobIds = items.Select(x => x.Id).ToList();
        var candidateCounts = await db.CandidateJobApplications
            .Where(x => jobIds.Contains(x.JobId))
            .GroupBy(x => x.JobId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count);
        return Ok(new { total, items, candidateCounts });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var job = await db.Jobs.FindAsync(id);
        return job is null ? NotFound() : Ok(job);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] JobUpsertRequest req)
    {
        if (!currentUser.HasPermission("Jobs.Create")) return Forbid();
        var job = new Job
        {
            Title = req.Title,
            Department = req.Department,
            SkillsCsv = req.SkillsCsv,
            SalaryRangeMin = req.IsSalaryNegotiable ? 0 : req.SalaryRangeMin,
            SalaryRangeMax = req.IsSalaryNegotiable ? 0 : req.SalaryRangeMax,
            IsSalaryNegotiable = req.IsSalaryNegotiable,
            LocationType = (LocationType)req.LocationType,
            LocationText = req.LocationText,
            EmploymentType = (EmploymentType)req.EmploymentType,
            ExperienceLevel = (ExperienceLevel)req.ExperienceLevel,
            JobCode = req.JobCode,
            VacancyCount = req.VacancyCount,
            ApplicationDeadlineUtc = req.ApplicationDeadlineUtc,
            DescriptionHtml = req.DescriptionHtml,
            RequirementsHtml = req.RequirementsHtml,
            DescriptionJson = req.DescriptionJson,
            RequirementsJson = req.RequirementsJson
        };
        db.Jobs.Add(job);

        var stageInputs = (req.InterviewStages ?? [])
            .Where(x => !string.IsNullOrWhiteSpace(x.StageName))
            .OrderBy(x => x.StageOrder)
            .ToList();
        var stageConfigs = stageInputs
            .Select((x, index) => new JobStageConfig
            {
                JobId = job.Id,
                StageName = x.StageName.Trim(),
                StageOrder = x.StageOrder > 0 ? x.StageOrder : index + 1,
                IsActive = x.IsActive
            })
            .ToList();
        if (stageConfigs.Count > 0) db.JobStageConfigs.AddRange(stageConfigs);

        await db.SaveChangesAsync();
        await NotifyApproversForNewDraftJob(job);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = job.Id }, job);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] JobUpsertRequest req)
    {
        if (!currentUser.HasPermission("Jobs.Edit")) return Forbid();
        var job = await db.Jobs.FindAsync(id);
        if (job is null) return NotFound();
        job.Title = req.Title;
        job.Department = req.Department;
        job.SkillsCsv = req.SkillsCsv;
        job.SalaryRangeMin = req.IsSalaryNegotiable ? 0 : req.SalaryRangeMin;
        job.SalaryRangeMax = req.IsSalaryNegotiable ? 0 : req.SalaryRangeMax;
        job.IsSalaryNegotiable = req.IsSalaryNegotiable;
        job.LocationType = (LocationType)req.LocationType;
        job.LocationText = req.LocationText;
        job.EmploymentType = (EmploymentType)req.EmploymentType;
        job.ExperienceLevel = (ExperienceLevel)req.ExperienceLevel;
        job.JobCode = req.JobCode;
        job.VacancyCount = req.VacancyCount;
        job.ApplicationDeadlineUtc = req.ApplicationDeadlineUtc;
        job.DescriptionHtml = req.DescriptionHtml;
        job.RequirementsHtml = req.RequirementsHtml;
        job.DescriptionJson = req.DescriptionJson;
        job.RequirementsJson = req.RequirementsJson;
        job.UpdatedAtUtc = DateTime.UtcNow;

        if (req.InterviewStages is not null)
        {
            var existingStages = await db.JobStageConfigs.Where(x => x.JobId == id).ToListAsync();
            if (existingStages.Count > 0) db.JobStageConfigs.RemoveRange(existingStages);

            var stageInputs = req.InterviewStages
                .Where(x => !string.IsNullOrWhiteSpace(x.StageName))
                .OrderBy(x => x.StageOrder)
                .ToList();
            var stageConfigs = stageInputs
                .Select((x, index) => new JobStageConfig
                {
                    JobId = id,
                    StageName = x.StageName.Trim(),
                    StageOrder = x.StageOrder > 0 ? x.StageOrder : index + 1,
                    IsActive = x.IsActive
                })
                .ToList();
            if (stageConfigs.Count > 0) db.JobStageConfigs.AddRange(stageConfigs);
        }

        await db.SaveChangesAsync();
        return Ok(job);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (!currentUser.HasPermission("Jobs.Edit")) return Forbid();
        var job = await db.Jobs.FindAsync(id);
        if (job is null) return NotFound();
        db.Jobs.Remove(job);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:guid}/submit-for-approval")]
    public async Task<IActionResult> SubmitForApproval(Guid id)
    {
        if (!currentUser.HasPermission("Jobs.SubmitForApproval")) return Forbid();
        var job = await db.Jobs.FindAsync(id);
        if (job is null) return NotFound();
        if (job.Status != JobStatus.Draft) return BadRequest("Only Draft can be submitted.");

        var from = job.Status;
        job.Status = JobStatus.PendingApproval;
        db.JobStatusHistories.Add(new JobStatusHistory { JobId = id, FromStatus = from, ToStatus = job.Status, ChangedByUserId = currentUser.UserId });
        db.JobApprovalActions.Add(new JobApprovalAction { JobId = id, ActionByUserId = currentUser.UserId, Action = "SubmitForApproval" });
        db.AuditLogs.Add(new AuditLog { UserId = currentUser.UserId, Action = "SubmitForApproval", EntityName = "Job", EntityId = id });
        await NotifyApproversJobSubmitted(job);

        await db.SaveChangesAsync();
        return Ok(job);
    }

    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, [FromBody] ApproveRejectRequest req)
    {
        if (!currentUser.HasPermission("Jobs.Approve")) return Forbid();
        var job = await db.Jobs.FindAsync(id);
        if (job is null) return NotFound();
        if (job.Status != JobStatus.PendingApproval) return BadRequest("Only PendingApproval can be approved.");

        var from = job.Status;
        job.Status = JobStatus.Active;
        job.RejectionReason = null;
        db.JobStatusHistories.Add(new JobStatusHistory { JobId = id, FromStatus = from, ToStatus = job.Status, ChangedByUserId = currentUser.UserId });
        db.JobApprovalActions.Add(new JobApprovalAction { JobId = id, ActionByUserId = currentUser.UserId, Action = "Approve", Reason = req.Reason });
        db.AuditLogs.Add(new AuditLog { UserId = currentUser.UserId, Action = "Approve", EntityName = "Job", EntityId = id });
        await MarkNotificationsAsReadForCurrentUser(id);
        await NotifySubmittersApprovalOutcome(job, "Approved", req.Reason);
        await db.SaveChangesAsync();
        return Ok(job);
    }

    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] ApproveRejectRequest req)
    {
        if (!currentUser.HasPermission("Jobs.Reject")) return Forbid();
        var job = await db.Jobs.FindAsync(id);
        if (job is null) return NotFound();
        if (job.Status != JobStatus.PendingApproval) return BadRequest("Only PendingApproval can be rejected.");

        var from = job.Status;
        job.Status = JobStatus.Draft;
        job.RejectionReason = req.Reason;
        db.JobStatusHistories.Add(new JobStatusHistory { JobId = id, FromStatus = from, ToStatus = job.Status, ChangedByUserId = currentUser.UserId, Reason = req.Reason });
        db.JobApprovalActions.Add(new JobApprovalAction { JobId = id, ActionByUserId = currentUser.UserId, Action = "Reject", Reason = req.Reason });
        await MarkNotificationsAsReadForCurrentUser(id);
        await NotifySubmittersApprovalOutcome(job, "Rejected", req.Reason);
        await db.SaveChangesAsync();
        return Ok(job);
    }

    [HttpPost("{id:guid}/close")]
    public async Task<IActionResult> Close(Guid id)
    {
        if (!currentUser.HasPermission("Jobs.Close")) return Forbid();
        var job = await db.Jobs.FindAsync(id);
        if (job is null) return NotFound();

        var from = job.Status;
        job.Status = JobStatus.Closed;
        db.JobStatusHistories.Add(new JobStatusHistory { JobId = id, FromStatus = from, ToStatus = JobStatus.Closed, ChangedByUserId = currentUser.UserId });
        await db.SaveChangesAsync();
        return Ok(job);
    }

    private async Task<List<Guid>> GetApproverUserIds()
    {
        var approverPermissionId = await db.Permissions
            .Where(x => x.Code == "Jobs.Approve")
            .Select(x => x.Id)
            .FirstOrDefaultAsync();

        if (approverPermissionId == Guid.Empty) return new List<Guid>();

        return await db.UserRoles
            .Join(db.RolePermissions, ur => ur.RoleId, rp => rp.RoleId, (ur, rp) => new { ur.UserId, rp.PermissionId })
            .Where(x => x.PermissionId == approverPermissionId)
            .Select(x => x.UserId)
            .Distinct()
            .ToListAsync();
    }

    private async Task NotifyApproversForNewDraftJob(Job job)
    {
        var approverUserIds = await GetApproverUserIds();
        if (approverUserIds.Count == 0) return;

        var notifications = approverUserIds.Select(userId => new AppNotification
        {
            UserId = userId,
            Type = "JobCreated",
            Title = "New job draft created",
            Message = $"{job.Title} ({job.JobCode}) has been created as draft.",
            EntityName = "Job",
            EntityId = job.Id
        });

        db.AppNotifications.AddRange(notifications);
    }

    private async Task NotifyApproversJobSubmitted(Job job)
    {
        var approverUserIds = await GetApproverUserIds();
        if (approverUserIds.Count == 0) return;

        var notifications = approverUserIds.Select(userId => new AppNotification
        {
            UserId = userId,
            Type = "JobApproval",
            Title = "New job requires approval",
            Message = $"{job.Title} ({job.JobCode}) is waiting for approval.",
            EntityName = "Job",
            EntityId = job.Id
        });

        db.AppNotifications.AddRange(notifications);
    }

    private async Task NotifySubmittersApprovalOutcome(Job job, string outcome, string? reason)
    {
        var submitterUserIds = await db.JobApprovalActions
            .Where(x => x.JobId == job.Id && x.Action == "SubmitForApproval")
            .Select(x => x.ActionByUserId)
            .Distinct()
            .ToListAsync();

        if (submitterUserIds.Count == 0) return;

        var reasonPart = string.IsNullOrWhiteSpace(reason) ? string.Empty : $" Reason: {reason}";
        var notifications = submitterUserIds.Select(userId => new AppNotification
        {
            UserId = userId,
            Type = "ApprovalResult",
            Title = $"Job {outcome}",
            Message = $"{job.Title} ({job.JobCode}) has been {outcome.ToLowerInvariant()}.{reasonPart}",
            EntityName = "Job",
            EntityId = job.Id
        });

        db.AppNotifications.AddRange(notifications);
    }

    private async Task MarkNotificationsAsReadForCurrentUser(Guid jobId)
    {
        var items = await db.AppNotifications
            .Where(x => x.UserId == currentUser.UserId && x.EntityName == "Job" && x.EntityId == jobId && !x.IsRead)
            .ToListAsync();

        if (items.Count == 0) return;
        foreach (var item in items)
        {
            item.IsRead = true;
            item.ReadAtUtc = DateTime.UtcNow;
        }
    }
}
