using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InterviewManagement.Infrastructure.Migrations
{
    [Migration("20260221050000_AddJobApplicationDeadline")]
    public partial class AddJobApplicationDeadline : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "Jobs"
                ADD COLUMN IF NOT EXISTS "ApplicationDeadlineUtc" timestamp with time zone NULL;
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "Jobs"
                DROP COLUMN IF EXISTS "ApplicationDeadlineUtc";
                """);
        }
    }
}
