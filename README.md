<div align="center">

# NeuroNote

**Turn pasted text, PDFs, web articles, and YouTube page content into AI-generated notes, flashcards, quizzes, and summaries.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-neuro--note--app.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://neuro-note-app.vercel.app/)

![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.2-000000?style=for-the-badge&logo=express&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20.19%2B%20%7C%2022.12%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Optional-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-Llama%203.3%2070B-F55036?style=for-the-badge)

</div>

---

## Features

- **Multi-Source Ingestion** — Generate study materials from pasted text, client-side PDF extraction (`pdfjs-dist`), web articles, and YouTube page content.
- **AI Study Suite** — Produces structured notes, interactive flashcards, multiple-choice quizzes, and concise summaries in a single pass.
- **Large Document Chunking** — Automatically splits documents over 24,000 characters (up to 500,000 characters) into sections and synthesizes combined summaries.
- **Flexible Storage** — Supports MongoDB for multi-instance deployments or automatic fallback to atomic local JSON storage (`local_db.json`).
- **Guest & Authenticated Modes** — Guest study sets persist in browser `localStorage`; signed-in users sync their library to the backend API with JWT authentication.
- **Library Management** — Search saved study sets by title or source type with owner-scoped deletion.

---

## Tech Stack

| Layer           | Technologies                                                                                                                                                                                                                                                                                                                                                                                                                        |
| :-------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend**    | ![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white) ![PDF.js](https://img.shields.io/badge/pdfjs--dist-4.4-EC1C24?style=flat-square)                            |
| **Backend**     | ![Node.js](https://img.shields.io/badge/Node.js-20.19%2B%20%7C%2022.12%2B-339933?style=flat-square&logo=nodedotjs&logoColor=white) ![Express](https://img.shields.io/badge/Express-5.2-000000?style=flat-square&logo=express&logoColor=white) ![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=flat-square&logo=jsonwebtokens&logoColor=white) ![bcrypt](https://img.shields.io/badge/bcrypt-6.0-003A70?style=flat-square) |
| **Database**    | ![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%209-47A248?style=flat-square&logo=mongodb&logoColor=white) ![JSON](https://img.shields.io/badge/Local%20JSON-Fallback-555555?style=flat-square&logo=json&logoColor=white)                                                                                                                                                                                                  |
| **AI Provider** | ![Groq](https://img.shields.io/badge/Groq%20API-llama--3.3--70b--versatile-F55036?style=flat-square)                                                                                                                                                                                                                                                                                                                                |

---

## Local Setup

Requires **Node.js 20.19+ or 22.12+** and **npm**. MongoDB is optional for local development.

1. **Install dependencies** for both the frontend and backend:

   ```bash
   npm ci
   npm ci --prefix server
   ```

2. **Create your environment file** from the template:

   ```bash
   cp .env.example .env
   ```

3. **Configure secrets** in `.env`:
   - Set `GROQ_API_KEY` (required for AI generation; login and local library features work without it).
   - Set a long, random `JWT_SECRET`. You can generate one with:
     ```bash
     node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
     ```

4. **Start the development servers**:
   ```bash
   npm run dev
   ```
   Open the URL printed by Vite. Keep this terminal running.

> [!NOTE]
> The frontend calls `/api`, which Vite proxies to the local backend using `PORT` from `.env` (`5000` by default). To run the processes separately, use `npm run server` and `npm run dev:web` in separate terminals. For deployed frontends, configure a reverse proxy for `/api` or set `VITE_API_URL` before building.

---

## Environment Variables

| Variable       | Scope    | Default                               | Description                                                   |
| :------------- | :------- | :------------------------------------ | :------------------------------------------------------------ |
| `GROQ_API_KEY` | Server   | —                                     | Groq API key for AI generation                                |
| `GROQ_MODEL`   | Server   | `llama-3.3-70b-versatile`             | Groq model used for generation                                |
| `JWT_SECRET`   | Server   | —                                     | Required secret for signing JWT tokens                        |
| `MONGODB_URI`  | Server   | `mongodb://127.0.0.1:27017/neuronote` | MongoDB connection string (falls back to JSON if unavailable) |
| `PORT`         | Server   | `5000`                                | Port for the Express API server                               |
| `VITE_API_URL` | Frontend | `/api`                                | Public API base URL for browser requests                      |

> [!WARNING]
> AI requests run exclusively through the backend. Never add a `VITE_` prefix to credentials (`GROQ_API_KEY`, `JWT_SECRET`), as `VITE_` variables are exposed in browser builds. Restart both processes after updating `.env`.

---

## Storage & Persistence

- **Backend Selection**: At startup, the server attempts to connect to MongoDB and falls back to `local_db.json` if MongoDB is not running. Use a single server process with local JSON storage, or MongoDB for multi-instance deployments. Storage backends are independent and data is not migrated automatically between them.
- **Atomic Local Writes**: Writes to `local_db.json` preserve the previous valid state in `local_db.json.bak`, flush a temporary file, and rename it into place. Invalid JSON or schema mismatches raise an error instead of resetting the database.
- **Client vs. Server**: Guest study sets are stored in browser `localStorage`; authenticated study sets are persisted through the API.

---

## Generation Limits

| Constraint               | Limit                                       |
| :----------------------- | :------------------------------------------ |
| Maximum document length  | `500,000` characters                        |
| Chunking threshold       | `24,000` characters (processed in sections) |
| Rate limit (generation)  | `10` requests per `15` minutes per IP       |
| Rate limit (general API) | `100` requests per `15` minutes per IP      |
| Provider request timeout | `90` seconds per request                    |

- Notes retain section-level detail; flashcards, quizzes, and the overall summary are built from combined section summaries (with additional reduction for very large documents).
- Requested card and question counts apply to the whole document.
- Every generated section is validated before returning; if any section fails, the entire request fails.
- Scanned PDFs require OCR / text recognition before upload.

---

## API Endpoints

| Method   | Endpoint           | Auth       | Description                                      |
| :------- | :----------------- | :--------- | :----------------------------------------------- |
| `GET`    | `/api/health`      | Public     | Health check (`{ "status": "ok" }`)              |
| `POST`   | `/api/auth/signup` | Public     | Register a new user account                      |
| `POST`   | `/api/auth/login`  | Public     | Authenticate and receive a JWT                   |
| `POST`   | `/api/auth/google` | Public     | Authenticate with a Google ID token              |
| `POST`   | `/api/generate`    | Public     | Generate notes, flashcards, quizzes, and summary |
| `GET`    | `/api/library`     | Bearer JWT | Fetch saved study sets for the current user      |
| `POST`   | `/api/library`     | Bearer JWT | Save a study set to the user's library           |
| `DELETE` | `/api/library/:id` | Bearer JWT | Delete an owner-scoped study set                 |

---

## Project Structure

Organized by layer (**Frontend → Backend → Database → AI → Scripts & Config**):

```text
NeuroNote-main/
├── frontend/               # Frontend (React + TypeScript + Vite)
│   ├── public/             # Static frontend icons and assets
│   ├── src/
│   │   ├── context/        # AuthContext provider
│   │   ├── pages/          # Auth, Home, StudySession, Library, Settings
│   │   ├── services/       # Centralized API client (api.ts), Jina reader, LLM, local storage
│   │   ├── types/          # Shared TypeScript interfaces (StudyData)
│   │   ├── utils/          # Study set export helpers (Markdown, Anki CSV)
│   │   └── App.tsx         # Hash router and main layout
│   ├── index.html
│   └── vite.config.ts
├── backend/                # Backend (Express API & Auth)
│   ├── middleware/auth.js  # JWT authentication middleware
│   ├── routes/             # Express routes (auth, library)
│   ├── test/               # Node test suite (auth, db, generate, library)
│   └── index.js            # Express server entry point
├── database/               # Database Layer
│   ├── models/             # Mongoose schemas (User, Library)
│   └── db.js               # MongoDB + atomic local_db.json adapter
├── ai/                     # AI Generation Layer
│   └── generate.js         # Groq API integration, chunking & validation
├── scripts/
│   └── dev.mjs             # Dev runner: starts frontend + backend together
├── .github/workflows/      # CI workflow (build, lint, backend tests)
├── vercel.json             # Frontend deployment config for Vercel
└── .env.example            # Environment variable template
```

---

## Checks & Scripts

| Command                     | Description                                                                       |
| :-------------------------- | :-------------------------------------------------------------------------------- |
| `npm run dev`               | Start both the Express API and Vite dev server                                    |
| `npm run build`             | Run TypeScript type checking (`tsc -b`) and build the frontend                    |
| `npm run lint`              | Run ESLint across JavaScript files (including backend, database, and AI layers)   |
| `npm test --prefix backend` | Run isolated database and API tests using temporary files and mocked AI responses |

---

## Roadmap

- Spaced repetition scheduling
- Quiz attempt history
- Tags and favorites
- Study set exports
