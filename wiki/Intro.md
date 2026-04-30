# Intro — MemoryWeaver

## Application Name

**MemoryWeaver** — AI-Powered Photo & Voice Memory Journal

## URL of Deployed Application

> [ADD DEPLOYED URL HERE]
> Example: `https://memory-weaver-abc123-uc.a.run.app`

[Launch MemoryWeaver](ADD_DEPLOYED_URL_HERE)

---

## About This Project

MemoryWeaver is a Single Page Application (SPA) built as part of CS651 Web Systems (Spring 2026) at CSU East Bay.

**Group 4:**
- Sarmad Habib (vf3352)
- Anas Niaz (te7008)
- Muhammad Sufiyan (ev8962)

The application:
1. Connects to a user's **Google Photos** account via Google OAuth 2.0
2. Allows users to **record voice memos** in-browser
3. Processes both with **Google Gemini** (photo analysis → XXX; audio transcription → YYY; combined narrative → ZZZ)
4. Stores all results in **Google Cloud Firestore**
5. Presents a personal **memory journal** with AI-enhanced entries
6. Is deployed on **Google Cloud Run**

## Launch from Project 1

This application is launched from the Project 1 static site via a prominent link button.
> [ADD LINK ON YOUR P1 SITE]: Add `<a href="DEPLOYED_URL">Open MemoryWeaver</a>` to your Project 1 HTML.

## Technology Summary

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Vite |
| Backend | Node.js 20, Express 4 |
| AI | Google Gemini 1.5 Flash |
| Database | Google Cloud Firestore |
| Storage | Google Cloud Storage |
| Deployment | Google Cloud Run (Docker) |
| Authentication | Google OAuth 2.0 |
| Analytics | Google Analytics 4 (react-ga4) |
| Logging | Google Cloud Logging |
