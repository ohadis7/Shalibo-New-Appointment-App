# Shalibo Wellness — Easy!Appointments Custom Theme

Custom CSS/JS overlay injected into the EA Docker image for Shalibo Wellness.

## Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Builds the custom EA image — injects all CSS/JS into booking_layout.php |
| `custom.css` | Full booking page theme (cream + teal brand, RTL Hebrew, calendar fix) |
| `booking-inject.js` | Injects SW logo into header; filters service dropdown by provider URL param |
| `login-override.css` | Admin login page redesign |
| `login-inject.js` | Injects SW logo into admin login page |
| `landing.html` | Public booking hub at /landing.html — links to each provider |
| `build-and-push.ps1` | Builds Docker image, pushes to ECR, forces ECS redeploy |

## Deploy

### Prerequisites
- Docker Desktop running
- AWS CLI configured (profile: `shalibo-eb-manage`)
- WSL updated: `wsl --update`

### Run deploy
```powershell
cd C:\path\to\shalibo-ea-custom
.\build-and-push.ps1
```

## AWS Infrastructure

| Resource | Value |
|----------|-------|
| Region | eu-central-1 |
| ECS Cluster | easyappt-cluster |
| ECS Service | easyappt-service |
| ECR Repo | 955395538866.dkr.ecr.eu-central-1.amazonaws.com/shalibo-backend |
| App URL | https://appointments.shalibowellness.com |

## Credentials
Stored in AWS SSM Parameter Store:
- `/easyappt/DB_PASS`
- `/easyappt/ADMIN_PASS`
- `/easyappt/SMTP_PASS`
- `/easyappt/DB_HOST`

Full credentials shared separately via secure channel (NOT committed to repo).

## Provider Booking Links

| Provider | URL |
|----------|-----|
| GM (Personal Training) | https://appointments.shalibowellness.com/index.php/booking?provider=18 |
| Madanes (Nails/Hair) | https://appointments.shalibowellness.com/index.php/booking?provider=37 |

## EA Admin
https://appointments.shalibowellness.com/index.php/backend
