# Curalink

Curalink is a simple medical research assistant project built with Node.js + React.
You enter a disease, query, and location, and it returns:

- top research papers
- clinical trial matches
- an optional AI summary

## What This Project Does

When you click Search on the frontend:

1. The backend expands your query.
2. It fetches data from PubMed and OpenAlex.
3. It fetches trial data from ClinicalTrials.gov.
4. It ranks and cleans research results.
5. It tries to generate a summary with Hugging Face.
6. It returns everything in one response.

If AI summary fails, results still come back.

## Tech Stack

Backend:

- Node.js
- Express
- Axios
- dotenv
- xml2js

Frontend:

- React
- Vite

## Folder Structure

```text
Curalink/
  backend/
    routes/
    services/
    utils/
    server.js
  frontend/
    src/
    index.html
  README.md
```

## Setup

### Prerequisites

- Node.js 18+
- npm

### Install dependencies

```powershell
cd C:\Users\singh\OneDrive\Desktop\Curalink\backend
npm install

cd ..\frontend
npm install
```

## Environment Variable

Create file backend/.env:

```env
HF_API_KEY=your_huggingface_token
PORT=5000
```

## Run the Project

Use two terminals.

Terminal 1 (backend):

```powershell
cd C:\Users\singh\OneDrive\Desktop\Curalink\backend
node server.js
```

Terminal 2 (frontend):

```powershell
cd C:\Users\singh\OneDrive\Desktop\Curalink\frontend
npm run dev
```

Open the URL shown in terminal (usually http://127.0.0.1:5173).

## API

### POST /api/research/query

Request body:

```json
{
  "disease": "Parkinson disease",
  "query": "deep brain stimulation",
  "location": "New York"
}
```

Response includes:

- success
- expandedQuery
- results
- clinicalTrials
- aiSummary

If summary generation fails, aiSummary returns:

```text
AI summary temporarily unavailable
```

## Reliability Notes

- Source APIs are called in parallel.
- Partial failures are handled safely.
- Research results are returned even if AI fails.
- Hugging Face call has retries and timeout.

## Common Issues

Backend not starting:

- Make sure you are inside backend folder before running node server.js.

Frontend white page:

- Ensure npm run dev is running in frontend folder.
- Open the exact Vite URL shown in terminal.
- Hard refresh browser (Ctrl+F5).

<<<<<<< HEAD
=======
## Security

- Do not push real API keys.
- Keep backend/.env out of git.

## License

You can add MIT license (or your preferred license) before final public release.
>>>>>>> 6e91526 (Stability fixes: env loading, AI reliability, root scripts)
