# ScamShield AI

A full-stack web application that helps users identify online scams by analyzing suspicious text messages, emails, and URLs. It combines rule-based pattern detection with Google Gemini AI to produce a risk score and a plain-English explanation for every scan.

---

## Features

- **Email Verification** — new accounts require email confirmation before login is allowed
- **Scam Detector** — paste a message, email, or URL and get an instant verdict: Safe, Suspicious, or Scam
- **Risk Score** — every scan is scored 0–100 based on detected patterns
- **AI Explanation** — Google Gemini generates a 2–3 sentence explanation of why content is or isn't a scam, with a rule-based fallback if the API is unavailable
- **Scan History** — full log of every scan, searchable and filterable by type and result
- **Dashboard** — summary stats (total scans, scams detected, safe, suspicious) with recent activity
- **User Accounts** — register, verify, log in, and log out; each user only sees their own scans
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
| AI | Groq API (`groq/compound-mini`) |
| Auth | JWT (JSON Web Tokens) |
| Email | Gmail SMTP via Python `smtplib` |

---

## Project Structure

```
Mini_project/
├── backend/
│   ├── app/
│   │   ├── models/         # User and Scan database models
│   │   ├── routes/         # auth.py (register, login, verify, profile) + scan.py
│   │   ├── services/       # scan_service.py, gemini_service.py, email_service.py
│   │   ├── config.py       # Environment config via .env
│   │   └── __init__.py     # Flask app factory
│   ├── .env                # Secret keys and credentials (not committed)
│   ├── requirements.txt
│   └── run.py
├── css/                    # Per-page stylesheets
├── js/                     # Per-page JavaScript
├── favicon.svg             # Browser tab icon
├── index.html              # Landing page
├── login.html
├── register.html
├── verify.html             # Email verification landing page
├── dashboard.html
├── detector.html
├── history.html
└── profile.html
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/register` | No | Create a new account, sends verification email |
| GET | `/api/verify/<token>` | No | Verify email and activate account |
| POST | `/api/login` | No | Log in (requires verified account), returns JWT |
| GET | `/api/profile` | JWT | Get current user info + total scan count |
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

# Gmail SMTP — for email verification
MAIL_USERNAME=your-gmail@gmail.com
MAIL_PASSWORD=your-gmail-app-password

# CORS — comma-separated list of allowed frontend origins
FRONTEND_ORIGIN=http://127.0.0.1:5500,http://localhost:5500

# Groq AI — free tier, get your key at https://console.groq.com
GROQ_API_KEY=your-groq-api-key
```

- Get a free Gemini API key at [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- For Gmail, enable 2-Step Verification and generate an App Password at [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)

### 4. Start the backend

```bash
python run.py
```

The API runs at `http://127.0.0.1:5000`. To allow access from other devices on the same network (e.g. mobile testing), the backend binds to `0.0.0.0` by default.

### 5. Open the frontend

Open `index.html` with VS Code Live Server or any local HTTP server. Do not open HTML files directly via `file://` as fetch requests to the backend will not work correctly.

---

## Registration & Verification Flow

1. User fills in the registration form
2. Backend creates the account (unverified) and sends a verification email
3. User clicks the link in the email — the backend verifies the token and redirects to the login page
4. User logs in — login is blocked until the email is verified
5. Verification links expire after **5 minutes**. If a link has expired, the user is redirected to the login page with an "expired" message and must register again.

> **Database note:** The `users` table gained a new nullable column `verification_token_created_at` in this version. If you have an existing `scamshield.db`, Flask-SQLAlchemy will add the column automatically on next startup (SQLite `ALTER TABLE` via `db.create_all()` does not drop existing data). Rows created before this change will have `NULL` in that column and are treated as non-expired.

---

## Author

Developed as a Computer Science Mini Project.
