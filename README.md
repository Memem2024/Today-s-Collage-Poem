# 🧩 Collage Poetry Generator  
**An AI-assisted text collage poetry experiment**

Collage Poetry Generator is an experimental web project built with **Gemini 3 (Vibe Code)**.  
It transforms input text into **constraint-driven collage poems**, and allows users to actively participate in the recomposition process using an AI-generated corpus.

This project explores **language as material**, not as linear narrative.

---

## ✨ Overview

Rather than generating poems end-to-end, this project focuses on:

- Fragmentation  
- Recombination  
- Constraint-based structure  
- Human decision-making assisted by AI  

The result is a system where **AI proposes structure and fragments**, while **humans retain authorship through selection and arrangement**.

---

## 🛠 Features

### 🔹 Automatic Collage Generation
- Powered by **Gemini 3 (Vibe Code)**
- Extracts unique fragments from user input
- Generates:
  - A **4-line collage poem**
  - An **8-line collage poem**, including rhythm variation and at least one ultra-short line

---

### 🔹 Corpus-Based Manual Collage
- Users can reuse the AI-generated corpus
- Manually assemble, reorder, and edit poem lines
- Enables **AI-assisted, human-directed creation**

---

### 🔹 Constraint-Driven System
- Controlled fragment length distribution (2–6 characters)
- Strict per-line limits on:
  - Character count
  - Fragment count
  - Short-word repetition
- **Absolute defamiliarization**: no original text order is preserved

Structure takes precedence over semantic continuity.

---

## 🧠 Design Philosophy

- **AI is a structural engine, not the author**
- Creativity emerges from constraints, not abundance
- Meaning is secondary to rhythm, tension, and recombination
- Text is treated as a visual and spatial object

This project aligns more closely with **Creative Technology / Computational Art** than traditional generative writing tools.

---

## 🚀 Tech Stack

- **Frontend**: Vite + TypeScript  
- **AI Model**: Gemini 3 (Vibe Code)  
- **Deployment**: Vercel  
- **Architecture**:
  - Pure frontend rendering
  - AI calls at runtime (not during build)
  - No persistent backend or database

---

## 📦 How It Works

1. User inputs a text  
2. AI extracts and deduplicates fragments to form a corpus  
3. The system generates 4-line and 8-line collage poems  
4. Users may reuse the corpus to manually compose new poems  

---

## 🎯 Project Scope

- AI-assisted creative experimentation  
- Text collage / language structure research  
- Creative Technologist portfolio project  
- Non-commercial, non-content-farm usage  

---

## ⚠️ Notes

- AI API usage may be subject to rate limits or quotas
- AI calls are intentionally excluded from the build phase
- Best suited for experimental, exploratory, or showcase purposes

---

## 📜 License

MIT License  
Free to use, modify, and experiment with.

---

## 💬 Credits

Created as an exploration of  
**AI-assisted creativity, constraint-based generation, and language as material.**

> This project treats language as material, not message.
