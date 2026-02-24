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
public class CandidatesController(
    AppDbContext db,
    ICurrentUserService currentUser,
    IEmailService emailService,
    IBackgroundJobClient jobs,
    IFileStorageService fileStorage,
    IVirusScanner virusScanner) : ControllerBase
{
    public class ReferralCreateRequest
    {
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string ReferredByName { get; set; } = string.Empty;
        public string? ReferredByEmail { get; set; }
        public string? ReferredByEmployeeId { get; set; }
        public Guid? JobId { get; set; }
        public IFormFile Resume { get; set; } = null!;
    }

    private static readonly string[] AllowedExt = [".pdf", ".doc", ".docx"];

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

    [HttpGet("referrals")]
    public async Task<IActionResult> ListReferrals()
    {
        if (!currentUser.HasPermission("Candidates.View")) return Forbid();

        var candidates = await db.Candidates
            .AsNoTracking()
            .Where(x => x.Source == CandidateSource.Referral)
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync();

        if (candidates.Count == 0) return Ok(Array.Empty<object>());

        var candidateIds = candidates.Select(x => x.Id).ToList();
        var resumes = await db.CandidateResumes
            .AsNoTracking()
            .Where(x => candidateIds.Contains(x.CandidateId))
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync();
        var applications = await db.CandidateJobApplications
            .AsNoTracking()
            .Where(x => candidateIds.Contains(x.CandidateId))
            .OrderByDescending(x => x.CreatedAtUtc)
            .ToListAsync();

        var latestResumeByCandidate = resumes
            .GroupBy(x => x.CandidateId)
            .ToDictionary(g => g.Key, g => g.First());

        var latestAppByCandidate = applications
            .GroupBy(x => x.CandidateId)
            .ToDictionary(g => g.Key, g => g.First());

        var jobIds = latestAppByCandidate.Values.Select(x => x.JobId).Distinct().ToList();
        var jobTitles = await db.Jobs
            .AsNoTracking()
            .Where(x => jobIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, x => x.Title);

        var result = candidates.Select(c =>
        {
            latestResumeByCandidate.TryGetValue(c.Id, out var resume);
            latestAppByCandidate.TryGetValue(c.Id, out var app);
            var jobTitle = app is not null && jobTitles.TryGetValue(app.JobId, out var title) ? title : null;

            return new
            {
                c.Id,
                c.FullName,
                c.Email,
                c.Phone,
                c.ReferredByName,
                c.ReferredByEmail,
                c.ReferredByEmployeeId,
                c.CreatedAtUtc,
                ResumeFileName = resume?.OriginalFileName,
                ResumePath = resume?.RelativePath,
                JobId = app?.JobId,
                JobTitle = jobTitle
            };
        });

        return Ok(result);
    }

    [HttpPost("referrals")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> CreateReferral([FromForm] ReferralCreateRequest req, CancellationToken ct)
    {
        if (!currentUser.HasPermission("Candidates.Edit")) return Forbid();

        if (string.IsNullOrWhiteSpace(req.FullName)) return BadRequest("Candidate name is required.");
        if (string.IsNullOrWhiteSpace(req.Email)) return BadRequest("Candidate email is required.");
        if (string.IsNullOrWhiteSpace(req.Phone)) return BadRequest("Candidate phone is required.");
        if (string.IsNullOrWhiteSpace(req.ReferredByName)) return BadRequest("Referrer name is required.");
        if (req.Resume is null) return BadRequest("Resume is required.");

        var duplicate = await db.Candidates.AnyAsync(x => x.Email == req.Email || x.Phone == req.Phone, ct);
        if (duplicate) return Conflict("Duplicate candidate by email/phone.");

        var ext = Path.GetExtension(req.Resume.FileName).ToLowerInvariant();
        if (!AllowedExt.Contains(ext)) return BadRequest("Only pdf/doc/docx allowed.");
        if (req.Resume.Length > 10 * 1024 * 1024) return BadRequest("File too large.");
        await using (var rs = req.Resume.OpenReadStream())
        {
            if (!await virusScanner.IsSafeAsync(rs, ct)) return BadRequest("Unsafe file detected.");
        }

        if (req.JobId.HasValue && !await db.Jobs.AnyAsync(x => x.Id == req.JobId.Value, ct))
            return BadRequest("Selected job does not exist.");

        var candidate = new Candidate
        {
            FullName = req.FullName.Trim(),
            Email = req.Email.Trim(),
            Phone = req.Phone.Trim(),
            Source = CandidateSource.Referral,
            ReferredByName = req.ReferredByName.Trim(),
            ReferredByEmail = string.IsNullOrWhiteSpace(req.ReferredByEmail) ? null : req.ReferredByEmail.Trim(),
            ReferredByEmployeeId = string.IsNullOrWhiteSpace(req.ReferredByEmployeeId) ? null : req.ReferredByEmployeeId.Trim()
        };
        db.Candidates.Add(candidate);
        await db.SaveChangesAsync(ct);

        await using (var fs = req.Resume.OpenReadStream())
        {
            var saved = await fileStorage.SaveAsync(fs, req.Resume.FileName, "resumes", ct);
            db.CandidateResumes.Add(new CandidateResume
            {
                CandidateId = candidate.Id,
                OriginalFileName = req.Resume.FileName,
                StoredFileName = saved.StoredFileName,
                RelativePath = saved.RelativePath,
                MimeType = req.Resume.ContentType,
                SizeInBytes = req.Resume.Length
            });
        }

        CandidateJobApplication? app = null;
        if (req.JobId.HasValue)
        {
            app = new CandidateJobApplication
            {
                CandidateId = candidate.Id,
                JobId = req.JobId.Value,
                CurrentStage = "Applied",
                Status = ApplicationStatus.Applied,
                ApplicationFormJson = "{}"
            };
            db.CandidateJobApplications.Add(app);
        }

        db.AuditLogs.Add(new AuditLog
        {
            UserId = currentUser.UserId,
            Action = "ReferralCreate",
            EntityName = "Candidate",
            EntityId = candidate.Id
        });

        await db.SaveChangesAsync(ct);

        if (app is not null)
        {
            db.CandidateTimelineEvents.Add(new CandidateTimelineEvent
            {
                CandidateId = candidate.Id,
                ApplicationId = app.Id,
                EventType = TimelineEventType.Applied,
                PayloadJson = "{\"source\":\"Referral\",\"jobId\":\"" + app.JobId + "\"}"
            });
            await db.SaveChangesAsync(ct);
        }

        return Ok(new { candidateId = candidate.Id, applicationId = app?.Id });
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
