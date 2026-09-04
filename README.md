# ScamShield AI

A full-stack web application that helps users identify online scams by analyzing suspicious text messages, emails, and URLs. It combines rule-based pattern detection with Groq AI to produce a verdict, risk score, and plain-English explanation for every scan. It also integrates directly with Gmail to automatically scan and filter scam emails from your inbox.

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
- **Gmail Integration** — connect your Gmail account and ScamShield will automatically scan your inbox every 5 minutes, move scam emails to Trash, and label suspicious ones — no manual action required
- **Scan History** — full log of every scan (manual and auto), searchable and filterable by type and result
- **Dashboard** — summary stats (total scans, scams detected, safe, suspicious, auto-scanned emails) with recent activity
- **User Accounts** — register, verify, log in, and log out; each user only sees their own scans
- **JWT Authentication** — all protected API endpoints require a valid Bearer token
- **Session Persistence** — `localStorage` is the source of truth for login state; opening a new tab or restarting the browser no longer forces re-login while the token is still valid
- **Profile Page** — displays account info, member since date, total scan count, custom avatar, and Gmail integration controls
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
| Email (verification) | Gmail SMTP via Python `smtplib` |
| Gmail Integration | Google Gmail API via OAuth 2.0 |
| Background Jobs | APScheduler |
| TTS | Web Speech API (browser built-in) |

---

## Project Structure

```
Mini_project/
├── backend/
│   ├── app/
│   │   ├── models/         # User, Scan, GmailConnection database models
│   │   ├── routes/         # auth.py, scan.py, gmail.py, health.py
│   │   ├── services/       # scan_service.py, groq_service.py, email_service.py, gmail_service.py
│   │   ├── config.py       # Environment config via .env
│   │   └── __init__.py     # Flask app factory + APScheduler setup
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

### Auth & Profile

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/register` | No | Create a new account, sends verification email |
| GET | `/api/verify/<token>` | No | Verify email and activate account (expires in 5 min) |
| POST | `/api/login` | No | Log in (requires verified account), returns JWT |
| GET | `/api/profile` | JWT | Get current user info + total scan count |

### Scanning

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/scan` | JWT | Run a manual scan (AI + rule-based), save result to DB |
| GET | `/api/scans` | JWT | Get all scans for current user |
| DELETE | `/api/scans` | JWT | Clear all scans for current user |

### Gmail Integration

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/gmail/auth-url` | JWT | Returns the Google OAuth consent URL |
| GET | `/api/gmail/callback` | No | OAuth callback — saves tokens, redirects to profile |
| GET | `/api/gmail/status` | JWT | Returns connection status and settings |
| DELETE | `/api/gmail/disconnect` | JWT | Removes the Gmail connection |
| PATCH | `/api/gmail/settings` | JWT | Update scam/suspicious action preferences |
| POST | `/api/gmail/scan-now` | JWT | Manually trigger an inbox scan |

### Other

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Backend liveness check |

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

# Google OAuth — for Gmail integration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:5000/api/gmail/callback
```

- Get a free Groq API key at [https://console.groq.com](https://console.groq.com)
- For Gmail SMTP, enable 2-Step Verification and generate an App Password at [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
- For Google OAuth credentials, see the Gmail Integration Setup section below
- If accessing from another device on the same network, add its IP to `FRONTEND_ORIGIN`, e.g. `http://192.168.x.x:5500`

### 4. Start the backend

```bash
python run.py
```

The API runs at `http://127.0.0.1:5000`. The backend binds to `0.0.0.0` so other devices on the same LAN can reach it. APScheduler starts automatically and polls connected Gmail inboxes every 5 minutes.

### 5. Open the frontend

Open `index.html` with VS Code Live Server or any local HTTP server. Do **not** open HTML files directly via `file://` — fetch requests to the backend will not work.

---

## Registration & Verification Flow

1. User fills in the registration form
2. Backend creates the account (unverified) and sends a verification email via Gmail SMTP
3. User clicks the link in the email — the backend verifies the token and redirects to the login page
4. User logs in — login is blocked until email is verified
5. Verification links expire after **5 minutes**. If expired, the user sees an "expired" message and must register again

---

## Gmail Integration Setup

The Gmail integration uses Google OAuth 2.0. To set it up:

### 1. Create a Google Cloud project
- Go to [https://console.cloud.google.com](https://console.cloud.google.com)
- Create a new project named `ScamShield`

### 2. Enable the Gmail API
- Go to **APIs & Services → Library**
- Search for **Gmail API** and enable it

### 3. Configure the OAuth consent screen
- Go to **APIs & Services → OAuth consent screen**
- Choose **External**, fill in the app name and contact email
- Add the scope: `https://www.googleapis.com/auth/gmail.modify`
- Under **Test users**, add the Gmail addresses that are allowed to connect

### 4. Create OAuth credentials
- Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**
- Application type: **Web application**
- Add authorized redirect URI: `http://127.0.0.1:5000/api/gmail/callback`
- Copy the **Client ID** and **Client Secret** into your `.env`

### How users connect
1. Log in to ScamShield
2. Go to **Profile** in the sidebar
3. Scroll to the **Gmail Integration** card
4. Click **🔗 Connect Gmail**
5. Approve access on the Google consent screen
6. ScamShield will now scan the inbox every 5 minutes automatically

### Testing mode limitation
The app is currently in Google's **testing mode**, which means only Gmail addresses manually added to the test users list in Google Cloud Console can connect. To allow a new user to connect their Gmail, add their address in **OAuth consent screen → Test users** before they attempt to connect. To open the integration to all users without restriction, the app would need to go through Google's official verification process.

### What happens during an auto-scan
- Fetches up to 20 unread emails from the inbox per run
- Each email (sender + subject + body) is passed through the same dual detection engine used for manual scans
- **Scam** → moved to Trash (or labeled, depending on user settings)
- **Suspicious** → labeled "ScamShield - Suspicious" (or ignored, depending on settings)
- **Safe** → untouched
- All results are saved to scan history and visible on the dashboard with an **Auto** badge

---

## Security Notes

- All user-controlled text is HTML-escaped before DOM injection (XSS protection)
- CORS is scoped to specific frontend origins via `FRONTEND_ORIGIN` env var — no wildcard
- JWT is stored in `localStorage`; `sessionStorage` holds only cached display data
- Verification tokens are single-use, cleared on use or expiry
- OAuth tokens are stored in the database and refreshed automatically when expired
- `.env`, `*.db`, `__pycache__/`, `client_secret*.json`, and `token*.json` are gitignored

---

## Author

Developed as a Computer Science Mini Project.
