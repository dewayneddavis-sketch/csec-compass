# 🧭 CSEC Compass

**Your self-paced CSEC exam prep platform.** Interactive lessons, experiment-driven tools, and knowledge checks for CSEC subjects.

## Features

- **14 CSEC Subjects** — Mathematics, English A, Biology, Chemistry, Physics, and more
- **Interactive Experiments** — Graphing Calculator, Drag & Drop Labeling, and more
- **Knowledge Checks** — End-of-subject quizzes with instant scoring and answer review
- **Progress Tracking** — Lesson completion tracking via localStorage
- **Responsive Design** — Works on desktop, tablet, and mobile

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Vite 8 + React 19 |
| Routing | react-router-dom v7 |
| Styling | Plain CSS (no frameworks) |
| Data | JSON content files + fallback data |
| Experiments | Native Canvas / SVG |

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
csec-compass/
├── content/              # CSEC subject content (JSON)
│   ├── subjects.json     # Subject catalog
│   ├── mathematics/      # Subject folders with:
│   │   ├── metadata.json
│   │   ├── modules.json
│   │   └── knowledge-check.json
│   ├── english-a/
│   ├── biology/
│   ├── chemistry/
│   └── physics/
├── public/               # Static assets
│   └── content/          # Content JSON served at build time
├── scripts/
│   └── deploy.sh         # Deployment script
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── Navbar.jsx
│   │   ├── SubjectCard.jsx
│   │   ├── ProgressBar.jsx
│   │   ├── Quiz.jsx
│   │   ├── ExperimentSandbox.jsx
│   │   ├── GraphingCalculator.jsx
│   │   └── DragDropLabel.jsx
│   ├── pages/            # Route pages
│   │   ├── Home.jsx
│   │   ├── SubjectPage.jsx
│   │   └── LessonView.jsx
│   ├── data/
│   │   └── contentLoader.js  # Data fetching + fallback logic
│   └── App.jsx           # Root component with routing
├── netlify.toml          # Netlify deployment config
├── vercel.json           # Vercel deployment config
└── package.json
```

## Deployment

### Local (Preview Server)
```bash
npm run preview -- --host 0.0.0.0
# Serves at http://localhost:4173/
```

### Netlify
```bash
npx netlify deploy --prod --dir=dist
```

### Vercel
```bash
npx vercel --prod
```

### GitHub Pages
```bash
npx gh-pages -d dist
```

## Adding Content

1. Create a folder: `content/{subject-id}/`
2. Add `metadata.json`, `modules.json`, and `knowledge-check.json`
3. Run `cp -r content/* public/content/` to sync
4. Rebuild: `npm run build`

See existing subjects for the JSON schema.

## Architecture

- **Data flow**: Content JSON → `contentLoader.js` (fetch + fallback) → React components
- **Routing**: Home (`/`) → Subject (`/subject/:id`) → Lesson (`/lesson/:subjectId/:lessonId`)
- **Progress**: Stored in `localStorage` keyed by subject ID
- **Experiments**: The ExperimentSandbox checks the experiment type and renders the matching interactive component

## License

MIT
