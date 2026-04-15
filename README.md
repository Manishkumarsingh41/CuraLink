# Curalink

Curalink is a MERN-style medical research assistant that aggregates evidence from multiple public research sources, ranks results for relevance and quality, and generates an optional AI summary for faster decision support.

## Table of Contents

- Overview
- Key Features
- Architecture
- Tech Stack
- Project Structure
- Getting Started
- Environment Variables
- Running the Application
- API Reference
- Data Pipeline
- Reliability and Fallback Behavior
- Frontend Behavior
- Troubleshooting
- Security Notes
- Future Improvements
- License

## Overview

Curalink accepts a disease, user query, and location from a frontend form, then:

1. Expands the query for broader evidence retrieval.
2. Fetches publications from PubMed and OpenAlex.
3. Fetches matching clinical trial records from ClinicalTrials.gov.
4. Normalizes and ranks research results.
5. Optionally generates a structured AI summary using Hugging Face.
6. Returns a unified JSON response to the frontend.

## Key Features

- Multi-source research aggregation:
  - PubMed
  - OpenAlex
  - ClinicalTrials.gov
- Query expansion for better recall.
- XML parsing for PubMed records.
- OpenAlex abstract decoding from inverted-index format.
- Weighted paper ranking based on:
  - relevance
  - recency
  - source credibility
- Normalized result schema for frontend consistency.
- AI summary generation with reliability controls:
  - timeout handling
  - retry logic
  - prompt size reduction
  - fallback message if unavailable
- Fault-tolerant backend route design:
  - partial upstream failure does not break full response

## Architecture

### High-level flow

1. Frontend sends POST request to backend endpoint.
2. Backend calls source services in parallel.
3. Backend transforms and merges source data.
4. Backend ranks and normalizes top research results.
5. Backend attempts AI summary generation separately.
6. Backend returns final response with:
   - results
   - clinicalTrials
   - aiSummary

### Request path

Frontend -> backend/routes/research.js -> services -> utils -> response

## Tech Stack

### Backend

- Node.js
- Express
- Axios
- CORS
- dotenv
- xml2js

### Frontend

- React 18
- Vite
- Fetch API

## Project Structure

```text
Curalink/
  backend/
    routes/
      research.js
    services/
      clinicalTrialsService.js
      hfService.js
      openAlexService.js
      pubmedService.js
    utils/
      normalizeResearchData.js
      openAlexDecoder.js
      pubmedParser.js
      queryExpander.js
      ranker.js
    server.js
    package.json
    .env
  frontend/
    src/
      App.jsx
      main.jsx
    index.html
    vite.config.js
    package.json
  README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Internet access (for external API calls)

### 1) Clone and install dependencies

```powershell
# from your parent directory
cd C:\Users\singh\OneDrive\Desktop

# if cloning from GitHub later
# git clone <your-repo-url>
# cd Curalink

# backend deps
cd Curalink\backend
npm install

# frontend deps
cd ..\frontend
npm install
```

## Environment Variables

Create or update backend/.env with:

```env
HF_API_KEY=your_huggingface_token
PORT=5000
```

Notes:

- HF_API_KEY is used by backend/services/hfService.js.
- PORT defaults to 5000 if not provided.

## Running the Application

Use two terminals.

### Terminal 1: Start backend

```powershell
cd C:\Users\singh\OneDrive\Desktop\Curalink\backend
node server.js
```

Expected log:

- Curalink server running on port 5000

### Terminal 2: Start frontend

```powershell
cd C:\Users\singh\OneDrive\Desktop\Curalink\frontend
npm run dev
```

Open the frontend URL shown by Vite (typically http://127.0.0.1:5173).

## API Reference

### POST /api/research/query

Request body:

```json
{
  "disease": "Parkinson disease",
  "query": "deep brain stimulation",
  "location": "New York"
}
```

Successful response:

```json
{
  "success": true,
  "expandedQuery": "Parkinson disease deep brain stimulation",
  "results": [
    {
      "title": "...",
      "abstract": "...",
      "authors": "...",
      "year": 2023,
      "source": "OpenAlex",
      "score": 0.84
    }
  ],
  "clinicalTrials": [
    {
      "title": "...",
      "status": "...",
      "eligibility": "...",
      "locations": "...",
      "contact": {
        "name": "...",
        "email": "..."
      },
      "source": "ClinicalTrials.gov"
    }
  ],
  "aiSummary": "Condition Overview..."
}
```

AI unavailable fallback:

```json
{
  "aiSummary": "AI summary temporarily unavailable"
}
```

## Data Pipeline

### 1) Query expansion

- Utility: backend/utils/queryExpander.js
- Produces primary and variation queries.

### 2) Source fetchers

- PubMed: backend/services/pubmedService.js
  - esearch -> idlist
  - efetch -> xmlData
- OpenAlex: backend/services/openAlexService.js
  - paginated works fetch
  - abstract decoding
- ClinicalTrials.gov: backend/services/clinicalTrialsService.js

### 3) Transform and normalize

- PubMed XML parser: backend/utils/pubmedParser.js
- OpenAlex abstract decoder: backend/utils/openAlexDecoder.js
- Normalizer: backend/utils/normalizeResearchData.js

### 4) Ranking

- Utility: backend/utils/ranker.js
- Score formula:

```text
score = (relevance * 0.5) + (recency * 0.3) + (credibility * 0.2)
```

## Reliability and Fallback Behavior

Implemented reliability behavior includes:

- Source calls use Promise.allSettled to tolerate partial failures.
- Combined research fallback if ranked set is empty.
- AI summary is isolated in its own try/catch block.
- Hugging Face reliability features:
  - 10s timeout per request
  - retry up to 2 times on failure
  - reduced prompt size (top 3 research items)
  - fallback message when generation is unavailable

This ensures research results are still returned even if AI generation fails.

## Frontend Behavior

The React frontend provides:

- Inputs for disease, query, location
- Search button with loading state
- Error messaging
- Sections for:
  - AI Summary
  - Research Results
  - Clinical Trials

## Troubleshooting

### Backend does not start

- Make sure you are inside backend folder.
- Install dependencies:

```powershell
cd C:\Users\singh\OneDrive\Desktop\Curalink\backend
npm install
node server.js
```

### Frontend white or unreachable page

- Ensure frontend dev server is running.
- Open exact URL shown in terminal.
- If needed, restart frontend:

```powershell
cd C:\Users\singh\OneDrive\Desktop\Curalink\frontend
npm run dev
```

### Port conflicts

- Backend expects 5000 by default.
- Frontend Vite uses 5173 with strictPort false, so it can move to next free port.

### Empty AI summary

- Check backend/.env has valid HF_API_KEY.
- Verify internet/API availability.
- Fallback text is expected when HF fails.

## Security Notes

Before pushing to GitHub:

1. Do not commit real API keys.
2. Add backend/.env to .gitignore.
3. Rotate any key that was previously exposed.
4. Keep a backend/.env.example template without secrets.

Suggested backend/.env.example:

```env
HF_API_KEY=your_huggingface_token
PORT=5000
```

## Future Improvements

- Add authentication and rate limiting for API endpoint.
- Add Redis cache for source query results.
- Add automated tests for services and route behavior.
- Add Docker compose for one-command startup.
- Add CI workflow for lint/build/test checks.

## License

Add your preferred license before public release (for example: MIT).
