# Interview Management (ATS-lite)

## 1) Architecture (Brief)
- Monorepo with `backend` (ASP.NET Core 8 Web API, Clean Architecture layering) and `frontend` (Next.js App Router TypeScript app).
- Public careers portal and internal portals are in the same Next.js app, separated by route groups/layouts.
- Backend uses EF Core + PostgreSQL, JWT + refresh tokens, RBAC permission checks, Serilog logging, FluentValidation, Hangfire jobs (email/reminder/resume parse), Swagger docs.
- File storage is local disk (`/uploads`) with DB metadata (`CandidateResumes`).
- Calendar integration is mock via `ICalendarService` with fake external event records persisted to DB.
- DB stores UTC timestamps; frontend utility renders important times in Asia/Dhaka timezone.

## 2) Full Folder Structure
```txt
.
|-- backend/
|   |-- InterviewManagement.sln
|   |-- .env.example
|   |-- Dockerfile
|   |-- src/
|   |   |-- InterviewManagement.Domain/
|   |   |   |-- Common/BaseEntity.cs
|   |   |   |-- Enums/Enums.cs
|   |   |   |-- Entities/Entities.cs
|   |   |-- InterviewManagement.Application/
|   |   |   |-- DTOs/Requests.cs
|   |   |   |-- Interfaces/Interfaces.cs
|   |   |   |-- Validators/Validators.cs
|   |   |-- InterviewManagement.Infrastructure/
|   |   |   |-- Persistence/AppDbContext.cs
|   |   |   |-- Services/Services.cs
|   |   |-- InterviewManagement.WebApi/
|   |   |   |-- Program.cs
|   |   |   |-- appsettings.json
|   |   |   |-- Auth/ClaimsPrincipalExtensions.cs
|   |   |   |-- Extensions/ControllerPermissionExtensions.cs
|   |   |   |-- Controllers/*.cs
|   |-- tests/InterviewManagement.Tests/
|       |-- CoreTests.cs
|-- frontend/
|   |-- .env.example
|   |-- Dockerfile
|   |-- package.json
|   |-- tailwind.config.ts
|   |-- app/
|   |   |-- layout.tsx
|   |   |-- page.tsx
|   |   |-- (public)/careers/**
|   |   |-- (auth)/login/page.tsx
|   |   |-- (admin)/**
|   |   |-- (interviewer)/**
|   |-- components/
|   |   |-- AppShell.tsx
|   |   |-- HiringFunnel.tsx
|   |   |-- RichEditor.tsx
|   |-- lib/
|       |-- api.ts
|       |-- utils.ts
|-- docker-compose.yml
|-- uploads/
```

## 3) Code Files with Paths
Implemented in all files listed above. Core backend APIs are in:
- `backend/src/InterviewManagement.WebApi/Controllers/AuthController.cs`
- `backend/src/InterviewManagement.WebApi/Controllers/JobsController.cs`
- `backend/src/InterviewManagement.WebApi/Controllers/PublicJobsController.cs`
- `backend/src/InterviewManagement.WebApi/Controllers/CandidatesController.cs`
- `backend/src/InterviewManagement.WebApi/Controllers/InterviewsController.cs`
- `backend/src/InterviewManagement.WebApi/Controllers/ScorecardsController.cs`
- `backend/src/InterviewManagement.WebApi/Controllers/SettingsController.cs`
- `backend/src/InterviewManagement.WebApi/Controllers/AnalyticsController.cs`

## 4) Setup Steps and Commands
### Prerequisites
- .NET 8 SDK
- Node 20+
- PostgreSQL 16+

### Local Run
```bash
# backend
cd backend
dotnet restore
dotnet ef migrations add InitialCreate -p src/InterviewManagement.Infrastructure -s src/InterviewManagement.WebApi
dotnet ef database update -p src/InterviewManagement.Infrastructure -s src/InterviewManagement.WebApi
dotnet run --project src/InterviewManagement.WebApi

# frontend
cd ../frontend
npm install
npm run dev
```

### Docker
```bash
docker compose up --build
```

## 5) Sample API Calls (curl)
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.local","password":"Admin@12345"}'

# Create Job
curl -X POST http://localhost:5000/api/jobs \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Backend Engineer","department":"Engineering","salaryRangeMin":50000,"salaryRangeMax":100000,"locationType":1,"locationText":"Dhaka","employmentType":1,"experienceLevel":2,"jobCode":"BE-001","vacancyCount":2,"descriptionHtml":"<p>Build APIs</p>","requirementsHtml":"<p>.NET + SQL</p>","descriptionJson":"{}","requirementsJson":"{}"}'

# Submit for approval
curl -X POST http://localhost:5000/api/jobs/<jobId>/submit-for-approval -H "Authorization: Bearer <token>"

# Approve
curl -X POST http://localhost:5000/api/jobs/<jobId>/approve -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{}'

# Public jobs
curl http://localhost:5000/api/public/jobs

# Apply with resume
curl -X POST http://localhost:5000/api/public/jobs/<jobId>/apply \
  -F "fullName=John Doe" -F "email=john@example.com" -F "phone=0170000000" -F "source=Portal" -F "overrideDuplicate=false" \
  -F "resume=@./resume.pdf"
```

## 6) Seed Credentials
- Admin email: `admin@demo.local`
- Admin password: `Admin@12345`

## Production Notes (Docker/VPS)
- Put Nginx/Caddy in front for TLS and reverse proxy (`/` -> frontend:3000, `/api` -> backend:5000).
- Persist uploads volume (`./uploads:/app/uploads`) and postgres volume (`postgres_data`).
- Store secrets in environment variables (JWT, DB password, SMTP credentials).
- Enable regular PostgreSQL backups (cron + `pg_dump`) and offsite retention.
- Restrict Hangfire dashboard in production behind auth/IP allowlist.
