# Patch Notes — Video Game Collection Diary

A single-page web app for cataloging your personal video game collection. Track physical and digital titles, their status, and notes. Everything saves to `localStorage` — no backend, no login.

## Features

- **Add, edit, delete** game entries
- **Status tracking**: Not Started / In Progress / Completed / Dropped
- **Format tag**: Physical or Digital
- **Optional note** per game (e.g. "stuck on the final boss")
- **Summary bar** with live counts by status
- **Persistent** across page refreshes via `localStorage`
- **Dark/light mode** follows system preference
- **Keyboard accessible** with proper labels and focus styles

## Quick start

Just open `index.html` in a browser. No build step, no install.

```bash
# or serve locally with anything, e.g.:
python -m http.server 5500
# then visit http://localhost:5500
```

## Tech

- Vanilla HTML, CSS, JavaScript
- No frameworks, no dependencies
- `crypto.randomUUID()` for IDs (native browser API)
- One `localStorage` key: `patch-notes.games`

## Data model

```js
{
  id: "uuid",
  title: "Outer Wilds",
  platform: "Switch",
  format: "physical" | "digital",
  status: "not_started" | "in_progress" | "completed" | "dropped",
  note: "stuck on Giant's Deep"
}
```

## Files

- `index.html` — markup
- `styles.css` — layout and theming
- `app.js` — state, CRUD, render, persistence

## Backup your data

`localStorage` is per-browser. To back up, open DevTools console:

```js
copy(localStorage.getItem("patch-notes.games"))
```

Paste the JSON somewhere safe. To restore:

```js
localStorage.setItem("patch-notes.games", '<paste here>')
```
