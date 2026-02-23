using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InterviewManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddApplicationFormJsonToCandidateJobApplication : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ApplicationFormJson",
                table: "CandidateJobApplications",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApplicationFormJson",
                table: "CandidateJobApplications");
        }
    }
}
