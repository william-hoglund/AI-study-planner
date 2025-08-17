Implemented improvements in this update

Backend
- Rate limiting on plan endpoints (express-rate-limit)
- File upload endpoint POST /api/plan/upload (multer 2.x)
- Health endpoint exposes hasAI and port
- ICS export includes default VALARM 10 minutes before
- .env.example added

Frontend
- LocalStorage persistence for schedule and priorities, with backend sync when available
- Navbar shows backend status (green dot connected, red offline)
- ScheduleOptimizer UI: choose study technique and optional AI enhancement
- Typo fix: ScheduleInput component renamed

Next candidates (not yet implemented)
- Drag-and-drop editor for plan blocks
- DB persistence (SQLite/Prisma)
- Google Calendar integration
- Plan variants with explanations
- PWA + push notifications
