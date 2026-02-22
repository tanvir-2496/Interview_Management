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
[Route("api/interviews")]
public class InterviewsController(AppDbContext db, ICurrentUserService currentUser, IEmailService emailService, ICalendarService calendarService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List() => Ok(await db.InterviewSessions.OrderByDescending(x => x.StartAtUtc).ToListAsync());

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id)
    {
        var session = await db.InterviewSessions.FindAsync(id);
        return session is null ? NotFound() : Ok(session);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] InterviewCreateRequest req)
    {
        if (!currentUser.HasPermission("Interviews.Schedule")) return Forbid();
        var session = new InterviewSession
        {
            JobId = req.JobId,
            CandidateId = req.CandidateId,
            Stage = req.Stage,
            StartAtUtc = DateTime.SpecifyKind(req.StartAtUtc, DateTimeKind.Utc),
            EndAtUtc = DateTime.SpecifyKind(req.EndAtUtc, DateTimeKind.Utc),
            Timezone = req.Timezone,
            LocationOrMeetingLink = req.LocationOrMeetingLink
        };
        db.InterviewSessions.Add(session);
        await db.SaveChangesAsync();

        db.InterviewSessionInterviewers.AddRange(req.InterviewerIds.Select(i => new InterviewSessionInterviewer { InterviewSessionId = session.Id, InterviewerId = i }));
        db.CandidateTimelineEvents.Add(new CandidateTimelineEvent { CandidateId = req.CandidateId, EventType = TimelineEventType.InterviewScheduled, PayloadJson = "{\"sessionId\":\"" + session.Id + "\"}" });
        db.AuditLogs.Add(new AuditLog { UserId = currentUser.UserId, Action = "InterviewSchedule", EntityName = "InterviewSession", EntityId = session.Id });
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(Get), new { id = session.Id }, session);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] InterviewCreateRequest req)
    {
        if (!currentUser.HasPermission("Interviews.Update")) return Forbid();
        var session = await db.InterviewSessions.FindAsync(id);
        if (session is null) return NotFound();
        session.Stage = req.Stage;
        session.StartAtUtc = DateTime.SpecifyKind(req.StartAtUtc, DateTimeKind.Utc);
        session.EndAtUtc = DateTime.SpecifyKind(req.EndAtUtc, DateTimeKind.Utc);
        session.Timezone = req.Timezone;
        session.LocationOrMeetingLink = req.LocationOrMeetingLink;
        session.UpdatedAtUtc = DateTime.UtcNow;

        db.InterviewSessionInterviewers.RemoveRange(db.InterviewSessionInterviewers.Where(x => x.InterviewSessionId == id));
        db.InterviewSessionInterviewers.AddRange(req.InterviewerIds.Select(i => new InterviewSessionInterviewer { InterviewSessionId = id, InterviewerId = i }));
        db.AuditLogs.Add(new AuditLog { UserId = currentUser.UserId, Action = "InterviewUpdate", EntityName = "InterviewSession", EntityId = id });
        await db.SaveChangesAsync();
        return Ok(session);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (!currentUser.HasPermission("Interviews.Cancel")) return Forbid();
        var session = await db.InterviewSessions.FindAsync(id);
        if (session is null) return NotFound();
        db.InterviewSessions.Remove(session);
        db.AuditLogs.Add(new AuditLog { UserId = currentUser.UserId, Action = "InterviewCancel", EntityName = "InterviewSession", EntityId = id });
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("my-assigned")]
    public async Task<IActionResult> MyAssigned()
    {
        var myId = currentUser.UserId;
        var ids = db.InterviewSessionInterviewers.Where(x => x.InterviewerId == myId).Select(x => x.InterviewSessionId);
        var sessions = await db.InterviewSessions.Where(x => ids.Contains(x.Id)).OrderBy(x => x.StartAtUtc).ToListAsync();
        return Ok(sessions);
    }

    [HttpPost("{id:guid}/send-invite")]
    public async Task<IActionResult> SendInvite(Guid id, CancellationToken ct)
    {
        if (!currentUser.HasPermission("Interviews.Schedule")) return Forbid();
        var session = await db.InterviewSessions.FindAsync([id], ct);
        if (session is null) return NotFound();
        var candidate = await db.Candidates.FindAsync([session.CandidateId], ct);
        if (candidate is null) return NotFound("Candidate missing");

        var subject = "Interview invitation";
        var body = "You are invited for interview at " + session.StartAtUtc.ToString("u");
        await emailService.SendAsync(candidate.Email, subject, body, ct);
        db.EmailLogs.Add(new EmailLog { ToEmail = candidate.Email, Subject = subject, Body = body, Success = true });
        await db.SaveChangesAsync(ct);
        return Ok();
    }

    [HttpPost("{id:guid}/calendar-sync")]
    public async Task<IActionResult> CalendarSync(Guid id, [FromQuery] string provider = "google", CancellationToken ct = default)
    {
        if (!currentUser.HasPermission("Interviews.Schedule")) return Forbid();
        var session = await db.InterviewSessions.FindAsync([id], ct);
        if (session is null) return NotFound();

        var synced = await calendarService.SyncAsync(session, provider, ct);
        db.ExternalCalendarEvents.Add(new ExternalCalendarEvent
        {
            InterviewSessionId = id,
            Provider = provider.Equals("outlook", StringComparison.OrdinalIgnoreCase) ? CalendarProvider.MockOutlook : CalendarProvider.MockGoogle,
            ExternalEventId = synced.ExternalEventId,
            PayloadJson = synced.PayloadJson
        });
        await db.SaveChangesAsync(ct);
        return Ok(synced);
    }
}
