/*
 * Sensitive Data Shield - Content Script
 * PRODUCTION READY V2
 */

// --- CONFIGURATION ---
const UI_ID_PREFIX = 'sds-ui-';
let isTrustedSite = false;
let globalEnabled = true;

// --- INITIALIZATION ---

function init() {
    const hostname = window.location.hostname;

    chrome.storage.local.get(['enabled', 'trustedSites'], (result) => {
        globalEnabled = result.enabled !== false;
        const trustedSites = result.trustedSites || [];

        // precise domain check or subdomain check
        isTrustedSite = trustedSites.some(site => hostname === site || hostname.endsWith('.' + site));

        if (globalEnabled && !isTrustedSite) {
            setupListeners();
            console.log('🛡️ Sensitive Data Shield active on ' + hostname);
        } else {
            console.log('🛡️ Sensitive Data Shield paused/trusted for ' + hostname);
        }
    });

    // Listen for runtime changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            if (changes.enabled) window.location.reload(); // Simple reload to apply global state
            if (changes.trustedSites) window.location.reload();
        }
    });
}

// --- CORE LOGIC ---

function setupListeners() {
    // Debounced Input Handler (Faster response: 150ms)
    const debouncedHandler = debounce(handleEvent, 150);

    // Capture Phase Listeners for broad coverage
    document.addEventListener('input', debouncedHandler, true);
    document.addEventListener('paste', handleEvent, true); // Immediate check on paste
    document.addEventListener('drop', debouncedHandler, true);

    // Check autofill eventually
    document.addEventListener('change', debouncedHandler, true);
    document.addEventListener('focusin', debouncedHandler, true);
}

function handleEvent(event) {
    if (!globalEnabled || isTrustedSite) return;

    let target = event.target;

    // Handle ContentEditable (Chat apps, Docs)
    // Sometimes the target is a span/p inside the contenteditable div
    if (target.isContentEditable || (target.parentNode && target.parentNode.isContentEditable)) {
        // Traverse up to find the root editable element for full context
        const rootEditable = target.closest('[contenteditable="true"]') || target;
        const value = rootEditable.textContent || ""; // Use the full text of the message
        processInput(value, rootEditable);
        return;
    }

    // Handle Input/Textarea
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Broaden supported types: include search, text, url, tel, email, password
        // Exclude only explicitly non-text types
        const excludedTypes = ['submit', 'button', 'image', 'file', 'checkbox', 'radio', 'range', 'color'];
        if (excludedTypes.includes(target.type)) return;

        processInput(target.value, target);
        return;
    }
}

function processInput(value, element) {
    if (!value) return;

    // Privacy: Memory-Only Analysis
    const risk = window.SensitivityEngine.calculateRisk(value, element);

    if (risk.level >= window.SensitivityEngine.RiskLevels.MEDIUM) {
        showWarning(element, risk);
    } else {
        clearWarning(element);
    }
}

// --- UI MANAGEMENT ---

function showWarning(element, risk) {
    if (element.dataset.sdsIgnored === 'true') return;
    if (element.dataset.sdsWarned === 'true' && risk.score === parseInt(element.dataset.sdsLastScore)) return;

    // Remove existing warning to refresh
    clearWarning(element);

    // 1. Highlight
    element.classList.add('sds-risk-highlight');
    if (risk.level === window.SensitivityEngine.RiskLevels.HIGH) {
        element.style.setProperty('--sds-border-color', '#ff4444');
    } else {
        element.style.setProperty('--sds-border-color', '#ffbb33');
    }

    // 2. Tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'sds-tooltip';
    tooltip.id = UI_ID_PREFIX + Math.random().toString(36).substr(2, 9);

    const levelText = risk.level === window.SensitivityEngine.RiskLevels.HIGH ? 'HIGH RISK' : 'Warning';
    const colorClass = risk.level === window.SensitivityEngine.RiskLevels.HIGH ? 'sds-text-red' : 'sds-text-orange';

    tooltip.innerHTML = `
        <div class="sds-header">
            <span class="sds-badge ${colorClass}">🛡️ ${levelText}</span>
            <button class="sds-close" title="Dismiss">×</button>
        </div>
        <div class="sds-body">
            <strong>${risk.type} detected</strong><br/>
            <span class="sds-reason">${risk.reason}</span>
        </div>
        <div class="sds-actions">
            <button class="sds-btn sds-btn-ignore">Ignore for now</button>
            <button class="sds-btn sds-btn-trust">Trust Site</button>
        </div>
    `;

    // Position logic
    const rect = element.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 8;
    const left = rect.left + window.scrollX;

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;

    document.body.appendChild(tooltip);

    // State Tracking
    element.dataset.sdsWarned = 'true';
    element.dataset.sdsLastScore = risk.score;
    element.dataset.sdsTooltipId = tooltip.id;

    // Event Listeners for UI
    tooltip.querySelector('.sds-close').addEventListener('click', (e) => {
        e.stopPropagation(); // prevent re-triggering focus
        clearWarning(element);
    });

    tooltip.querySelector('.sds-btn-ignore').addEventListener('click', (e) => {
        e.stopPropagation();
        element.dataset.sdsIgnored = 'true';
        clearWarning(element);
    });

    tooltip.querySelector('.sds-btn-trust').addEventListener('click', (e) => {
        e.stopPropagation();
        const domain = window.location.hostname;
        if (confirm(`Mark ${domain} as a trusted site? detection will be disabled here.`)) {
            addTrustedSite(domain);
        }
    });
}

function clearWarning(element) {
    element.classList.remove('sds-risk-highlight');
    element.style.removeProperty('--sds-border-color');
    if (element.dataset.sdsTooltipId) {
        const el = document.getElementById(element.dataset.sdsTooltipId);
        if (el) el.remove();
    }
    delete element.dataset.sdsTooltipId;
    delete element.dataset.sdsWarned;
}

function addTrustedSite(domain) {
    chrome.storage.local.get(['trustedSites'], (result) => {
        const sites = result.trustedSites || [];
        if (!sites.includes(domain)) {
            sites.push(domain);
            chrome.storage.local.set({ trustedSites: sites }, () => {
                alert('Site trusted. Reloading page...');
                window.location.reload();
            });
        }
    });
}

// --- UTILS ---

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Start
init();
