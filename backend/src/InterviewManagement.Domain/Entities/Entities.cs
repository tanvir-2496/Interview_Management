using InterviewManagement.Domain.Common;
using InterviewManagement.Domain.Enums;

namespace InterviewManagement.Domain.Entities;

public class User : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public List<UserRole> UserRoles { get; set; } = new();
    public List<RefreshToken> RefreshTokens { get; set; } = new();
}

public class Role : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public List<RolePermission> RolePermissions { get; set; } = new();
}

public class Permission : BaseEntity
{
    public string Code { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class RolePermission : BaseEntity
{
    public Guid RoleId { get; set; }
    public Role Role { get; set; } = null!;
    public Guid PermissionId { get; set; }
    public Permission Permission { get; set; } = null!;
}

public class UserRole : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public Guid RoleId { get; set; }
    public Role Role { get; set; } = null!;
}

public class RefreshToken : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public bool IsRevoked { get; set; }
}

public class Job : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string SkillsCsv { get; set; } = string.Empty;
    public decimal SalaryRangeMin { get; set; }
    public decimal SalaryRangeMax { get; set; }
    public bool IsSalaryNegotiable { get; set; }
    public LocationType LocationType { get; set; }
    public string LocationText { get; set; } = string.Empty;
    public EmploymentType EmploymentType { get; set; }
    public ExperienceLevel ExperienceLevel { get; set; }
    public string JobCode { get; set; } = string.Empty;
    public int VacancyCount { get; set; }
    public string DescriptionHtml { get; set; } = string.Empty;
    public string RequirementsHtml { get; set; } = string.Empty;
    public string DescriptionJson { get; set; } = "{}";
    public string RequirementsJson { get; set; } = "{}";
    public DateTime? ApplicationDeadlineUtc { get; set; }
    public JobStatus Status { get; set; } = JobStatus.Draft;
    public string? RejectionReason { get; set; }
}

public class JobStatusHistory : BaseEntity
{
    public Guid JobId { get; set; }
    public Job Job { get; set; } = null!;
    public JobStatus FromStatus { get; set; }
    public JobStatus ToStatus { get; set; }
    public Guid ChangedByUserId { get; set; }
    public string? Reason { get; set; }
}

public class JobApprovalAction : BaseEntity
{
    public Guid JobId { get; set; }
    public Guid ActionByUserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string? Reason { get; set; }
}

public class JobStageConfig : BaseEntity
{
    public Guid JobId { get; set; }
    public string StageName { get; set; } = string.Empty;
    public int StageOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class Candidate : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public CandidateSource Source { get; set; } = CandidateSource.Portal;
    public int YearsOfExperience { get; set; }
    public ParseStatus ResumeParseStatus { get; set; } = ParseStatus.Pending;
    public DateTime? LastParsedAtUtc { get; set; }
}

public class CandidateResume : BaseEntity
{
    public Guid CandidateId { get; set; }
    public Candidate Candidate { get; set; } = null!;
    public string OriginalFileName { get; set; } = string.Empty;
    public string StoredFileName { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public long SizeInBytes { get; set; }
    public string RelativePath { get; set; } = string.Empty;
}

public class CandidateTag : BaseEntity
{
    public Guid CandidateId { get; set; }
    public string Tag { get; set; } = string.Empty;
}

public class CandidateNote : BaseEntity
{
    public Guid CandidateId { get; set; }
    public Guid UserId { get; set; }
    public string Note { get; set; } = string.Empty;
}

public class CandidateJobApplication : BaseEntity
{
    public Guid CandidateId { get; set; }
    public Guid JobId { get; set; }
    public string CurrentStage { get; set; } = "Applied";
    public ApplicationStatus Status { get; set; } = ApplicationStatus.Applied;
    public string ApplicationFormJson { get; set; } = "{}";
}

public class CandidateTimelineEvent : BaseEntity
{
    public Guid CandidateId { get; set; }
    public Guid? ApplicationId { get; set; }
    public TimelineEventType EventType { get; set; }
    public string PayloadJson { get; set; } = "{}";
}

public class InterviewSession : BaseEntity
{
    public Guid JobId { get; set; }
    public Guid CandidateId { get; set; }
    public string Stage { get; set; } = string.Empty;
    public DateTime StartAtUtc { get; set; }
    public DateTime EndAtUtc { get; set; }
    public string Timezone { get; set; } = "Asia/Dhaka";
    public string LocationOrMeetingLink { get; set; } = string.Empty;
    public List<InterviewSessionInterviewer> Interviewers { get; set; } = new();
}

public class InterviewSessionInterviewer : BaseEntity
{
    public Guid InterviewSessionId { get; set; }
    public Guid InterviewerId { get; set; }
}

public class ScorecardTemplate : BaseEntity
{
    public Guid? JobId { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<ScorecardTemplateCriterion> Criteria { get; set; } = new();
}

public class ScorecardTemplateCriterion : BaseEntity
{
    public Guid ScorecardTemplateId { get; set; }
    public string CriterionName { get; set; } = string.Empty;
}

public class Scorecard : BaseEntity
{
    public Guid InterviewSessionId { get; set; }
    public Guid InterviewerId { get; set; }
    public string PrivateNotes { get; set; } = string.Empty;
    public string Recommendation { get; set; } = string.Empty;
    public List<ScorecardRating> Ratings { get; set; } = new();
}

public class ScorecardRating : BaseEntity
{
    public Guid ScorecardId { get; set; }
    public string Criterion { get; set; } = string.Empty;
    public int Score { get; set; }
}

public class EmailTemplate : BaseEntity
{
    public string TemplateKey { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
}

public class EmailLog : BaseEntity
{
    public string ToEmail { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool Success { get; set; }
}

public class AuditLog : BaseEntity
{
    public Guid? UserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string EntityName { get; set; } = string.Empty;
    public Guid? EntityId { get; set; }
    public string PayloadJson { get; set; } = "{}";
}

public class ExternalCalendarEvent : BaseEntity
{
    public Guid InterviewSessionId { get; set; }
    public CalendarProvider Provider { get; set; }
    public string ExternalEventId { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = "{}";
}
