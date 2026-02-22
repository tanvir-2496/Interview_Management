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
[Route("api/scorecards")]
public class ScorecardsController(AppDbContext db, ICurrentUserService currentUser) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] ScorecardSubmitRequest req)
    {
        if (!currentUser.HasPermission("Interviews.SubmitScorecard")) return Forbid();
        var assigned = await db.InterviewSessionInterviewers.AnyAsync(x => x.InterviewSessionId == req.InterviewSessionId && x.InterviewerId == currentUser.UserId);
        if (!assigned) return Forbid();

        var scorecard = new Scorecard
        {
            InterviewSessionId = req.InterviewSessionId,
            InterviewerId = currentUser.UserId,
            PrivateNotes = req.PrivateNotes,
            Recommendation = req.Recommendation
        };
        db.Scorecards.Add(scorecard);
        await db.SaveChangesAsync();

        db.ScorecardRatings.AddRange(req.Ratings.Select(r => new ScorecardRating { ScorecardId = scorecard.Id, Criterion = r.Criterion, Score = r.Score }));
        var session = await db.InterviewSessions.FindAsync(req.InterviewSessionId);
        if (session is not null)
        {
            db.CandidateTimelineEvents.Add(new CandidateTimelineEvent { CandidateId = session.CandidateId, EventType = TimelineEventType.ScoreSubmitted, PayloadJson = "{\"sessionId\":\"" + req.InterviewSessionId + "\"}" });
        }

        await db.SaveChangesAsync();
        return Ok(scorecard);
    }

    [HttpGet("{interviewSessionId:guid}")]
    public async Task<IActionResult> GetByInterviewSession(Guid interviewSessionId)
    {
        var session = await db.InterviewSessions.FindAsync(interviewSessionId);
        if (session is null) return NotFound();

        var assigned = await db.InterviewSessionInterviewers.AnyAsync(x => x.InterviewSessionId == interviewSessionId && x.InterviewerId == currentUser.UserId);
        var canViewAll = currentUser.HasPermission("Interviews.View");
        if (!assigned && !canViewAll) return Forbid();

        var scorecards = await db.Scorecards.Where(x => x.InterviewSessionId == interviewSessionId)
            .Select(s => new
            {
                s.Id,
                s.InterviewerId,
                s.PrivateNotes,
                s.Recommendation,
                Ratings = db.ScorecardRatings.Where(r => r.ScorecardId == s.Id).Select(r => new { r.Criterion, r.Score })
            }).ToListAsync();

        if (assigned && !canViewAll)
            return Ok(new { session.Id, session.Stage, session.StartAtUtc, session.EndAtUtc, scorecards });

        var candidate = await db.Candidates.FindAsync(session.CandidateId);
        return Ok(new { session, candidate, scorecards });
    }
}
