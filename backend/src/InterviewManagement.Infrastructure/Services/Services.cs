using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Hangfire;
using Hangfire.PostgreSql;
using InterviewManagement.Application.DTOs;
using InterviewManagement.Application.Interfaces;
using InterviewManagement.Domain.Entities;
using InterviewManagement.Domain.Enums;
using InterviewManagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;

namespace InterviewManagement.Infrastructure.Services;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(opt =>
            opt.UseNpgsql(configuration.GetConnectionString("DefaultConnection")));

        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IPasswordService, PasswordService>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();
        services.AddScoped<IFileStorageService, LocalFileStorageService>();
        services.AddScoped<IEmailService, ConsoleEmailService>();
        services.AddScoped<IResumeParser, StubResumeParser>();
        services.AddScoped<IVirusScanner, StubVirusScanner>();
        services.AddScoped<MockGoogleCalendarService>();
        services.AddScoped<MockOutlookCalendarService>();
        services.AddScoped<ICalendarService, MultiplexCalendarService>();

        services.AddHangfire(cfg => cfg.UsePostgreSqlStorage(c => c.UseNpgsqlConnection(configuration.GetConnectionString("DefaultConnection"))));
        services.AddHangfireServer();

        return services;
    }
}

public class JwtTokenService(IConfiguration configuration) : IJwtTokenService
{
    public AuthResponse CreateTokens(User user, string[] permissions)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:Secret"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expires = DateTime.UtcNow.AddMinutes(30);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new("name", user.FullName),
            new("permissions", string.Join(',', permissions))
        };

        var token = new JwtSecurityToken(
            issuer: configuration["Jwt:Issuer"],
            audience: configuration["Jwt:Audience"],
            claims: claims,
            expires: expires,
            signingCredentials: creds);

        var refreshBytes = RandomNumberGenerator.GetBytes(32);
        var refresh = Convert.ToBase64String(refreshBytes);

        return new AuthResponse(new JwtSecurityTokenHandler().WriteToken(token), refresh, expires, permissions);
    }
}

public class PasswordService : IPasswordService
{
    public string HashPassword(string password) => BCrypt.Net.BCrypt.HashPassword(password);
    public bool Verify(string hash, string password) => BCrypt.Net.BCrypt.Verify(password, hash);
}

public class CurrentUserService(IHttpContextAccessor accessor, AppDbContext db) : ICurrentUserService
{
    public Guid UserId
    {
        get
        {
            var user = accessor.HttpContext?.User;
            var idValue =
                user?.FindFirstValue(JwtRegisteredClaimNames.Sub) ??
                user?.FindFirstValue(ClaimTypes.NameIdentifier) ??
                user?.FindFirstValue("sub");

            return Guid.TryParse(idValue, out var id) ? id : Guid.Empty;
        }
    }

    public bool HasPermission(string permission)
    {
        if (UserId == Guid.Empty) return false;
        return db.UserRoles.Where(x => x.UserId == UserId)
            .Join(db.RolePermissions, ur => ur.RoleId, rp => rp.RoleId, (ur, rp) => rp)
            .Join(db.Permissions, rp => rp.PermissionId, p => p.Id, (rp, p) => p.Code)
            .Any(c => c == permission);
    }
}

public class LocalFileStorageService(IConfiguration configuration) : IFileStorageService
{
    public async Task<(string StoredFileName, string RelativePath)> SaveAsync(Stream fileStream, string originalFileName, string folder, CancellationToken ct)
    {
        var root = configuration["Uploads:RootPath"] ?? Path.Combine(Directory.GetCurrentDirectory(), "uploads");
        var dir = Path.Combine(root, folder);
        Directory.CreateDirectory(dir);
        var ext = Path.GetExtension(originalFileName);
        var name = $"{Guid.NewGuid():N}{ext}";
        var path = Path.Combine(dir, name);
        await using var stream = File.Create(path);
        await fileStream.CopyToAsync(stream, ct);
        return (name, Path.Combine(folder, name).Replace("\\", "/"));
    }
}

public class StubResumeParser : IResumeParser
{
    public Task<(string? Name, string? Email, string? Phone, int Years)> ParseAsync(string filePath, string fileName, CancellationToken ct)
    {
        var name = Path.GetFileNameWithoutExtension(fileName).Replace("_", " ");
        var years = fileName.Any(char.IsDigit) ? int.Parse(new string(fileName.Where(char.IsDigit).Take(2).ToArray()).DefaultIfEmpty('0').Aggregate("", (a, c) => a + c)) : 0;
        return Task.FromResult<(string?, string?, string?, int)>((name, null, null, years));
    }
}

public class StubVirusScanner : IVirusScanner
{
    public Task<bool> IsSafeAsync(Stream fileStream, CancellationToken ct) => Task.FromResult(true);
}

public class ConsoleEmailService : IEmailService
{
    public Task SendAsync(string to, string subject, string body, CancellationToken ct)
    {
        Console.WriteLine($"EMAIL TO: {to}\nSUBJECT: {subject}\n{body}");
        return Task.CompletedTask;
    }
}

public class MockGoogleCalendarService : ICalendarService
{
    public Task<(string ExternalEventId, string PayloadJson)> SyncAsync(InterviewSession session, string provider, CancellationToken ct)
        => Task.FromResult(($"gcal_{Guid.NewGuid():N}", $"{{\"provider\":\"google\",\"sessionId\":\"{session.Id}\"}}"));
}

