# Project 1 → MemoryWeaver Linking Instructions

The CS651 Project 2 requirements state:
> "This Web SPA should be launched from your Project 1 static site."

This document explains exactly how to satisfy that requirement.

---

## Step 1 — Get your deployed MemoryWeaver URL

After deploying to Cloud Run (see `docs/deployment-cloud-run.md`), you will have a URL like:
```
https://memory-weaver-abc123-uc.a.run.app
```

---

## Step 2 — Add a launch button to your Project 1 HTML

Open your Project 1 `index.html` (or whichever page you want to link from).
Add the following button anywhere visible — typically in the hero section or navigation:

```html
<!-- MemoryWeaver launch button — CS651 Project 2 -->
<a
  href="https://memory-weaver-abc123-uc.a.run.app"
  target="_blank"
  rel="noopener noreferrer"
  style="
    display: inline-block;
    padding: 14px 32px;
    background: #4f46e5;
    color: #fff;
    border-radius: 999px;
    font-weight: 600;
    font-size: 1rem;
    text-decoration: none;
    margin-top: 16px;
  "
>
  🧵 Launch MemoryWeaver (Project 2)
</a>
```

Replace `https://memory-weaver-abc123-uc.a.run.app` with your actual Cloud Run URL.

---

## Step 3 — Update the Project 1 "Back" link in MemoryWeaver

In `client/src/pages/LoginPage.jsx`, find the footer link:

```jsx
<a href="#" style={...}>← Back to Project 1</a>
```

Replace `#` with your **Project 1 deployed URL** so users can navigate back:

```jsx
<a href="https://YOUR_PROJECT1_URL" style={...}>← Back to Project 1</a>
```

---

## Step 4 — Update the wiki

In `wiki/Intro.md`:
1. Replace `ADD_DEPLOYED_URL_HERE` with your Cloud Run URL.
2. Add a note: "Launched from Project 1 at: [YOUR_PROJECT1_URL]"

---

## Evidence to Collect

Take a screenshot of:
1. Your Project 1 page showing the MemoryWeaver launch button
2. Clicking the button and landing on the MemoryWeaver login page

Include both screenshots in your `wiki/Demonstration.md`.
