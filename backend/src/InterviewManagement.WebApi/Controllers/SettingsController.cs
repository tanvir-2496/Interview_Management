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
    public class CompanyProfileUpsertRequest
    {
        public string CompanyName { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string ContactNumber { get; set; } = string.Empty;
        public string ContactEmail { get; set; } = string.Empty;
        public string WebsiteUrl { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string LogoUrl { get; set; } = string.Empty;
    }

    private static object ToCompanyProfileResponse(CompanyProfile profile) => new
    {
        profile.CompanyName,
        profile.Location,
        profile.Address,
        profile.ContactNumber,
        profile.ContactEmail,
        profile.WebsiteUrl,
        profile.Description,
        profile.LogoUrl
    };

    private static CompanyProfile CreateDefaultCompanyProfile() => new()
    {
        CompanyName = "NAAS Solutions Limited",
        Location = "Dhaka, Bangladesh",
        Address = "H#3 (4th Floor), R#3, Block #B, Rampura, Banasree, Dhaka.",
        ContactNumber = "+880 1841-428736",
        ContactEmail = "info@naasbd.com",
        WebsiteUrl = "https://naasbd.com/",
        Description = "NAAS Solutions Limited is a technology-driven company focused on secure and scalable software products. We work with modern engineering practices and client-centric delivery to build meaningful digital solutions for local and global markets.",
        LogoUrl = "/NAAS-Logo.png"
    };

    [HttpGet("company-profile")]
    public async Task<IActionResult> GetCompanyProfile()
    {
        if (!currentUser.HasPermission("Settings.ManageTemplates")) return Forbid();
        var profile = await db.CompanyProfiles.OrderByDescending(x => x.UpdatedAtUtc ?? x.CreatedAtUtc).FirstOrDefaultAsync();
        profile ??= CreateDefaultCompanyProfile();
        return Ok(ToCompanyProfileResponse(profile));
    }

    [HttpPut("company-profile")]
    public async Task<IActionResult> UpsertCompanyProfile([FromBody] CompanyProfileUpsertRequest req)
    {
        if (!currentUser.HasPermission("Settings.ManageTemplates")) return Forbid();

        var profile = await db.CompanyProfiles.OrderByDescending(x => x.UpdatedAtUtc ?? x.CreatedAtUtc).FirstOrDefaultAsync();
        if (profile is null)
        {
            profile = CreateDefaultCompanyProfile();
            db.CompanyProfiles.Add(profile);
        }

        profile.CompanyName = string.IsNullOrWhiteSpace(req.CompanyName) ? profile.CompanyName : req.CompanyName.Trim();
        profile.Location = string.IsNullOrWhiteSpace(req.Location) ? profile.Location : req.Location.Trim();
        profile.Address = string.IsNullOrWhiteSpace(req.Address) ? profile.Address : req.Address.Trim();
        profile.ContactNumber = string.IsNullOrWhiteSpace(req.ContactNumber) ? profile.ContactNumber : req.ContactNumber.Trim();
        profile.ContactEmail = string.IsNullOrWhiteSpace(req.ContactEmail) ? profile.ContactEmail : req.ContactEmail.Trim();
        profile.WebsiteUrl = string.IsNullOrWhiteSpace(req.WebsiteUrl) ? profile.WebsiteUrl : req.WebsiteUrl.Trim();
        profile.Description = string.IsNullOrWhiteSpace(req.Description) ? profile.Description : req.Description.Trim();
        profile.LogoUrl = string.IsNullOrWhiteSpace(req.LogoUrl) ? profile.LogoUrl : req.LogoUrl.Trim();
        profile.UpdatedAtUtc = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return Ok(ToCompanyProfileResponse(profile));
    }

    [HttpGet("stages")]
    public async Task<IActionResult> GetStages([FromQuery] Guid? jobId)
    {
        var canManageStages = currentUser.HasPermission("Settings.ManageStages");
        var canCreateOrEditJob = currentUser.HasPermission("Jobs.Create") || currentUser.HasPermission("Jobs.Edit");
        if (!canManageStages && !canCreateOrEditJob) return Forbid();
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
