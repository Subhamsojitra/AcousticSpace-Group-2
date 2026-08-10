<div align="center">

# 🔊 AcousticSpace
### Deepfake Detection via Room Impulse Response (RIR)

**Catching synthetic audio by verifying the physics of a room — not just the sound of a voice.**

[![Status](https://img.shields.io/badge/status-in%20development-yellow?style=flat-square)]()
[![Python](https://img.shields.io/badge/python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white)]()
[![PyTorch](https://img.shields.io/badge/PyTorch-EE4C2C?style=flat-square&logo=pytorch&logoColor=white)]()
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)]()
[![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)]()
[![License](https://img.shields.io/badge/license-MIT-lightgrey?style=flat-square)]()

[Overview](#-overview) • [How It Works](#-how-it-works) • [Tech Stack](#-tech-stack) • [Getting Started](#-getting-started) • [Roadmap](#-development-roadmap) • [Team](#-team)

</div>

---

## 📌 Overview

Most deepfake audio detectors look for **vocal artifacts** — robotic tones, unnatural inflection, unusual pauses. The problem? Modern generative AI has gotten good enough to sound perfectly human, which means these biometric checks are increasingly easy to bypass.

**AcousticSpace** takes a different approach. Instead of asking *"does this voice sound fake?"*, it asks *"does this voice belong in this room?"*

Every real recording carries an acoustic fingerprint of its environment — a **Room Impulse Response (RIR)** shaped by echo, reverb, and reflection. Generative voice models don't model this physics correctly. AcousticSpace isolates the RIR from a suspect clip and checks whether the voice's acoustic behavior actually matches its claimed background environment. When it doesn't, that's a red flag no amount of vocal realism can fix.

### 🎯 Use Case

> A security analyst at **Infocact** receives a suspected deepfake audio clip — perhaps part of a fraud investigation or a voice-phishing report. They upload it to the AcousticSpace dashboard. The system mathematically isolates the background RIR and compares it against the expected acoustic reflection of the spoken voice. If the two don't line up, the clip is flagged as synthetic — even if it would fool a human ear or a standard biometric detector.

---

## ⚙️ How It Works

```
                ┌────────────────────┐
   Audio File   │   React Frontend    │
  ─────────────▶│  Upload + Dashboard │
                └──────────┬──────────┘
                           │ REST API
                           ▼
                ┌────────────────────┐
                │   FastAPI Gateway   │
                │  (low-latency infer)│
                └──────────┬──────────┘
                           ▼
                ┌────────────────────┐
                │  Librosa Pipeline   │
                │  Feature + RIR      │
                │  Extraction         │
                └──────────┬──────────┘
                           ▼
                ┌────────────────────┐
                │  AST Transformer    │
                │  Classifier         │
                │  (PyTorch / HF)     │
                └──────────┬──────────┘
                           ▼
                Confidence Score + Flag
                           │
                           ▼
                ┌────────────────────┐
                │  Analyst Dashboard  │
                │  Waveform + Verdict │
                └────────────────────┘
```

### Core Modules

| Module | What it does |
|---|---|
| 🎚️ **Audio Processing Pipeline** | Built with Python & **Librosa** — extracts low-level acoustic features, isolating RIR and environmental reverb from raw audio |
| 🧠 **Transformer Classifier** | A fine-tuned **Audio Spectrogram Transformer (AST)** (PyTorch + HuggingFace) trained to catch mismatches between vocal cadence and spatial acoustics |
| 🚀 **API Gateway** | **FastAPI** service exposing the model for real-time, low-latency inference |
| 📊 **Analyst Dashboard** | A **React + TypeScript** frontend for uploading clips, visualizing waveforms, and reviewing confidence scores |

---

## 🧰 Tech Stack

<table>
<tr>
<td valign="top" width="50%">

**Backend & Machine Learning**
- Python
- PyTorch
- HuggingFace Transformers (AST)
- Librosa
- FastAPI
- Docker + CI/CD

</td>
<td valign="top" width="50%">

**Frontend**
- React
- TypeScript
- Wavesurfer.js (waveform visualization)

</td>
</tr>
</table>

---

## 🗓️ Development Roadmap

<details>
<summary><b>Week 1 — Core Setup & Data</b></summary>
<br>

- **Backend/ML:** Build the initial FastAPI server. Curate dataset (e.g., ASVspoof). Develop the Librosa pipeline to extract spectrograms and RIR features.
- **Frontend:** Scaffold the React app, build the audio upload component, and lay out the static dashboard.

</details>

<details>
<summary><b>Week 2 — Baseline Model & Visualization</b></summary>
<br>

- **Backend/ML:** Build a baseline CNN/Transformer model to classify audio files using extracted acoustic features.
- **Frontend:** Integrate waveform visualizers (Wavesurfer.js) to display uploaded audio.

**🔎 Mid-Project Review:** Validate that the Librosa pipeline successfully isolates environmental noise from vocals, and confirm baseline model accuracy. Frontend should reliably handle audio uploads and render waveforms.

</details>

<details>
<summary><b>Week 3 — Advanced Model & Results UI</b></summary>
<br>

- **Backend/ML:** Fine-tune the Audio Spectrogram Transformer. Implement logic to check breathing/cadence alignment with speech syllables.
- **Frontend:** Build the results panel — display model confidence scores and highlight suspicious segments.

</details>

<details>
<summary><b>Week 4 — Deployment & Polish</b></summary>
<br>

- **Backend/ML:** Deploy the model via Docker. Optimize API inference latency. Set up CI/CD pipelines.
- **Frontend:** Refine UI/UX, add state management for tracking analysis history.

**🏁 Final Review:** A robust deepfake detector that catches synthetic audio via physics-based analysis, paired with a complete, responsive analyst dashboard for interactive forensics.

</details>

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- (Optional) Docker & Docker Compose

### 1. Clone the repo

```bash
git clone https://github.com/Subhamsojitra/AcousticSpace-Group-2.git
cd AcousticSpace-Group-2
```

### 2. Backend setup

```bash
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

API will be live at `http://localhost:8000`.

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Dashboard will be live at `http://localhost:5173`.

### 4. (Optional) Run with Docker

```bash
docker compose up --build
```

> Adjust ports, scripts, and commands above to match your actual `requirements.txt` / `package.json` setup if they differ.

---

## 📂 Project Structure

```
AcousticSpace-Group-2/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI entrypoint
│   │   ├── models/            # AST classifier & inference logic
│   │   ├── pipeline/          # Librosa feature/RIR extraction
│   │   └── api/                # API routes
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/        # Upload, waveform, results panel
│   │   └── pages/              # Dashboard views
│   └── package.json
├── data/                       # Dataset (e.g., ASVspoof) samples/scripts
├── docs/                       # Diagrams, reports, review docs
└── README.md
```

> Update this tree to reflect your actual repo layout.

---

## 🧭 Roadmap Beyond MVP

- [ ] Support batch analysis of multiple clips
- [ ] Expand training data across more RIR/environment types
- [ ] Add explainability overlays showing *why* a clip was flagged
- [ ] Real-time streaming detection mode

---

## 👥 Team

Built by **Group 2** for Project 1, under **Infocact Solutions**.

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
<sub>Built with 🎧 and a healthy suspicion of anything that sounds too perfect.</sub>
</div>