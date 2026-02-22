namespace InterviewManagement.Domain.Enums;

public enum JobStatus { Draft = 1, PendingApproval = 2, Active = 3, Closed = 4 }
public enum LocationType { Remote = 1, OnSite = 2, Hybrid = 3 }
public enum EmploymentType { FullTime = 1, PartTime = 2, Contract = 3, Internship = 4 }
public enum ExperienceLevel { Junior = 1, Mid = 2, Senior = 3, Lead = 4 }
public enum ApplicationStatus { Applied = 1, InProgress = 2, Rejected = 3, Hired = 4 }
public enum CandidateSource { LinkedIn = 1, Referral = 2, WhatsApp = 3, Portal = 4, Other = 5 }
public enum ParseStatus { Pending = 1, Success = 2, Failed = 3 }
public enum CalendarProvider { MockGoogle = 1, MockOutlook = 2 }
public enum TimelineEventType { Applied = 1, StageMoved = 2, InterviewScheduled = 3, ScoreSubmitted = 4, Rejected = 5, Hired = 6, BulkAction = 7, JobApproval = 8 }