public class MockOutlookCalendarService : ICalendarService
{
    public Task<(string ExternalEventId, string PayloadJson)> SyncAsync(InterviewSession session, string provider, CancellationToken ct)
        => Task.FromResult(($"ocal_{Guid.NewGuid():N}", $"{{\"provider\":\"outlook\",\"sessionId\":\"{session.Id}\"}}"));
}

public class MultiplexCalendarService(MockGoogleCalendarService google, MockOutlookCalendarService outlook) : ICalendarService
{
    public Task<(string ExternalEventId, string PayloadJson)> SyncAsync(InterviewSession session, string provider, CancellationToken ct)
        => provider.Equals("outlook", StringComparison.OrdinalIgnoreCase)
            ? outlook.SyncAsync(session, provider, ct)
            : google.SyncAsync(session, provider, ct);
}

public static class SeedData
{
    public static async Task InitializeAsync(AppDbContext db, IPasswordService passwordService)
    {
        await db.Database.MigrateAsync();

        if (!db.Permissions.Any())
        {
            var codes = new[]
            {
                "Jobs.Create","Jobs.Edit","Jobs.SubmitForApproval","Jobs.Approve","Jobs.Reject","Jobs.Publish","Jobs.Unpublish","Jobs.Close",
                "Candidates.View","Candidates.Edit","Candidates.MoveStage","Candidates.BulkActions","Candidates.ParseResume",
                "Interviews.Schedule","Interviews.Update","Interviews.Cancel","Interviews.View","Interviews.SubmitScorecard",
                "Analytics.ViewReports","Settings.ManageTemplates","Settings.ManageStages"
            };
            db.Permissions.AddRange(codes.Select(c => new Permission { Code = c, Description = c }));
            await db.SaveChangesAsync();
        }

        if (!db.Roles.Any())
        {
            var roles = new[] { "Admin", "HRHead", "HiringManager", "Recruiter", "Interviewer" }
                .Select(x => new Role { Name = x }).ToList();
            db.Roles.AddRange(roles);
            await db.SaveChangesAsync();

            var permissions = db.Permissions.ToList();
            var admin = roles.Single(r => r.Name == "Admin");
            var hr = roles.Single(r => r.Name == "HRHead");
            var hm = roles.Single(r => r.Name == "HiringManager");
            var rec = roles.Single(r => r.Name == "Recruiter");
            var iv = roles.Single(r => r.Name == "Interviewer");

            db.RolePermissions.AddRange(permissions.Select(p => new RolePermission { RoleId = admin.Id, PermissionId = p.Id }));
            db.RolePermissions.AddRange(permissions.Where(p => p.Code.StartsWith("Jobs.") || p.Code.StartsWith("Candidates.") || p.Code.StartsWith("Interviews.") || p.Code.StartsWith("Analytics.") || p.Code.StartsWith("Settings."))
                .Select(p => new RolePermission { RoleId = hr.Id, PermissionId = p.Id }));
            db.RolePermissions.AddRange(permissions.Where(p => p.Code is "Jobs.Create" or "Jobs.Edit" or "Jobs.SubmitForApproval" or "Candidates.View" or "Interviews.View")
                .Select(p => new RolePermission { RoleId = hm.Id, PermissionId = p.Id }));
            db.RolePermissions.AddRange(permissions.Where(p => p.Code.StartsWith("Candidates.") || p.Code.StartsWith("Interviews.") || p.Code is "Jobs.View" || p.Code is "Jobs.Create" || p.Code is "Jobs.Edit")
                .Select(p => new RolePermission { RoleId = rec.Id, PermissionId = p.Id }));
            db.RolePermissions.AddRange(permissions.Where(p => p.Code is "Interviews.View" or "Interviews.SubmitScorecard")
                .Select(p => new RolePermission { RoleId = iv.Id, PermissionId = p.Id }));
            await db.SaveChangesAsync();
        }

        if (!db.Users.Any(u => u.Email == "admin@demo.local"))
        {
            var adminRole = db.Roles.Single(r => r.Name == "Admin");
            var admin = new User
            {
                FullName = "Demo Admin",
                Email = "admin@demo.local",
                PasswordHash = passwordService.HashPassword("Admin@12345")
            };
            db.Users.Add(admin);
            await db.SaveChangesAsync();
            db.UserRoles.Add(new UserRole { UserId = admin.Id, RoleId = adminRole.Id });
        }

        if (!db.EmailTemplates.Any())
        {
            db.EmailTemplates.AddRange(
                new EmailTemplate { TemplateKey = "Applied", Subject = "Application Received", Body = "Hi {{CandidateName}}, we received your application for {{JobTitle}}." },
                new EmailTemplate { TemplateKey = "Shortlisted", Subject = "Shortlisted", Body = "Hi {{CandidateName}}, you are shortlisted for {{JobTitle}}." },
                new EmailTemplate { TemplateKey = "InvitedForInterview", Subject = "Interview Invite", Body = "Interview on {{InterviewDateTime}} for {{JobTitle}}." },
                new EmailTemplate { TemplateKey = "Rejected", Subject = "Update", Body = "Hi {{CandidateName}}, thanks for applying to {{CompanyName}}." }
            );
        }

        await db.SaveChangesAsync();
    }
}

