using Hangfire;
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
[Route("api/candidates")]
public class CandidatesController(AppDbContext db, ICurrentUserService currentUser, IEmailService emailService, IBackgroundJobClient jobs) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? search, [FromQuery] string? stage, [FromQuery] string? source, [FromQuery] Guid? jobId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (!currentUser.HasPermission("Candidates.View")) return Forbid();
        var query = db.Candidates.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search)) query = query.Where(x => x.FullName.Contains(search) || x.Email.Contains(search) || x.Phone.Contains(search));
        if (!string.IsNullOrWhiteSpace(source) && Enum.TryParse<CandidateSource>(source, true, out var src)) query = query.Where(x => x.Source == src);
        if (jobId.HasValue || !string.IsNullOrWhiteSpace(stage))
        {
            var appQ = db.CandidateJobApplications.AsQueryable();
            if (jobId.HasValue) appQ = appQ.Where(x => x.JobId == jobId.Value);
            if (!string.IsNullOrWhiteSpace(stage)) appQ = appQ.Where(x => x.CurrentStage == stage);
            var ids = appQ.Select(x => x.CandidateId);
            query = query.Where(x => ids.Contains(x.Id));
        }

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(x => x.CreatedAtUtc).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(new { total, items });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        if (!currentUser.HasPermission("Candidates.View")) return Forbid();
        var candidate = await db.Candidates.FindAsync(id);
        return candidate is null ? NotFound() : Ok(candidate);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] Candidate req)
    {
        if (!currentUser.HasPermission("Candidates.Edit")) return Forbid();
        var dup = await db.Candidates.AnyAsync(x => x.Email == req.Email || x.Phone == req.Phone);
        if (dup) return Conflict("Duplicate candidate by email/phone.");
        db.Candidates.Add(req);
        await db.SaveChangesAsync();
        return CreatedAtAction(nameof(Get), new { id = req.Id }, req);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Candidate req)
    {
        if (!currentUser.HasPermission("Candidates.Edit")) return Forbid();
        var entity = await db.Candidates.FindAsync(id);
        if (entity is null) return NotFound();
        entity.FullName = req.FullName;
        entity.Email = req.Email;
        entity.Phone = req.Phone;
        entity.Source = req.Source;
        entity.UpdatedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(entity);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (!currentUser.HasPermission("Candidates.Edit")) return Forbid();
        var entity = await db.Candidates.FindAsync(id);
        if (entity is null) return NotFound();
        db.Candidates.Remove(entity);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:guid}/parse-resume")]
    public async Task<IActionResult> ParseResume(Guid id)
    {
        if (!currentUser.HasPermission("Candidates.ParseResume")) return Forbid();
        var resume = await db.CandidateResumes.Where(x => x.CandidateId == id).OrderByDescending(x => x.CreatedAtUtc).FirstOrDefaultAsync();
        if (resume is null) return BadRequest("No resume found.");
        jobs.Enqueue<CandidateBackgroundJobs>(x => x.ParseResume(id, resume.RelativePath, resume.OriginalFileName));
        return Accepted();
    }

    [HttpPost("bulk-stage-move")]
    public async Task<IActionResult> BulkStageMove([FromBody] CandidateBulkStageMoveRequest req)
    {
        if (!currentUser.HasPermission("Candidates.BulkActions") || !currentUser.HasPermission("Candidates.MoveStage")) return Forbid();
        var apps = await db.CandidateJobApplications.Where(x => x.JobId == req.JobId && req.CandidateIds.Contains(x.CandidateId)).ToListAsync();
        apps.ForEach(a => a.CurrentStage = req.Stage);

        db.CandidateTimelineEvents.AddRange(apps.Select(a => new CandidateTimelineEvent
        {
            CandidateId = a.CandidateId,
            ApplicationId = a.Id,
            EventType = TimelineEventType.BulkAction,
            PayloadJson = "{\"action\":\"BulkStageMove\",\"to\":\"" + req.Stage + "\"}"
        }));

        db.AuditLogs.Add(new AuditLog { UserId = currentUser.UserId, Action = "BulkStageMove", EntityName = "CandidateJobApplication", PayloadJson = System.Text.Json.JsonSerializer.Serialize(req) });
        await db.SaveChangesAsync();
        return Ok(new { moved = apps.Count });
    }

    [HttpPost("bulk-email")]
    public async Task<IActionResult> BulkEmail([FromBody] CandidateBulkEmailRequest req, CancellationToken ct)
    {
        if (!currentUser.HasPermission("Candidates.BulkActions")) return Forbid();
        var tpl = await db.EmailTemplates.SingleOrDefaultAsync(x => x.TemplateKey == req.TemplateKey, ct);
        if (tpl is null) return BadRequest("Template not found.");
        var candidates = await db.Candidates.Where(x => req.CandidateIds.Contains(x.Id)).ToListAsync(ct);

        foreach (var c in candidates)
        {
            var body = tpl.Body.Replace("{{CandidateName}}", c.FullName).Replace("{{CompanyName}}", "Interview Management");
            await emailService.SendAsync(c.Email, tpl.Subject, body, ct);
            db.EmailLogs.Add(new EmailLog { ToEmail = c.Email, Subject = tpl.Subject, Body = body, Success = true });
        }

        db.AuditLogs.Add(new AuditLog { UserId = currentUser.UserId, Action = "BulkEmail", EntityName = "Candidate", PayloadJson = System.Text.Json.JsonSerializer.Serialize(req) });
        await db.SaveChangesAsync(ct);
        return Ok(new { sent = candidates.Count });
    }

    [HttpGet("{id:guid}/timeline")]
    public async Task<IActionResult> Timeline(Guid id)
    {
        if (!currentUser.HasPermission("Candidates.View")) return Forbid();
        return Ok(await db.CandidateTimelineEvents.Where(x => x.CandidateId == id).OrderBy(x => x.CreatedAtUtc).ToListAsync());
    }
}

public class CandidateBackgroundJobs(AppDbContext db, IResumeParser parser)
{
    public async Task ParseResume(Guid candidateId, string relativePath, string fileName)
    {
        var candidate = await db.Candidates.FindAsync(candidateId);
        if (candidate is null) return;
        var uploadsRoot = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
        var full = Path.Combine(uploadsRoot, relativePath.Replace('/', Path.DirectorySeparatorChar));
        var parsed = await parser.ParseAsync(full, fileName, CancellationToken.None);

        if (!string.IsNullOrWhiteSpace(parsed.Name)) candidate.FullName = parsed.Name;
        if (!string.IsNullOrWhiteSpace(parsed.Email)) candidate.Email = parsed.Email;
        if (!string.IsNullOrWhiteSpace(parsed.Phone)) candidate.Phone = parsed.Phone;
        candidate.YearsOfExperience = parsed.Years;
        candidate.ResumeParseStatus = ParseStatus.Success;
        candidate.LastParsedAtUtc = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }
}
