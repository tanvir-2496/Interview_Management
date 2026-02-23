using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InterviewManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddJobSkillsCsv : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SkillsCsv",
                table: "Jobs",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SkillsCsv",
                table: "Jobs");
        }
    }
}
