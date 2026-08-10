# ScamShield AI

A full-stack web application that helps users identify online scams by analyzing suspicious text messages, emails, and URLs. It combines rule-based pattern detection with Google Gemini AI to produce a risk score and a plain-English explanation for every scan.

---

## Features

- **Scam Detector** — paste a message, email, or URL and get an instant verdict: Safe, Suspicious, or Scam
- **Risk Score** — every scan is scored 0–100 based on detected patterns
- **AI Explanation** — Google Gemini generates a 2–3 sentence explanation of why content is or isn't a scam, with a rule-based fallback if the API is unavailable
- **Scan History** — full log of every scan, searchable and filterable by type and result
- **Dashboard** — summary stats (total scans, scams detected, safe, suspicious) with recent activity
- **User Accounts** — register, log in, and log out; each user only sees their own scans
- **JWT Authentication** — all protected API endpoints require a valid Bearer token
- **Profile Page** — displays account info, member since date, total scan count, and a custom avatar
- **Responsive Design** — works on desktop, laptop, tablet, and phone

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Python, Flask, Flask-JWT-Extended |
| Database | SQLite via Flask-SQLAlchemy |
| AI | Google Gemini API (`gemini-2.0-flash-lite`) |
| Auth | JWT (JSON Web Tokens) |

---

## Project Structure

```
Mini_project/
├── backend/
│   ├── app/
│   │   ├── models/         # User and Scan database models
│   │   ├── routes/         # auth.py (register, login, profile) + scan.py
│   │   ├── services/       # scan_service.py (rule-based) + gemini_service.py (AI)
│   │   ├── config.py       # Environment config via .env
│   │   └── __init__.py     # Flask app factory
│   ├── .env                # Secret keys and API key (not committed)
│   ├── requirements.txt
│   └── run.py
├── css/                    # Per-page stylesheets
├── js/                     # Per-page JavaScript
├── index.html              # Landing page
├── login.html
├── register.html
├── dashboard.html
├── detector.html
├── history.html
└── profile.html
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/register` | No | Create a new account |
| POST | `/api/login` | No | Log in, returns JWT |
| GET | `/api/profile` | JWT | Get current user info + scan count |
| POST | `/api/scan` | JWT | Run a scan, save result to DB |
| GET | `/api/scans` | JWT | Get all scans for current user |
| GET | `/health` | No | Backend health check |

---

## Setup & Running

### 1. Clone the repository

```bash
git clone <repo-url>
cd Mini_project
```

### 2. Set up the backend

```bash
cd backend
pip install -r requirements.txt
```

### 3. Create the `.env` file

```
SECRET_KEY=your-secret-key
JWT_SECRET_KEY=your-jwt-secret
DATABASE_URL=sqlite:///scamshield.db
GOOGLE_API_KEY=your-gemini-api-key
DEBUG=true
```

Get a free Gemini API key at [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).

### 4. Start the backend

```bash
python run.py
```

The API runs at `http://127.0.0.1:5000`.

### 5. Open the frontend

Open `index.html` with VS Code Live Server or any local HTTP server. Do not open HTML files directly via `file://` as fetch requests to the backend will not work correctly.

---

## Author

Developed as a Computer Science Mini Project.
