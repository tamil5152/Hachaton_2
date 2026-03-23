# Hackathon Collaboration Platform

This project is built with:
- **Frontend**: React (Vite)
- **Backend**: Spring Boot (Java 21, Maven)
- **Database**: H2 (In-memory/File-based)
- **Deployment**: Docker & Docker Compose

## Quick Start (One-Command Setup)

Follow these steps to run the application locally:

```bash
git clone <repository-url>
cd platform
cp .env.example .env
docker compose up --build
```

- The UI will be available at `http://localhost`
- The backend API will be running at `http://localhost/api` (proxied by Nginx)

## Contribution Guide

1. Create your feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add some amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request
