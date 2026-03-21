# Tribunal Admin Dashboard

Frontend admin dashboard for the phishing detection project.

## Stack

- React
- Vite
- Tailwind CSS v4
- shadcn/ui
- Lucide icons

## Current Structure

```text
src/
  components/
    layout/    # App shell pieces such as sidebar, header, and bottom nav
    ui/        # Generated shadcn/ui components
  hooks/       # Shared React hooks
  lib/         # Utilities and dashboard seed data
  pages/       # Top-level page views
```

## Scripts

- `npm run dev`
- `npm run build`
- `npm run preview`

## Notes

- The app currently uses local component state for page switching.
- Mock data is centralized in `src/lib/dashboard-data.js` to make API integration easier later.
