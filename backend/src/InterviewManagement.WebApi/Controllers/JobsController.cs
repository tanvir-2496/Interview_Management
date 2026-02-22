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
        var query = db.Jobs.AsNoTracking().OrderByDescending(x => x.CreatedAtUtc);
        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(new { total, items });
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
            SalaryRangeMin = req.SalaryRangeMin,
            SalaryRangeMax = req.SalaryRangeMax,
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
        job.SalaryRangeMin = req.SalaryRangeMin;
        job.SalaryRangeMax = req.SalaryRangeMax;
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
}
