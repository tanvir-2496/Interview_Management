FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore ./src/InterviewManagement.WebApi/InterviewManagement.WebApi.csproj
RUN dotnet publish ./src/InterviewManagement.WebApi/InterviewManagement.WebApi.csproj -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends libreoffice-core libreoffice-writer fonts-dejavu \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/publish .
EXPOSE 5000
ENTRYPOINT ["dotnet", "InterviewManagement.WebApi.dll"]
