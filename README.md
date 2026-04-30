# 🧠 CuraLink — AI Medical Research Assistant

## 🚀 Production-Ready AI System

CuraLink is an end-to-end AI-powered medical research assistant that retrieves, ranks, and synthesizes real-world medical data into structured insights using LLMs.

---

## 🌐 Live Demo

- Frontend: https://cura-link-gamma.vercel.app/  
- Backend: https://curalink-backend-7h86.onrender.com  

Note: Backend is hosted on a free instance (cold start delay possible)

---

## 🧠 Overview

CuraLink enables users to query medical topics (disease + query + location) and get:

- Research papers (PubMed, OpenAlex)  
- Clinical trials (ClinicalTrials.gov)  
- AI-generated structured summaries  
- Key insights (non-repetitive, contextual)  
- Downloadable PDF reports  

---

## 🎯 Problem Statement

Medical research is fragmented across multiple platforms:
- Data is scattered across sources  
- Requires manual filtering  
- Difficult to extract actionable insights  

CuraLink solves this using retrieval + ranking + LLM reasoning.

---

## 🧩 System Architecture

User Input  
→ Query Expansion  
→ Multi-source Retrieval (PubMed + OpenAlex + ClinicalTrials)  
→ Ranking Engine (Relevance + Recency + Credibility)  
→ LLM Processing (Hugging Face)  
→ Structured Output + Insights + PDF  

---

## ⚙️ Tech Stack

Backend:
- Node.js, Express  
- Axios, xml2js  
- dotenv  

Frontend:
- React, Vite  

AI / Data:
- Hugging Face (LLM inference)  
- PubMed API  
- OpenAlex API  
- ClinicalTrials.gov API  

---

## 🔥 Key Features

- Multi-source retrieval (50–300 candidates → ranked top results)  
- LLM-powered structured summaries  
- Intelligent ranking system  
- PDF report generation  
- Context-aware follow-up handling  
- Modular backend design  

---

## 📡 API Example

POST /api/research/query

Request:
{
  "disease": "Lung cancer",
  "query": "immunotherapy",
  "location": "India"
}

---

## 📁 Project Structure

CuraLink-ai-medical-research-assistant/
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

---

## 🛠️ Setup

git clone https://github.com/Manishkumarsingh41/CuraLink-ai-medical-research-assistant
cd CuraLink-ai-medical-research-assistant

cd backend && npm install
cd ../frontend && npm install

---

## 🔐 Environment Variables

Create backend/.env

HF_API_KEY=your_huggingface_token
PORT=5000

---

## ▶️ Run

Backend:
cd backend
node server.js

Frontend:
cd frontend
npm run dev

---

## ⚡ Reliability

- Parallel API calls  
- Timeout + retry logic  
- Graceful failure handling  
- Stable fallback responses  

---

## 🏆 Why This Project Stands Out

This is not just a demo.

It is a real-world AI system combining:
- Retrieval  
- Ranking  
- LLM reasoning  

Demonstrates production-level AI system design.

---

## 🚀 Future Improvements

- Vector search (FAISS / Pinecone)  
- Personalization  
- Advanced filtering  
- Multi-language support  

---

## 📫 Connect

- GitHub: https://github.com/Manishkumarsingh41  
- LinkedIn: https://www.linkedin.com/in/manish-kumar-singh-5a8162214/
