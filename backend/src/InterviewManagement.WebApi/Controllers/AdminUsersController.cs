using InterviewManagement.Application.Interfaces;
using InterviewManagement.Domain.Entities;
using InterviewManagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InterviewManagement.WebApi.Controllers;

[ApiController]
[Authorize]
[Route("api/admin/users")]
public class AdminUsersController(AppDbContext db, ICurrentUserService currentUser, IPasswordService passwordService) : ControllerBase
{
    public record CreateUserRequest(string FullName, string Email, string Password, List<string> Roles);

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest req)
    {
        if (!await IsAdmin()) return Forbid();
        if (await db.Users.AnyAsync(x => x.Email == req.Email)) return Conflict("Email exists.");

        var user = new User { FullName = req.FullName, Email = req.Email, PasswordHash = passwordService.HashPassword(req.Password) };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var roles = await db.Roles.Where(r => req.Roles.Contains(r.Name)).ToListAsync();
        db.UserRoles.AddRange(roles.Select(r => new UserRole { UserId = user.Id, RoleId = r.Id }));
        await db.SaveChangesAsync();
        return Ok(user);
    }

    private async Task<bool> IsAdmin()
    {
        var roleIds = await db.UserRoles.Where(x => x.UserId == currentUser.UserId).Select(x => x.RoleId).ToListAsync();
        return await db.Roles.AnyAsync(x => roleIds.Contains(x.Id) && x.Name == "Admin");
    }
}
