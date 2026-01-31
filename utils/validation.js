/**
 * Sensitive Data Validation Engine (Tiered Risk Model)
 */

const RiskLevels = {
    IGNORE: 0,
    LOW: 1,    // Soft hint
    MEDIUM: 2, // Contextual warning
    HIGH: 3    // Strong warning
};

const Patterns = {
    // Tier 1: High Risk
    CREDIT_CARD: /\b(?:\d[ -]*?){13,19}\b/g,
    AADHAAR: /\b\d{4}\s?\d{4}\s?\d{4}\b/,
    // Google, AWS, GitHub, Stripe, Slack, JWT
    API_KEY: /\b(?:sk_live_[0-9a-zA-Z]{24,}|eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}|AIza[0-9A-Za-z\-_]{30,40}|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{36}|xox[baprs]-[a-zA-Z0-9-]{10,})\b/,
    CVV: /\b\d{3,4}\b/,
    OTP: /\b\d{4,8}\b/,

    // Tier 2: Medium Risk
    EMAIL: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/,
    // Phone: Matches (123) 456-7890, 123-456-7890, +1 123 456 7890, etc.
    PHONE: /(?:\b\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/,
    PAN: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/,
    UPI: /\b[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}\b/,

    // Context Keywords
    HIGH_RISK_KEYWORDS: ['password', 'pwd', 'secret', 'token', 'key', 'cvv', 'cvc', 'card', 'debit', 'credit'],
    MEDIUM_RISK_KEYWORDS: ['email', 'phone', 'mobile', 'pan', 'upi', 'bank', 'account']
};

/**
 * Validates Luhn Algorithm for Credit Cards
 */
function luhnCheck(value) {
    let checksum = 0;
    let j = 1;
    for (let i = value.length - 1; i >= 0; i--) {
        let calc = Number(value.charAt(i)) * j;
        if (calc > 9) {
            checksum += 1;
            calc -= 10;
        }
        checksum += calc;
        j = (j === 1) ? 2 : 1;
    }
    return (checksum % 10) === 0;
}

/**
 * Calculates Risk Score (0-100)
 * @param {string} value - Input value
 * @param {HTMLElement} element - Input element
 * @returns {Object} { score: number, level: number, reason: string, type: string }
 */
function calculateRisk(value, element) {
    if (!value || value.length < 3) return { score: 0, level: RiskLevels.IGNORE };

    let score = 0;
    let detectionType = '';
    let reasons = [];

    // Context Analysis
    const context = (
        (element.name || '') + ' ' +
        (element.id || '') + ' ' +
        (element.className || '') + ' ' +
        (element.placeholder || '') + ' ' +
        (element.getAttribute('aria-label') || '')
    ).toLowerCase();

    // --- Tier 1 Detection (High Impact) ---

    // 1. Password Field (Immediate High Risk)
    if (element.type === 'password') {
        return { score: 90, level: RiskLevels.HIGH, reason: 'Password field detected', type: 'Password' };
    }

    // 2. Credit Card Numbers
    const ccMatches = value.match(Patterns.CREDIT_CARD);
    if (ccMatches) {
        for (const match of ccMatches) {
            const clean = match.replace(/[\s-]/g, '');
            if (clean.length >= 13 && clean.length <= 19 && luhnCheck(clean)) {
                score += 80;
                detectionType = 'Credit Card';
                reasons.push('Likely credit card pattern matches');
                break;
            }
        }
    }

    // 3. Aadhaar (Check if not already identified as CC)
    if (!detectionType && Patterns.AADHAAR.test(value)) {
        score += 75;
        detectionType = 'Aadhaar Number';
        reasons.push('Aadhaar format detected');
    }

    // 4. API Keys / JWT
    if (Patterns.API_KEY.test(value)) {
        score += 85;
        if (!detectionType || detectionType === 'Aadhaar Number') detectionType = 'API Key / Token'; // Prioritize API Key
        reasons.push('High-entropy secret pattern detected');
    }

    // --- Tier 2 Detection (Medium Impact) ---

    // 5. PAN (India)
    if (Patterns.PAN.test(value)) {
        score += 50;
        if (!detectionType) detectionType = 'PAN Number';
        reasons.push('Tax ID format detected');
    }

    // 6. UPI ID
    if (Patterns.UPI.test(value)) {
        score += 40;
        if (!detectionType) detectionType = 'UPI ID';
    }

    // 7. Email & Phone (Updated to ensure detection triggers warning)
    if (Patterns.EMAIL.test(value)) {
        score += 35;
        if (!detectionType) detectionType = 'Email Address';
    }
    if (Patterns.PHONE.test(value)) {
        score += 35;
        if (!detectionType) detectionType = 'Phone Number';
    }

    // --- Contextual Boosters ---

    // CVV Logic: Only high risk if context matches
    if (Patterns.CVV.test(value)) {
        if (context.includes('cvv') || context.includes('cvc') || context.includes('security')) {
            score += 60;
            detectionType = 'CVV/CVC';
            reasons.push('CVV pattern in security context');
        }
    }

    // Keyword Boosters
    const hasHighRiskKeyword = Patterns.HIGH_RISK_KEYWORDS.some(k => context.includes(k));
    if (hasHighRiskKeyword) {
        score += 30;
        reasons.push('Sensitive field label found');
    }

    const hasMediumRiskKeyword = Patterns.MEDIUM_RISK_KEYWORDS.some(k => context.includes(k));
    if (hasMediumRiskKeyword) {
        score += 15;
    }

    // Heuristic: Is the page HTTPS?
    if (window.location.protocol !== 'https:') {
        score += 10; // Slightly riskier on HTTP
        reasons.push('Page is not HTTPS');
    }

    // --- Final Risk Mapping ---
    let finalLevel = RiskLevels.IGNORE;
    if (score >= 61) finalLevel = RiskLevels.HIGH;
    else if (score >= 31) finalLevel = RiskLevels.MEDIUM;
    else if (score >= 15) finalLevel = RiskLevels.LOW;

    return {
        score: Math.min(score, 100),
        level: finalLevel,
        reason: reasons.join(', '),
        type: detectionType || 'Sensitive Data'
    };
}

// Export
window.SensitivityEngine = {
    calculateRisk,
    RiskLevels
};
