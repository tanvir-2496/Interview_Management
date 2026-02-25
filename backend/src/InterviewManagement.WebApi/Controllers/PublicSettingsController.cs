using InterviewManagement.Domain.Entities;
using InterviewManagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InterviewManagement.WebApi.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/public/settings")]
public class PublicSettingsController(AppDbContext db) : ControllerBase
{
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
        var profile = await db.CompanyProfiles.OrderByDescending(x => x.UpdatedAtUtc ?? x.CreatedAtUtc).FirstOrDefaultAsync();
        profile ??= CreateDefaultCompanyProfile();
        return Ok(ToCompanyProfileResponse(profile));
    }
}
