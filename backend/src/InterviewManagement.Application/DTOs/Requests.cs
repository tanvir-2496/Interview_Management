namespace InterviewManagement.Application.DTOs;

public record LoginRequest(string Email, string Password);
public record AuthResponse(string AccessToken, string RefreshToken, DateTime ExpiresAtUtc, string[] Permissions);
public record RefreshRequest(string RefreshToken);

public record JobUpsertRequest(
    string Title,
    string Department,
    decimal SalaryRangeMin,
    decimal SalaryRangeMax,
    int LocationType,
    string LocationText,
    int EmploymentType,
    int ExperienceLevel,
    string JobCode,
    int VacancyCount,
    DateTime? ApplicationDeadlineUtc,
    string DescriptionHtml,
    string RequirementsHtml,
    string DescriptionJson,
    string RequirementsJson);

public record ApproveRejectRequest(string? Reason);
public record PublicApplyRequest(string FullName, string Email, string Phone, string Source, bool OverrideDuplicate);
public record CandidateBulkStageMoveRequest(List<Guid> CandidateIds, Guid JobId, string Stage);
public record CandidateBulkEmailRequest(List<Guid> CandidateIds, string TemplateKey);
public record InterviewCreateRequest(Guid JobId, Guid CandidateId, string Stage, DateTime StartAtUtc, DateTime EndAtUtc, string Timezone, string LocationOrMeetingLink, List<Guid> InterviewerIds);
public record ScorecardSubmitRequest(Guid InterviewSessionId, List<RatingDto> Ratings, string PrivateNotes, string Recommendation);
public record RatingDto(string Criterion, int Score);
