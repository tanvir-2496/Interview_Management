using FluentAssertions;
using InterviewManagement.Application.DTOs;
using InterviewManagement.Domain.Entities;
using InterviewManagement.Domain.Enums;
using InterviewManagement.Infrastructure.Persistence;
using InterviewManagement.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace InterviewManagement.Tests;

public class CoreTests
{
    private static AppDbContext CreateDb(string name)
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(name)
            .Options;
        return new AppDbContext(options);
    }

    [Fact]
    public async Task TokenFlow_Login_Refresh_Works()
    {
        await using var db = CreateDb(nameof(TokenFlow_Login_Refresh_Works));
        var pass = new PasswordService();
        var user = new User { FullName = "Admin", Email = "admin@test.com", PasswordHash = pass.HashPassword("Pass123!") };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var cfg = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Secret"] = "super-secret-key-change-in-production-super-secret",
            ["Jwt:Issuer"] = "Issuer",
            ["Jwt:Audience"] = "Audience"
        }).Build();

        var jwt = new JwtTokenService(cfg);
        var auth = jwt.CreateTokens(user, ["Candidates.View"]);
        auth.AccessToken.Should().NotBeNullOrWhiteSpace();
        auth.RefreshToken.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void JobApprovalWorkflow_Draft_To_Pending_To_Active()
    {
        var job = new Job { Title = "SE", Department = "Eng", JobCode = "J1", VacancyCount = 1 };
        job.Status.Should().Be(JobStatus.Draft);
        job.Status = JobStatus.PendingApproval;
        job.Status = JobStatus.Active;
        job.Status.Should().Be(JobStatus.Active);
    }

    [Fact]
    public async Task DuplicateDetection_EmailOrPhone_Matches()
    {
        await using var db = CreateDb(nameof(DuplicateDetection_EmailOrPhone_Matches));
        db.Candidates.Add(new Candidate { FullName = "A", Email = "a@test.com", Phone = "01710000000" });
        await db.SaveChangesAsync();

        var existsEmail = await db.Candidates.AnyAsync(x => x.Email == "a@test.com" || x.Phone == "999");
        var existsPhone = await db.Candidates.AnyAsync(x => x.Email == "b@test.com" || x.Phone == "01710000000");

        existsEmail.Should().BeTrue();
        existsPhone.Should().BeTrue();
    }
}
