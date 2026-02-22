using InterviewManagement.Application.DTOs;
using InterviewManagement.Domain.Entities;

namespace InterviewManagement.Application.Interfaces;

public interface IJwtTokenService
{
    AuthResponse CreateTokens(User user, string[] permissions);
}

public interface IPasswordService
{
    string HashPassword(string password);
    bool Verify(string hash, string password);
}

public interface ICurrentUserService
{
    Guid UserId { get; }
    bool HasPermission(string permission);
}

public interface IFileStorageService
{
    Task<(string StoredFileName, string RelativePath)> SaveAsync(Stream fileStream, string originalFileName, string folder, CancellationToken ct);
}

public interface ICalendarService
{
    Task<(string ExternalEventId, string PayloadJson)> SyncAsync(InterviewSession session, string provider, CancellationToken ct);
}

public interface IEmailService
{
    Task SendAsync(string to, string subject, string body, CancellationToken ct);
}

public interface IResumeParser
{
    Task<(string? Name, string? Email, string? Phone, int Years)> ParseAsync(string filePath, string fileName, CancellationToken ct);
}

public interface IVirusScanner
{
    Task<bool> IsSafeAsync(Stream fileStream, CancellationToken ct);
}
