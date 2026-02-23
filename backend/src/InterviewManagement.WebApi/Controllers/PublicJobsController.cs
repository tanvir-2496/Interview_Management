using InterviewManagement.Application.DTOs;
using InterviewManagement.Application.Interfaces;
using InterviewManagement.Domain.Entities;
using InterviewManagement.Domain.Enums;
using InterviewManagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace InterviewManagement.WebApi.Controllers;

[ApiController]
[Route("api/public/jobs")]
public class PublicJobsController(AppDbContext db, IFileStorageService fileStorage, IVirusScanner virusScanner) : ControllerBase
{
    public class PublicApplyFormRequest
    {
        public string FullName { get; set; } = string.Empty;
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Source { get; set; } = "Portal";
        public string? PersonalSummary { get; set; }
        public string? IsBangladeshi { get; set; }
        public string? DegreeProgram { get; set; }
        public string? PassingYear { get; set; }
        public string? InterviewedBefore { get; set; }
        public string? ExperienceRange { get; set; }
        public bool Consent { get; set; }
        public IFormFile Resume { get; set; } = null!;
    }

    private static readonly string[] AllowedExt = [".pdf", ".doc", ".docx"];

    [HttpGet]
    public async Task<IActionResult> List() => Ok(await db.Jobs.Where(x => x.Status == JobStatus.Active).OrderByDescending(x => x.CreatedAtUtc).ToListAsync());

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var job = await db.Jobs.SingleOrDefaultAsync(x => x.Id == id && x.Status == JobStatus.Active);
        return job is null ? NotFound() : Ok(job);
    }

    [HttpPost("{id:guid}/apply")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> Apply(Guid id, [FromForm] PublicApplyFormRequest req, CancellationToken ct)
    {
        var job = await db.Jobs.SingleOrDefaultAsync(x => x.Id == id && x.Status == JobStatus.Active, ct);
        if (job is null) return NotFound("Job not active.");

        if (req.Resume is null) return BadRequest("Resume is required.");

        var ext = Path.GetExtension(req.Resume.FileName).ToLowerInvariant();
        if (!AllowedExt.Contains(ext)) return BadRequest("Only pdf/doc/docx allowed.");
        if (req.Resume.Length > 10 * 1024 * 1024) return BadRequest("File too large.");
        await using var rs = req.Resume.OpenReadStream();
        if (!await virusScanner.IsSafeAsync(rs, ct)) return BadRequest("Unsafe file detected.");

        var duplicate = await db.Candidates.Where(x => x.Email == req.Email || x.Phone == req.Phone).FirstOrDefaultAsync(ct);

        var fullName = string.IsNullOrWhiteSpace(req.FullName)
            ? $"{req.FirstName} {req.LastName}".Trim()
            : req.FullName.Trim();

        if (string.IsNullOrWhiteSpace(fullName))
            return BadRequest("Full name is required.");
        if (!req.Consent)
            return BadRequest("Consent is required.");

        var candidate = duplicate ?? new Candidate
        {
            FullName = fullName,
            Email = req.Email,
            Phone = req.Phone,
            Source = Enum.TryParse<CandidateSource>(req.Source, true, out var source) ? source : CandidateSource.Portal
        };

        if (duplicate is null)
        {
            db.Candidates.Add(candidate);
            await db.SaveChangesAsync(ct);
        }

        await using var fs = req.Resume.OpenReadStream();
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

        var applicationFormJson = JsonSerializer.Serialize(new
        {
            req.FirstName,
            req.LastName,
            req.PersonalSummary,
            req.IsBangladeshi,
            req.DegreeProgram,
            req.PassingYear,
            req.InterviewedBefore,
            req.ExperienceRange,
            req.Consent
        });

        var app = new CandidateJobApplication
        {
            CandidateId = candidate.Id,
            JobId = id,
            CurrentStage = "Applied",
            Status = ApplicationStatus.Applied,
            ApplicationFormJson = applicationFormJson
        };
        db.CandidateJobApplications.Add(app);
        await db.SaveChangesAsync(ct);

        db.CandidateTimelineEvents.Add(new CandidateTimelineEvent { CandidateId = candidate.Id, ApplicationId = app.Id, EventType = TimelineEventType.Applied, PayloadJson = "{\"jobId\":\"" + id + "\"}" });
        await db.SaveChangesAsync(ct);

        return Ok(new { candidateId = candidate.Id, applicationId = app.Id });
    }
}
