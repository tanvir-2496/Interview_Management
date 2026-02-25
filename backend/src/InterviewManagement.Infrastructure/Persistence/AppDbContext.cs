using InterviewManagement.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace InterviewManagement.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Job> Jobs => Set<Job>();
    public DbSet<JobStatusHistory> JobStatusHistories => Set<JobStatusHistory>();
    public DbSet<JobApprovalAction> JobApprovalActions => Set<JobApprovalAction>();
    public DbSet<AppNotification> AppNotifications => Set<AppNotification>();
    public DbSet<JobStageConfig> JobStageConfigs => Set<JobStageConfig>();
    public DbSet<Candidate> Candidates => Set<Candidate>();
    public DbSet<CandidateResume> CandidateResumes => Set<CandidateResume>();
    public DbSet<CandidateTag> CandidateTags => Set<CandidateTag>();
    public DbSet<CandidateNote> CandidateNotes => Set<CandidateNote>();
    public DbSet<CandidateJobApplication> CandidateJobApplications => Set<CandidateJobApplication>();
    public DbSet<CandidateTimelineEvent> CandidateTimelineEvents => Set<CandidateTimelineEvent>();
    public DbSet<InterviewSession> InterviewSessions => Set<InterviewSession>();
    public DbSet<InterviewSessionInterviewer> InterviewSessionInterviewers => Set<InterviewSessionInterviewer>();
    public DbSet<ScorecardTemplate> ScorecardTemplates => Set<ScorecardTemplate>();
    public DbSet<ScorecardTemplateCriterion> ScorecardTemplateCriteria => Set<ScorecardTemplateCriterion>();
    public DbSet<Scorecard> Scorecards => Set<Scorecard>();
    public DbSet<ScorecardRating> ScorecardRatings => Set<ScorecardRating>();
    public DbSet<EmailTemplate> EmailTemplates => Set<EmailTemplate>();
    public DbSet<CompanyProfile> CompanyProfiles => Set<CompanyProfile>();
    public DbSet<EmailLog> EmailLogs => Set<EmailLog>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<ExternalCalendarEvent> ExternalCalendarEvents => Set<ExternalCalendarEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().HasIndex(x => x.Email).IsUnique();
        modelBuilder.Entity<Candidate>().HasIndex(x => x.Email);
        modelBuilder.Entity<Candidate>().HasIndex(x => x.Phone);
        modelBuilder.Entity<Role>().HasIndex(x => x.Name).IsUnique();
        modelBuilder.Entity<Permission>().HasIndex(x => x.Code).IsUnique();
        modelBuilder.Entity<Job>().HasIndex(x => x.JobCode).IsUnique();
        modelBuilder.Entity<EmailTemplate>().HasIndex(x => x.TemplateKey).IsUnique();
        modelBuilder.Entity<AppNotification>().HasIndex(x => new { x.UserId, x.IsRead, x.CreatedAtUtc });

        modelBuilder.Entity<InterviewSessionInterviewer>()
            .HasIndex(x => new { x.InterviewSessionId, x.InterviewerId }).IsUnique();

        modelBuilder.Entity<ScorecardRating>()
            .HasOne<Scorecard>()
            .WithMany(x => x.Ratings)
            .HasForeignKey(x => x.ScorecardId);

        modelBuilder.Entity<ScorecardTemplateCriterion>()
            .HasOne<ScorecardTemplate>()
            .WithMany(x => x.Criteria)
            .HasForeignKey(x => x.ScorecardTemplateId);

        base.OnModelCreating(modelBuilder);
    }
}
