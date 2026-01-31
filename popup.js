document.addEventListener('DOMContentLoaded', () => {
    const globalToggle = document.getElementById('globalToggle');
    const statusBadge = document.getElementById('statusBadge');
    const currentDomainEl = document.getElementById('currentDomain');
    const toggleTrustBtn = document.getElementById('toggleTrustBtn');
    const optionsBtn = document.getElementById('optionsBtn');

    let currentDomain = '';

    // Get current tab domain
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url) {
            try {
                const url = new URL(tabs[0].url);
                currentDomain = url.hostname;
                currentDomainEl.textContent = currentDomain;
                checkTrustStatus();
            } catch (e) {
                currentDomainEl.textContent = 'Unknown';
            }
        }
    });

    // Load Global State
    chrome.storage.local.get(['enabled', 'trustedSites'], (result) => {
        const isEnabled = result.enabled !== false;
        globalToggle.checked = isEnabled;
        updateBadge(isEnabled);
    });

    // Toggle Global
    globalToggle.addEventListener('change', () => {
        const isEnabled = globalToggle.checked;
        chrome.storage.local.set({ enabled: isEnabled });
        updateBadge(isEnabled);
    });

    // Options Page
    optionsBtn.addEventListener('click', () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        }
    });

    // Trust Logic
    function checkTrustStatus() {
        chrome.storage.local.get(['trustedSites'], (result) => {
            const sites = result.trustedSites || [];
            if (sites.includes(currentDomain)) {
                toggleTrustBtn.textContent = 'Remove from Trusted Sites';
                toggleTrustBtn.style.background = '#666';
            } else {
                toggleTrustBtn.textContent = 'Add to Trusted Sites';
                toggleTrustBtn.style.background = '#1a73e8';
            }
        });
    }

    toggleTrustBtn.addEventListener('click', () => {
        if (!currentDomain) return;
        chrome.storage.local.get(['trustedSites'], (result) => {
            let sites = result.trustedSites || [];
            if (sites.includes(currentDomain)) {
                sites = sites.filter(s => s !== currentDomain);
            } else {
                sites.push(currentDomain);
            }
            chrome.storage.local.set({ trustedSites: sites }, () => {
                checkTrustStatus();
                chrome.tabs.reload(); // Reload to apply changes
            });
        });
    });

    function updateBadge(active) {
        statusBadge.textContent = active ? 'Active' : 'Paused';
        statusBadge.className = active ? 'status-badge active' : 'status-badge';
    }
});
