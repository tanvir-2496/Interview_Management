using InterviewManagement.Application.Interfaces;
using InterviewManagement.Domain.Entities;
using InterviewManagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InterviewManagement.WebApi.Controllers;

[ApiController]
[Authorize]
[Route("api/settings")]
public class SettingsController(AppDbContext db, ICurrentUserService currentUser) : ControllerBase
{
    [HttpGet("stages")]
    public async Task<IActionResult> GetStages([FromQuery] Guid? jobId)
    {
        if (!currentUser.HasPermission("Settings.ManageStages")) return Forbid();
        var items = await db.JobStageConfigs.Where(x => !jobId.HasValue || x.JobId == jobId.Value).OrderBy(x => x.StageOrder).ToListAsync();
        return Ok(items);
    }

    [HttpPost("stages")]
    public async Task<IActionResult> CreateStage([FromBody] JobStageConfig req)
    {
        if (!currentUser.HasPermission("Settings.ManageStages")) return Forbid();
        db.JobStageConfigs.Add(req);
        await db.SaveChangesAsync();
        return Ok(req);
    }

    [HttpPut("stages/{id:guid}")]
    public async Task<IActionResult> UpdateStage(Guid id, [FromBody] JobStageConfig req)
    {
        if (!currentUser.HasPermission("Settings.ManageStages")) return Forbid();
        var item = await db.JobStageConfigs.FindAsync(id);
        if (item is null) return NotFound();
        item.StageName = req.StageName;
        item.StageOrder = req.StageOrder;
        item.IsActive = req.IsActive;
        await db.SaveChangesAsync();
        return Ok(item);
    }

    [HttpDelete("stages/{id:guid}")]
    public async Task<IActionResult> DeleteStage(Guid id)
    {
        if (!currentUser.HasPermission("Settings.ManageStages")) return Forbid();
        var item = await db.JobStageConfigs.FindAsync(id);
        if (item is null) return NotFound();
        db.JobStageConfigs.Remove(item);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("email-templates")]
    public async Task<IActionResult> GetEmailTemplates()
    {
        if (!currentUser.HasPermission("Settings.ManageTemplates")) return Forbid();
        return Ok(await db.EmailTemplates.OrderBy(x => x.TemplateKey).ToListAsync());
    }

    [HttpPost("email-templates")]
    public async Task<IActionResult> CreateEmailTemplate([FromBody] EmailTemplate req)
    {
        if (!currentUser.HasPermission("Settings.ManageTemplates")) return Forbid();
        db.EmailTemplates.Add(req);
        db.AuditLogs.Add(new AuditLog { UserId = currentUser.UserId, Action = "TemplateCreate", EntityName = "EmailTemplate", EntityId = req.Id });
        await db.SaveChangesAsync();
        return Ok(req);
    }

    [HttpPut("email-templates/{id:guid}")]
    public async Task<IActionResult> UpdateEmailTemplate(Guid id, [FromBody] EmailTemplate req)
    {
        if (!currentUser.HasPermission("Settings.ManageTemplates")) return Forbid();
        var item = await db.EmailTemplates.FindAsync(id);
        if (item is null) return NotFound();
        item.TemplateKey = req.TemplateKey;
        item.Subject = req.Subject;
        item.Body = req.Body;
        db.AuditLogs.Add(new AuditLog { UserId = currentUser.UserId, Action = "TemplateUpdate", EntityName = "EmailTemplate", EntityId = id });
        await db.SaveChangesAsync();
        return Ok(item);
    }

    [HttpDelete("email-templates/{id:guid}")]
    public async Task<IActionResult> DeleteEmailTemplate(Guid id)
    {
        if (!currentUser.HasPermission("Settings.ManageTemplates")) return Forbid();
        var item = await db.EmailTemplates.FindAsync(id);
        if (item is null) return NotFound();
        db.EmailTemplates.Remove(item);
        db.AuditLogs.Add(new AuditLog { UserId = currentUser.UserId, Action = "TemplateDelete", EntityName = "EmailTemplate", EntityId = id });
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("scorecard-templates")]
    public async Task<IActionResult> GetScorecards() => Ok(await db.ScorecardTemplates.Include(x => x.Criteria).ToListAsync());

    [HttpPost("scorecard-templates")]
    public async Task<IActionResult> CreateScorecardTemplate([FromBody] ScorecardTemplate req)
    {
        db.ScorecardTemplates.Add(req);
        await db.SaveChangesAsync();
        return Ok(req);
    }

    [HttpPut("scorecard-templates/{id:guid}")]
    public async Task<IActionResult> UpdateScorecardTemplate(Guid id, [FromBody] ScorecardTemplate req)
    {
        var template = await db.ScorecardTemplates.FindAsync(id);
        if (template is null) return NotFound();
        template.Name = req.Name;
        template.JobId = req.JobId;
        await db.SaveChangesAsync();
        return Ok(template);
    }

    [HttpDelete("scorecard-templates/{id:guid}")]
    public async Task<IActionResult> DeleteScorecardTemplate(Guid id)
    {
        var template = await db.ScorecardTemplates.FindAsync(id);
        if (template is null) return NotFound();
        db.ScorecardTemplates.Remove(template);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
