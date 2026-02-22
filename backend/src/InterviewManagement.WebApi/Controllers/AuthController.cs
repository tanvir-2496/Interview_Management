using InterviewManagement.Application.DTOs;
using InterviewManagement.Application.Interfaces;
using InterviewManagement.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InterviewManagement.WebApi.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, IPasswordService passwordService, IJwtTokenService tokenService) : ControllerBase
{
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        var user = await db.Users.SingleOrDefaultAsync(x => x.Email == request.Email && x.IsActive);
        if (user is null || !passwordService.Verify(user.PasswordHash, request.Password))
            return Unauthorized();

        var permissions = await db.UserRoles.Where(ur => ur.UserId == user.Id)
            .Join(db.RolePermissions, ur => ur.RoleId, rp => rp.RoleId, (_, rp) => rp)
            .Join(db.Permissions, rp => rp.PermissionId, p => p.Id, (_, p) => p.Code)
            .Distinct().ToArrayAsync();

        var auth = tokenService.CreateTokens(user, permissions);
        db.RefreshTokens.Add(new Domain.Entities.RefreshToken
        {
            UserId = user.Id,
            Token = auth.RefreshToken,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(7)
        });
        await db.SaveChangesAsync();

        return Ok(auth);
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh([FromBody] RefreshRequest request)
    {
        var refresh = await db.RefreshTokens.Include(x => x.User)
            .SingleOrDefaultAsync(x => x.Token == request.RefreshToken && !x.IsRevoked && x.ExpiresAtUtc > DateTime.UtcNow);
        if (refresh is null) return Unauthorized();

        refresh.IsRevoked = true;
        var permissions = await db.UserRoles.Where(ur => ur.UserId == refresh.UserId)
            .Join(db.RolePermissions, ur => ur.RoleId, rp => rp.RoleId, (_, rp) => rp)
            .Join(db.Permissions, rp => rp.PermissionId, p => p.Id, (_, p) => p.Code)
            .Distinct().ToArrayAsync();
        var auth = tokenService.CreateTokens(refresh.User, permissions);
        db.RefreshTokens.Add(new Domain.Entities.RefreshToken { UserId = refresh.UserId, Token = auth.RefreshToken, ExpiresAtUtc = DateTime.UtcNow.AddDays(7) });
        await db.SaveChangesAsync();
        return Ok(auth);
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest request)
    {
        var refresh = await db.RefreshTokens.SingleOrDefaultAsync(x => x.Token == request.RefreshToken);
        if (refresh is null) return NoContent();
        refresh.IsRevoked = true;
        await db.SaveChangesAsync();
        return NoContent();
    }
}
