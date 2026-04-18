# 🚀 Curalink — AI Medical Research Assistant

Curalink is an AI-powered medical research assistant built using the MERN stack and open-source LLMs.

It allows users to input a **disease, query, and location**, and returns:

* 📄 Research papers (PubMed + OpenAlex)
* 🧪 Clinical trials (ClinicalTrials.gov)
* 🧠 AI-generated structured insights
* 📥 Downloadable PDF report

---

## 🌐 Live Demo

* 🔗 Frontend: https://cura-link-gamma.vercel.app/
* 🔗 Backend API: https://curalink-backend-7h86.onrender.com

> ⚠️ Note: Backend is hosted on a free instance, so the first request may take a few seconds to respond.

---

## 🧠 What This Project Does

When a user clicks **Search**:

1. The system expands the query intelligently
2. Fetches research papers from:

   * PubMed
   * OpenAlex
3. Fetches clinical trials from ClinicalTrials.gov
4. Ranks results based on:

   * relevance
   * recency
   * source credibility
5. Sends top results to an open-source LLM
6. Generates:

   * structured AI summary
   * non-repetitive key insights
7. Returns everything in a single response

---

## ⚙️ Tech Stack

### Backend:

* Node.js
* Express
* Axios
* dotenv
* xml2js

### Frontend:

* React
* Vite

### AI / Data:

* Hugging Face (LLM)
* PubMed API
* OpenAlex API
* ClinicalTrials.gov API

---

## 📁 Project Structure

```text
Curalink/
│
├── backend/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── server.js
│   └── .env
│
├── frontend/
│   ├── src/
│   ├── index.html
│   └── vite.config.js
│
└── README.md
```

---

## 🛠️ Local Setup

### Prerequisites

* Node.js (v18+)
* npm

---

### Install Dependencies

```bash
cd backend
npm install

cd ../frontend
npm install
```

---

### Environment Variables

Create `backend/.env`:

```env
HF_API_KEY=your_huggingface_token
PORT=5000
```

---

### Run Locally

#### Terminal 1 (Backend)

```bash
cd backend
node server.js
```

#### Terminal 2 (Frontend)

```bash
cd frontend
npm run dev
```

👉 Open: http://127.0.0.1:5173

---

## 🔌 API Endpoint

### POST `/api/research/query`

#### Request:

```json
{
  "disease": "Lung cancer",
  "query": "immunotherapy",
  "location": "India"
}
```

---

#### Response Includes:

* `expandedQuery`
* `results` (research papers)
* `clinicalTrials`
* `aiSummary`
* `insights`

---

## ✨ Key Features

* 🔍 Deep research retrieval (50–300 candidates → ranked top results)
* 🧠 AI-powered insight generation (non-generic, structured)
* 🔄 Context-aware follow-up questions
* 📊 Intelligent ranking system
* 📥 PDF report generation
* 🧩 Modular backend architecture

---

## ⚠️ Reliability Notes

* APIs are called in parallel
* Timeout and retry handling implemented
* Partial failures handled gracefully
* Fallback ensures system never breaks

---

## 🐞 Common Issues

### Backend slow on first request

* Due to free hosting (Render)
* Solution: Open backend URL once before use

---

### No data showing

* Check API connectivity
* Ensure environment variables are set

---

## 🏆 Project Highlights

This is not just a chatbot.

👉 It is a **research + retrieval + reasoning system** that:

* fetches real medical data
* ranks it intelligently
* and converts it into useful insights

---

## 📌 Future Improvements

* Vector search + embeddings
* Better personalization
* Advanced filtering
* Multi-language support

---

## 🙌 Acknowledgement

Built as part of the **Curalink AI Hackathon**
Focused on real-world AI system design and implementation.

---
