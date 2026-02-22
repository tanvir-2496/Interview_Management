using InterviewManagement.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace InterviewManagement.WebApi.Extensions;

public static class ControllerPermissionExtensions
{
    public static bool EnsurePermission(this ControllerBase controller, ICurrentUserService currentUser, string code)
    {
        if (currentUser.HasPermission(code)) return true;
        controller.Problem(title: "Forbidden", detail: $"Missing permission: {code}", statusCode: 403);
        return false;
    }
}
