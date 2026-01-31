document.addEventListener('DOMContentLoaded', loadSites);

function loadSites() {
    const list = document.getElementById('siteList');
    list.innerHTML = '';

    chrome.storage.local.get(['trustedSites'], (result) => {
        const sites = result.trustedSites || [];

        if (sites.length === 0) {
            list.innerHTML = '<div class="empty">No trusted sites yet.</div>';
            return;
        }

        sites.forEach(site => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${site}</span>
                <button class="remove" data-site="${site}">Remove</button>
            `;
            list.appendChild(li);
        });

        document.querySelectorAll('.remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                removeSite(e.target.dataset.site);
            });
        });
    });
}

function removeSite(siteToRemove) {
    chrome.storage.local.get(['trustedSites'], (result) => {
        let sites = result.trustedSites || [];
        sites = sites.filter(s => s !== siteToRemove);
        chrome.storage.local.set({ trustedSites: sites }, loadSites);
    });
}
