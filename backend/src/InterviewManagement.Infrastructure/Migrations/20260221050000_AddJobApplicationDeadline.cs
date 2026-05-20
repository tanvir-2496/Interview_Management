using System;
using InterviewManagement.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InterviewManagement.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
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
