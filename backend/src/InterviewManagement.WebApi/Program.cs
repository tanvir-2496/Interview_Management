using System.Text;
using FluentValidation;
using FluentValidation.AspNetCore;
using Hangfire;
using InterviewManagement.Application.Validators;
using InterviewManagement.Infrastructure.Persistence;
using InterviewManagement.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.IdentityModel.Tokens;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, lc) => lc.WriteTo.Console().ReadFrom.Configuration(ctx.Configuration));
builder.Services.AddHttpContextAccessor();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddControllers();
builder.Services.AddScoped<InterviewManagement.WebApi.Controllers.CandidateBackgroundJobs>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddProblemDetails();
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendDev", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<JobUpsertRequestValidator>();

builder.Services.Configure<FormOptions>(opt =>
{
    opt.MultipartBodyLengthLimit = 10 * 1024 * 1024;
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Secret"]!))
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

app.UseSerilogRequestLogging();
app.UseExceptionHandler();
app.UseSwagger();
app.UseSwaggerUI();
app.UseCors("FrontendDev");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.UseHangfireDashboard("/hangfire");

Directory.CreateDirectory(Path.Combine(Directory.GetCurrentDirectory(), "uploads"));

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var pass = scope.ServiceProvider.GetRequiredService<InterviewManagement.Application.Interfaces.IPasswordService>();
    await SeedData.InitializeAsync(db, pass);
}

app.Run();

public partial class Program { }
