using FluentValidation;
using InterviewManagement.Application.DTOs;

namespace InterviewManagement.Application.Validators;

public class JobUpsertRequestValidator : AbstractValidator<JobUpsertRequest>
{
    public JobUpsertRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Department).NotEmpty();
        RuleFor(x => x.SalaryRangeMin).GreaterThanOrEqualTo(0);
        RuleFor(x => x.SalaryRangeMax).GreaterThanOrEqualTo(x => x.SalaryRangeMin);
        RuleFor(x => x.VacancyCount).GreaterThan(0);
    }
}

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}
