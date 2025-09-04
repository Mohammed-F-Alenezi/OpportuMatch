# Buṣlat Al-Mumkināt (Enablers Compass)

## Overview
**Buṣlat Al-Mumkināt** is an intelligent readiness assessment and guidance platform that helps organizations evaluate their current state, compare with peers, and discover pathways for growth.  
The system leverages **AI-powered analytics, machine learning models, and interactive dashboards** to provide actionable insights that align with Saudi Vision 2030 goals.

 Buṣlat Al-Mumkināt makes it simple by allowing users to:

- Enter their project details (sector, stage, funding needs, goals).  
- Get a ranked list of the **Top-5 most relevant programs**.  
- View **compatibility scores** and details.  
- Easily access program information and apply through official links.  

---
## Key Features
- **User Authentication**: Sign up and log in with a modern UI.  
- **Project Management**: Add and manage project details (name, description, type, stage, goals, vision, required support).  
- **Smart Matching**: Search initiatives and programs with semantic similarity and explicit rules (sector, funding range, etc.).  
- **Initiative Dashboard**: View recommended programs with scores and details.  
- **Explainability (RAG)**: “Why is this program suitable?” answers powered by AI (future).  
- **AI-Powered Assistant (Rashid)** An intelligent voice and text assistant that guides users through results, explains metrics, and suggests improvements.
---

## System Workflow
1. **Data Collection** – Input data from official sources and organizational records.  
2. **Normalization & Processing** – Clean, standardize, and scale data across regions, sizes, and sectors.  
3. **Readiness Scoring** – Compute raw readiness scores using weighted pillars.  
4. **Percentile Ranking** – Convert raw scores into percentiles within each year for fair benchmarking.  
5. **Insights & Guidance** – Present results via dashboard and **Rashid AI assistant**, including tailored improvement suggestions.  

---

## Technology Stack
- **Backend:** Python (FastAPI), Scikit-learn, Pandas  
- **ML Models:** Random Forest Regressor, PCA/SVD for dimensionality reduction  
- **Database:** Supabase (DB/Auth), ChromaDB (Vector Search)  
- **Frontend:** Next.js (React), Tailwind CSS, Streamlit (for data exploration)  
- **AI Orchestration:** LangChain + GPT-4o-mini + azure ai (rashid) + gemini flash 1.5 (rashid) + openCV haar cascade (rashid)
- **Data Ingestion:** BeautifulSoup + Selenium (for scraping & updating program data)

---

## Project Goals
- 🚀 Support organizations in aligning with **Vision 2030** transformation initiatives.  
- 🏆 Provide a **standardized benchmark** to evaluate readiness and competitiveness.  
- 🎯 Empower decision-makers with **data-driven insights** for strategic planning.  
- 🌐 Build an **intelligent assistant (Rashid)** to make analytics more accessible and user-friendly.  

---

## Vision Alignment
> *“Our ambition is to build a thriving economy powered by knowledge, innovation, and opportunity.”*  
— Inspired by **HRH Crown Prince Mohammed bin Salman**, Vision 2030  

Buṣlat Al-Mumkināt embodies this vision by enabling organizations to **measure today, improve tomorrow, and achieve excellence**.

---

## Contributors
- **Team Buṣlat Al-Mumkināt**   
mohammed alenezi
layan alluhaidan
saud aldulbahi
meran alhudaithy
ahmed aldayel
