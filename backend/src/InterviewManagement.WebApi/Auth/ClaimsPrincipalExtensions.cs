using System.Security.Claims;

namespace InterviewManagement.WebApi.Auth;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal user)
    {
        return Guid.TryParse(user.FindFirstValue("sub") ?? user.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : Guid.Empty;
    }
}
