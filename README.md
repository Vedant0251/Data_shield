# 🛡️ Sensitive Data Shield (Enterprise Edition)

A production-grade Chrome Extension (Manifest V3) that prevents accidental data leakage by detecting sensitive information in real-time.

## 🌟 Key Features

### 1. Multi-Layered Risk Detection
We classify data into risk tiers to minimize false positives:
- **Tier 1 (High)**: Passwords, Credit Cards (Luhn validated), Aadhaar, API Keys.
- **Tier 2 (Medium)**: PAN, Email, Phone, UPI IDs.
- **Tier 3 (Context)**: CVV (only if context matches), Keywords.

### 2. Contextual Intelligence
- Scans user input AND surrounding context (field labels, placeholders).
- Detects if the page is secure (HTTPS).
- Analyzes text blocks (chat messages, emails) for embedded secrets.

### 3. Enterprise Controls
- **Trusted Sites Whitelist**: Mark internal or trusted domains to bypass checks.
- **Ignore Function**: Temporarily dismiss warnings for specific fields.
- **Privacy First**: All processing is 100% client-side (in-memory).

---

## 🚀 Installation Guide

1. **Clone/Download** this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** (top right toggle).
4. Click **Load unpacked**.
5. Select the project folder: `c:\Users\vedan\Desktop\Cyber\PIE`.

---

## 📖 Usage Guide

### Detection in Action
1. Go to any website (e.g., a checkout page or ChatGPT).
2. Type a dummy credit card number:
   > `4000 1234 5678 9010`
3. Result: **High Risk Warning** (Red border + Tooltip).

### Managing Trust
1. Click the extension icon in the toolbar.
2. Click **"Add to Trusted Sites"** to whitelist the current domain.
3. Managing list: In the popup, click **"Manage Trusted Sites"** to see and remove domains.

---

## 🔒 Security & Privacy Statement
- **Zero Data Exfiltration**: This extension has NO external server calls.
- **Memory-Only Processing**: Input values are analyzed in RAM and immediately discarded.
- **Open Source Audit**: The code is unminified and fully auditable.

## 🛠️ Developer Notes
- **Manifest V3**: Uses modern service worker compliance (though mostly content-script driven).
- **Architecture**: Modular `SensitivityEngine` in `utils/validation.js` allows easy rule updates.
- **Performance**: Heavy debounce usage to ensure 60fps scrolling and typing.
