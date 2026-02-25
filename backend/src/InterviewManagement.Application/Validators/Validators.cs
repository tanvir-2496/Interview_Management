using FluentValidation;
using InterviewManagement.Application.DTOs;

namespace InterviewManagement.Application.Validators;

public class JobUpsertRequestValidator : AbstractValidator<JobUpsertRequest>
{
    public JobUpsertRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Department).NotEmpty();
        RuleFor(x => x.SkillsCsv).MaximumLength(1000);
        RuleFor(x => x.SalaryRangeMin)
            .GreaterThanOrEqualTo(0)
            .When(x => !x.IsSalaryNegotiable);
        RuleFor(x => x.SalaryRangeMax)
            .GreaterThanOrEqualTo(x => x.SalaryRangeMin)
            .When(x => !x.IsSalaryNegotiable);
        RuleFor(x => x.VacancyCount).GreaterThan(0);
        RuleForEach(x => x.InterviewStages!).ChildRules(stage =>
        {
            stage.RuleFor(s => s.StageName).NotEmpty().MaximumLength(120);
            stage.RuleFor(s => s.StageOrder).GreaterThan(0);
        }).When(x => x.InterviewStages is not null);
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
