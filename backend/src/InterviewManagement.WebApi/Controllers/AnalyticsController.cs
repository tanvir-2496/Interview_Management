using InterviewManagement.Application.Interfaces;
using InterviewManagement.Domain.Enums;
using InterviewManagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InterviewManagement.WebApi.Controllers;

[ApiController]
[Authorize]
[Route("api/analytics")]
public class AnalyticsController(AppDbContext db, ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet("funnel")]
    public async Task<IActionResult> Funnel([FromQuery] Guid? jobId)
    {
        if (!currentUser.HasPermission("Analytics.ViewReports")) return Forbid();
        var apps = db.CandidateJobApplications.AsQueryable();
        if (jobId.HasValue) apps = apps.Where(x => x.JobId == jobId.Value);
        var total = await apps.CountAsync();
        var interviewed = await db.InterviewSessions.Where(x => !jobId.HasValue || x.JobId == jobId.Value).Select(x => x.CandidateId).Distinct().CountAsync();
        var hired = await apps.CountAsync(x => x.Status == ApplicationStatus.Hired);
        return Ok(new[]
        {
            new { name = "Applied", value = total },
            new { name = "Interviewed", value = interviewed },
            new { name = "Hired", value = hired }
        });
    }

    [HttpGet("source-performance")]
    public async Task<IActionResult> SourcePerformance([FromQuery] Guid? jobId)
    {
        if (!currentUser.HasPermission("Analytics.ViewReports")) return Forbid();
        var sourceCount = await db.Candidates.GroupBy(x => x.Source)
            .Select(g => new { source = g.Key.ToString(), candidateCount = g.Count() }).ToListAsync();

        var hiredCandidateIds = await db.CandidateJobApplications
            .Where(x => x.Status == ApplicationStatus.Hired && (!jobId.HasValue || x.JobId == jobId.Value))
            .Select(x => x.CandidateId).ToListAsync();

        var hiredBySource = await db.Candidates.Where(x => hiredCandidateIds.Contains(x.Id))
            .GroupBy(x => x.Source)
            .Select(g => new { source = g.Key.ToString(), hireCount = g.Count() }).ToListAsync();

        var merged = sourceCount.Select(s =>
        {
            var h = hiredBySource.FirstOrDefault(x => x.source == s.source);
            return new { s.source, s.candidateCount, hireCount = h?.hireCount ?? 0 };
        });

        return Ok(merged);
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary()
    {
        if (!currentUser.HasPermission("Analytics.ViewReports")) return Forbid();
        return Ok(new
        {
            jobs = await db.Jobs.CountAsync(),
            activeJobs = await db.Jobs.CountAsync(x => x.Status == JobStatus.Active),
            candidates = await db.Candidates.CountAsync(),
            interviews = await db.InterviewSessions.CountAsync(),
            hired = await db.CandidateJobApplications.CountAsync(x => x.Status == ApplicationStatus.Hired)
        });
    }
}
