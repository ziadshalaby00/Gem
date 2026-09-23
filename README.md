# 💪 Gem — Workout Plan

A lightweight, offline-first Progressive Web App (PWA) for tracking your workout program. No backend, no database, no sign-up — everything runs client-side and lives in your browser.

<img width="1279" height="900" alt="Gem screenshot" src="https://github.com/user-attachments/assets/d5324d74-e6a3-4e1e-b00f-fe84d0f45973" />

---

## ✨ Features

- **Multiple workout days** (Pull, Push, Legs, Full Body, Upper, Lower, Home routines, Stretches) — fully editable.
- **Per-exercise tracking**: sets, reps, and max weight (with a "Both sides / One side" toggle for unilateral exercises).
- **Add, edit, and delete exercises** inline, with a modal editor for full rows.
- **Start date tracking** via a native date picker, used to show how long you've been on the program.
- **Offline support** — installable as a PWA, works with no internet connection thanks to a Service Worker cache.
- **Local persistence** — all your data is saved automatically to `localStorage`, no account needed.
- **Export / Import** — back up or transfer your data as a JSON file.
- **Optional Google Drive backup** — keep a copy of your data safe in the cloud, in addition to (or instead of) a local file.

---

## 🗂️ Project Structure

```
Gem/
├── index.html          Main HTML shell
├── logic.js             Core app logic: rendering, local storage, modals, popups
├── export-import.js      Local export/import (JSON file) logic
├── drive-sync.js         Optional Google Drive backup logic
├── import-menu.js         Import source chooser (device / Drive)
├── style.css             All styling
├── workoutData.json       Default workout program data (days, exercises, columns)
├── manifest.json          PWA manifest (icons, theme, display mode)
├── service-worker.js      Offline caching
├── LICENSE                MIT License (+ branding note)
└── README.md
```

---

## 🚀 Getting Started

This is a fully static site — no build step, no dependencies to install.

1. Clone or download the repository.
2. Serve the folder with any static file server (needed for the Service Worker and `fetch` calls to work), for example:
   ```bash
   npx serve .
   # or
   python -m http.server 5000
   ```
3. Open the served URL in your browser (e.g. `http://localhost:5000`).
4. (Optional) Install it as a PWA using your browser's "Install app" option for an app-like, offline experience.

> Opening `index.html` directly via `file://` won't work correctly — `fetch('./workoutData.json')` and the Service Worker both require an HTTP server.

---

## 📊 Data Model

The app's default program lives in `workoutData.json`. Each "day" has:

```json
{
  "id": "pull",
  "day": "Pull",
  "title": "Pull Day",
  "icon": "dumbbell",
  "columns": ["Exercise", "Sets", "Reps", "Max Weight"],
  "exercises": []
}
```

Once you start editing in the app, your changes are saved to `localStorage` per day (`workout_day_<id>`) and override the defaults from `workoutData.json` — the JSON file itself is never modified at runtime.

---

## 💾 Export / Import (Local)

- **Export** downloads your current data as `workout-backup-YYYY-MM-DD.json`.
- **Import** reads a previously exported JSON file and replaces your current data (with a confirmation prompt first).

This is the primary way to move your data between devices or keep a manual backup.

---

## ☁️ Google Drive Backup (optional)

In addition to local export, you can back up your data straight to Google Drive:

- Click **Export → Export to Drive** (or **Export to Both**) to save your data to a file named `workout-backup.json` in your Drive.
- First use requires a one-time Google sign-in. The app only requests the [`drive.file`](https://developers.google.com/drive/api/guides/api-specific-auth) scope, so it can only see/edit the single backup file it creates — nothing else in your Drive.
- Every following export updates that same file instead of creating duplicates.

Restore from Drive: Click Import → Import from Drive to restore your data from the cloud backup. You'll be asked to confirm before your local data is replaced.

### Enabling it in your own deployment

1. Create a project in [Google Cloud Console](https://console.cloud.google.com).
2. Enable the **Google Drive API**.
3. Set up the **OAuth consent screen** (add the `drive.file` scope).
4. Create an **OAuth Client ID → Web application**, adding your site's URL(s) under **Authorized JavaScript origins**.
5. Paste your Client ID into `DRIVE_CLIENT_ID` in `drive-sync.js`.

---

## 🛠️ Tech Stack

Plain HTML, CSS, and vanilla JavaScript — no frameworks, no build tools. Uses:
- [Google Identity Services](https://developers.google.com/identity/gsi/web/guides/overview) for optional Drive sign-in
- [Google Drive API v3](https://developers.google.com/drive/api/v3/reference) for the optional cloud backup
- The [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest) + Service Worker for PWA/offline support

---

## 📄 License

Developed entirely by [Ziad Shalaby](https://github.com/ziadshalaby00).

Licensed under the **MIT License** — see [`LICENSE`](./LICENSE) for details.

> The project name, logo, icons, and branding are **not** covered by the MIT License and remain the property of Ziad Ahmed Shalaby (see `LICENSE` for the full branding notice).