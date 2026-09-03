# ScamShield AI

A full-stack web application that helps users identify online scams by analyzing suspicious text messages, emails, and URLs. It combines rule-based pattern detection with Groq AI to produce a verdict, risk score, and plain-English explanation for every scan.

---

## Features

- **Email Verification** — new accounts require email confirmation before login is allowed. Verification links expire after 5 minutes.
- **Scam Detector** — paste a message, email, or URL and get an instant verdict: Safe, Suspicious, or Scam
- **Dual Detection Engine** — every scan runs two independent analyses:
  - **Groq AI** (`groq/compound-mini`) independently reads the content and returns its own verdict and reason
  - **Rule-based engine** checks against an expanded keyword list and URL patterns for a numeric risk score and matched flags
  - AI verdict takes priority; rule-based is the fallback if AI is unavailable
- **Verdict Comparison Card** — the result panel shows both the AI verdict and rule-based verdict side by side
- **Risk Score** — every scan is scored 0–100 based on detected keyword/pattern matches
- **Text-to-Speech** — a "🔊 Read Result" button reads the scan result aloud, alternating between male and female voices on each press (uses the browser's built-in Web Speech API, no install required)
- **Scan History** — full log of every scan, searchable and filterable by type and result
- **Dashboard** — summary stats (total scans, scams detected, safe, suspicious) with recent activity
- **User Accounts** — register, verify, log in, and log out; each user only sees their own scans
- **JWT Authentication** — all protected API endpoints require a valid Bearer token
- **Session Persistence** — `localStorage` is the source of truth for login state; opening a new tab or restarting the browser no longer forces re-login while the token is still valid
- **Profile Page** — displays account info, member since date, total scan count, and a custom avatar
- **Responsive Design** — works on desktop, laptop, tablet, and phone
- **XSS Protection** — all user-controlled content is HTML-escaped before being injected into the DOM

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
| TTS | Web Speech API (browser built-in) |

---

## Project Structure

```
Mini_project/
├── backend/
│   ├── app/
│   │   ├── models/         # User and Scan database models
│   │   ├── routes/         # auth.py (register, login, verify, profile) + scan.py
│   │   ├── services/       # scan_service.py, groq_service.py, email_service.py
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
├── verify.html
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
| GET | `/api/verify/<token>` | No | Verify email and activate account (expires in 5 min) |
| POST | `/api/login` | No | Log in (requires verified account), returns JWT |
| GET | `/api/profile` | JWT | Get current user info + total scan count |
| POST | `/api/scan` | JWT | Run a scan (AI + rule-based), save result to DB |
| GET | `/api/scans` | JWT | Get all scans for current user |
| GET | `/health` | No | Backend health check |

### Scan response fields

| Field | Description |
|---|---|
| `result` | Final verdict — AI verdict if available, else rule-based (`scam` / `suspicious` / `safe`) |
| `rule_result` | Rule-based verdict |
| `risk_score` | 0–100 numeric score from the rule-based engine |
| `flags` | List of matched keywords or URL patterns |
| `ai_verdict` | AI's independent verdict (or `null` if unavailable) |
| `ai_reason` | AI's plain-English explanation (or fallback message) |
| `ai_available` | Whether Groq responded successfully |

---

## Rule-Based Keywords

The rule-based engine flags the following keywords (case-insensitive):

`won`, `winner`, `claim`, `prize`, `reward`, `gift card`, `lottery`, `urgent`, `verify`, `suspended`, `confirm your account`, `bank details`, `click here`, `free money`, `congratulations`, `OTP`, `password`, `transfer funds`, `inheritance`, `investment opportunity`, `act now`, `momo pin`, `reversal`, `cash out code`, `confirm otp`, `accidental transfer`, `gcb alert`, `ecobank alert`, `account suspended`, `verify your account`, `click to unlock`, `send money for ticket`, `processing fee`, `guaranteed job abroad`, `pay to secure position`, `urgent transfer`

Scoring: `hits × 18 + 5` (capped at 100). Threshold: ≥60 → scam, ≥30 → suspicious, else safe.

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
DEBUG=true

# Groq AI — free tier, get your key at https://console.groq.com
GROQ_API_KEY=your-groq-api-key

# Gmail SMTP — for email verification
MAIL_USERNAME=your-gmail@gmail.com
MAIL_PASSWORD=your-gmail-app-password

# CORS — comma-separated list of allowed frontend origins
FRONTEND_ORIGIN=http://127.0.0.1:5500,http://localhost:5500
```

- Get a free Groq API key at [https://console.groq.com](https://console.groq.com)
- For Gmail, enable 2-Step Verification and generate an App Password at [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
- If accessing from another device on the same network, add its IP to `FRONTEND_ORIGIN`, e.g. `http://192.168.x.x:5500`

### 4. Start the backend

```bash
python run.py
```

The API runs at `http://127.0.0.1:5000`. The backend binds to `0.0.0.0` so other devices on the same LAN can reach it.

### 5. Open the frontend

Open `index.html` with VS Code Live Server or any local HTTP server. Do **not** open HTML files directly via `file://` — fetch requests to the backend will not work.

---

## Registration & Verification Flow

1. User fills in the registration form
2. Backend creates the account (unverified) and sends a verification email via Gmail SMTP
3. User clicks the link in the email — the backend verifies the token and redirects to the login page
4. User logs in — login is blocked until email is verified
5. Verification links expire after **5 minutes**. If expired, the user sees an "expired" message and must register again

> **Database note:** The `users` table has a `verification_token_created_at` nullable column and the `scans` table has `ai_verdict`, `ai_reason`, `ai_available` nullable columns added after initial release. If you have an existing `scamshield.db`, run the backend once and these will be added automatically, or run the migration script manually via `ALTER TABLE`.

---

## Security Notes

- All user-controlled text is HTML-escaped before DOM injection (XSS protection)
- CORS is scoped to specific frontend origins via `FRONTEND_ORIGIN` env var — no wildcard
- JWT is stored in `localStorage`; `sessionStorage` holds only cached display data
- Verification tokens are single-use, cleared on use or expiry
- `.env`, `*.db`, `__pycache__/`, and `serviceAccountKey.json` are gitignored

---

## Author

Developed as a Computer Science Mini Project.
