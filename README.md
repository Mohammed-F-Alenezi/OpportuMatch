# بُوصْلَةُ الْمُمَكِّنَاتْ 🧭  
*A smart platform that helps entrepreneurs and SMEs discover the most suitable government support and funding programs by analyzing project descriptions and matching them with program requirements using AI (NLP + RAG).*

---

## 📖 Overview
Finding the right funding opportunity is often time-consuming and confusing.  
**بُوصْلَةُ الْمُمَكِّنَاتْ** makes it simple by allowing users to:

- Enter their project details *(sector, stage, funding needs, goals)*.  
- Get a ranked list of the **Top-5 most relevant programs**.  
- View compatibility scores and details.  
- Easily access program information and apply through official links.  

This is the **MVP (v1.0)** version of the project, designed to scale into a **full AI-powered funding assistant**.  

---

## 🚀 Features
- 🔐 **User Authentication** – Sign up and log in with a modern UI.  
- 📂 **Project Management** – Add and manage project details *(name, description, type, stage, goals, vision, required support)*.  
- 🤖 **Smart Matching** – Search initiatives and programs with semantic similarity and explicit rules *(sector, funding range, etc.)*.  
- 📊 **Initiative Dashboard** – View recommended programs with scores and details.  
- 💡 **Explainability (RAG)** – *“Why is this program suitable?”* answers powered by AI *(future)*.  
- 🎨 **Responsive UI** – RTL-friendly interface, with **light/dark mode** support.  
- 🛠️ **Admin Mode (future)** – Manage programs, upload documents, and monitor analytics.  

---

## 🛠️ Tech Stack
- **Frontend:** Next.js 14 + React + TypeScript  
- **UI/UX:** Tailwind CSS, shadcn/ui, Framer Motion  
- **Theming:** next-themes (light/dark mode)  
- **Backend:** FastAPI REST API  
- **Auth:** JWT tokens (local storage)  
- **AI Layer (Upcoming):** Embeddings + Hybrid Retrieval + RAG for explanations  

---

## 📂 Project Structure
- **Next.js by Vercel** – The React Framework for modern web applications.  
- **FastAPI** – High-performance Python backend framework, easy to learn and production-ready.  

---

## 📌 Roadmap
- [x] MVP with authentication, project management, and matching.  
- [x] Add RAG-powered explainability layer.  
- [x] Expand program database and admin management tools.  
- [x] Integrate analytics dashboard for monitoring impact.  

---

## 📜 License
This project is licensed under the **MIT License** – feel free to use, modify, and share.  

---
## 📂 Project Structure

```plaintext
src/
├─ app/
│  ├─ page.tsx               # Landing page
│  ├─ signin/page.tsx        # Sign-in page
│  ├─ signup/page.tsx        # Sign-up page
│  ├─ bizinfo/page.tsx       # Project submission form
│  ├─ projects/[id]/page.tsx # Project recommendations
│  └─ dashboard/page.tsx     # User dashboard (future)
│
├─ components/               # UI components (cards, forms, modals)
├─ lib/                      # Utilities, constants, API helpers
└─ styles/                   # Global styles (globals.css, theme config)


## ⚡ Getting Started

### Prerequisites
- **Node.js** ≥ 18  
- **npm** or **yarn**  
- **Python** ≥ 3.10 (for backend)  
- Running **FastAPI backend** with proper `.env` settings (`SUPABASE_URL`, `SUPABASE_KEY`, etc.)

### Frontend Setup
```bash
# Clone the repo
git clone https://github.com/your-org/bouslat-al-mumakkinat.git
cd bouslat-al-mumakkinat

# Install dependencies
npm install

# Run the development server
npm run dev
