using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InterviewManagement.Infrastructure.Migrations
{
    public partial class AddJobApplicationDeadline : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ApplicationDeadlineUtc",
                table: "Jobs",
                type: "timestamp with time zone",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApplicationDeadlineUtc",
                table: "Jobs");
        }
    }
}
