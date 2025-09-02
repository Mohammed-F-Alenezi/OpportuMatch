# Buṣlat Al-Mumkināt (Enablers Compass)

## Overview
**Buṣlat Al-Mumkināt** is an intelligent readiness assessment and guidance platform that helps organizations evaluate their current state, compare with peers, and discover pathways for growth.  
The system leverages **AI-powered analytics, machine learning models, and interactive dashboards** to provide actionable insights that align with Saudi Vision 2030 goals.

---

## Key Features
- 📊 **Readiness Assessment Model**  
  Calculates organizational readiness across multiple pillars (Efficiency, Scale, People, Finance, etc.) using historical and current data.

- 🔍 **Cohort-Based Benchmarking**  
  Places organizations within a percentile ranking compared to peers in the same **sector, region, and size**.

- 🤖 **AI-Powered Assistant (Rashid)**  
  An intelligent voice and text assistant that guides users through results, explains metrics, and suggests improvements.

- 🧭 **Enablers Compass Dashboard**  
  An interactive dashboard showing readiness scores, sector comparisons, and year-over-year progress.

- 📈 **Predictive Insights**  
  Machine learning models (Random Forest Regressor + cohort-based normalization) trained on data from **2019–2024** and tested on **2025**, enabling robust forward-looking analysis.

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
- **AI Orchestration:** LangChain + GPT-4o-mini  
- **Data Ingestion:** BeautifulSoup + Selenium (for scraping & updating program data)

---
## 🧩 Current MVP Features
- **Auth pages**: Sign in / Sign up.  
- **Project input form**: Add project details (title, sector, stage, funding needs).  
- **Program explorer page**: (extensible with compatibility score & RAG explanations later).  
- **Theme system**: Dark/Light mode using unified CSS variables.  
- **Backend-ready integration** with FastAPI.  

---
## Project Goals
- Support organizations in aligning with **Vision 2030** transformation initiatives.  
- Provide a **standardized benchmark** to evaluate readiness and competitiveness.  
- Empower decision-makers with **data-driven insights** for strategic planning.  
- Build an **intelligent assistant (Rashid)** to make analytics more accessible and user-friendly.  
- Increase accuracy of program-to-project matching.  
- Reduce wasted time in manual searching.  
- Improve efficiency of funding agencies in reaching qualified projects.  

---

## Example Output
When an organization inputs its details (sector, region, size, year), the system provides:  
- **Readiness Percentile:** e.g., *73.7% — higher than 67% of similar organizations in 2025*.  
- **Comparison vs Peers:** Highlights sector and regional averages.  
- **Actionable Guidance:** Steps to improve readiness and performance.  

---

## Vision Alignment
> *“Our ambition is to build a thriving economy powered by knowledge, innovation, and opportunity.”*  
— Inspired by **HRH Crown Prince Mohammed bin Salman**, Vision 2030  

Buṣlat Al-Mumkināt embodies this vision by enabling organizations to **measure today, improve tomorrow, and achieve excellence**.

---

## Contributors
- **Team Buṣlat Al-Mumkināt** (Hackathon Project)  
- AI Assistant **Rashid** – Voice-powered guide for readiness insights  

---

## License
This project is licensed under the **MIT License** – free to use, modify, and distribute.  

