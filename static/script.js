// Global state
let allUpdates = [];
let filteredUpdates = [];
let currentFilter = 'all';
let searchQuery = '';
let selectedUpdate = null;

// DOM Elements
const feedContainer = document.getElementById('feed-container');
const refreshBtn = document.getElementById('refresh-btn');
const spinner = document.getElementById('spinner');
const refreshIcon = document.getElementById('refresh-icon');
const lastUpdatedSpan = document.getElementById('last-updated');
const searchInput = document.getElementById('search-input');
const filterPills = document.getElementById('filter-pills');

// Composer DOM Elements
const composerEmpty = document.getElementById('composer-empty');
const composerCard = document.getElementById('composer-card');
const composerBadge = document.getElementById('composer-badge');
const composerDate = document.getElementById('composer-date');
const composerNoteContent = document.getElementById('composer-note-content');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCountSpan = document.getElementById('char-count');
const tweetWarning = document.getElementById('tweet-warning');
const hashtagsList = document.getElementById('hashtags-list');
const copyTextBtn = document.getElementById('copy-text-btn');
const tweetBtn = document.getElementById('tweet-btn');
const toastContainer = document.getElementById('toast-container');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    refreshBtn.addEventListener('click', fetchReleases);
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        applyFiltersAndSearch();
    });

    filterPills.addEventListener('click', (e) => {
        if (e.target.classList.contains('pill')) {
            // Remove active class from all pills
            filterPills.querySelectorAll('.pill').forEach(pill => pill.classList.remove('active'));
            // Add active class to clicked pill
            e.target.classList.add('active');
            
            currentFilter = e.target.getAttribute('data-filter');
            applyFiltersAndSearch();
        }
    });

    // Composer inputs
    tweetTextarea.addEventListener('input', updateCharCounter);

    hashtagsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('tag-pill')) {
            e.target.classList.toggle('active');
            recomposeTweet();
        }
    });

    copyTextBtn.addEventListener('click', copyTweetToClipboard);
    tweetBtn.addEventListener('click', postToX);
}

// Fetch Release Notes
async function fetchReleases() {
    setLoadingState(true);
    try {
        const response = await fetch('/api/releases');
        if (!response.ok) {
            throw new Error(`Server returned status ${response.status}`);
        }
        const data = await response.json();
        
        if (data.success) {
            processEntries(data.entries);
            lastUpdatedSpan.textContent = `Last checked: ${new Date().toLocaleTimeString()}`;
            showToast('Release notes successfully updated!', 'success');
        } else {
            throw new Error(data.error || 'Failed to fetch release notes');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        showErrorState(error.message);
        showToast('Failed to fetch release notes', 'error');
    } finally {
        setLoadingState(false);
    }
}

// Set UI Loading State
function setLoadingState(isLoading) {
    if (isLoading) {
        spinner.classList.remove('hidden');
        refreshIcon.classList.add('hidden');
        refreshBtn.disabled = true;
        
        // Show loading in feed container if empty
        if (allUpdates.length === 0) {
            feedContainer.innerHTML = `
                <div class="loading-state">
                    <div class="spinner-large"></div>
                    <p>Fetching BigQuery release notes...</p>
                </div>
            `;
        }
    } else {
        spinner.classList.add('hidden');
        refreshIcon.classList.remove('hidden');
        refreshBtn.disabled = false;
    }
}

// Show Error UI State
function showErrorState(message) {
    feedContainer.innerHTML = `
        <div class="error-state">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <h3>Unable to load release notes</h3>
            <p>${message}</p>
            <button class="btn btn-primary" onclick="fetchReleases()">Try Again</button>
        </div>
    `;
}

// Parse feed entries into individual release updates
function processEntries(entries) {
    allUpdates = [];
    
    entries.forEach((entry, entryIndex) => {
        const entryTitle = entry.title; // Represents the date
        const entryLink = entry.link;
        const entryContent = entry.content;
        
        // Use browser DOM parser to break entry content by H3 tags
        const parser = new DOMParser();
        const doc = parser.parseFromString(entryContent, 'text/html');
        const h3Headers = doc.querySelectorAll('h3');
        
        if (h3Headers.length === 0) {
            // Fallback: If no H3, treat entire content as single "General" update
            const textContent = doc.body.textContent.trim().replace(/\s+/g, ' ');
            allUpdates.push({
                id: `entry-${entryIndex}-0`,
                date: entryTitle,
                link: entryLink,
                type: 'General',
                htmlContent: entryContent,
                textContent: textContent
            });
        } else {
            h3Headers.forEach((h3, h3Index) => {
                const type = h3.textContent.trim();
                
                // Collect sibling nodes until next H3
                const siblings = [];
                let sibling = h3.nextSibling;
                while (sibling && sibling.tagName !== 'H3') {
                    siblings.push(sibling.cloneNode(true));
                    sibling = sibling.nextSibling;
                }
                
                // Construct outerHTML of siblings
                const tempDiv = document.createElement('div');
                siblings.forEach(node => tempDiv.appendChild(node));
                
                const htmlContent = tempDiv.innerHTML;
                const textContent = tempDiv.textContent.trim().replace(/\s+/g, ' ');
                
                allUpdates.push({
                    id: `entry-${entryIndex}-${h3Index}`,
                    date: entryTitle,
                    link: entryLink,
                    type: type, // e.g. Feature, Issue, Breaking, Announcement, Change
                    htmlContent: htmlContent,
                    textContent: textContent
                });
            });
        }
    });
    
    applyFiltersAndSearch();
}

// Filter and Search Updates
function applyFiltersAndSearch() {
    filteredUpdates = allUpdates.filter(update => {
        // Filter by pill selection
        const matchesPill = currentFilter === 'all' || update.type.toLowerCase() === currentFilter;
        
        // Search by keyword in title/date, type, and text content
        const matchesSearch = searchQuery === '' || 
            update.date.toLowerCase().includes(searchQuery) ||
            update.type.toLowerCase().includes(searchQuery) ||
            update.textContent.toLowerCase().includes(searchQuery);
            
        return matchesPill && matchesSearch;
    });
    
    renderUpdatesList();
}

// Render Updates List in Feed
function renderUpdatesList() {
    if (filteredUpdates.length === 0) {
        feedContainer.innerHTML = `
            <div class="loading-state">
                <p>No release notes matches your criteria.</p>
            </div>
        `;
        return;
    }
    
    feedContainer.innerHTML = '';
    
    filteredUpdates.forEach(update => {
        const card = document.createElement('div');
        card.className = 'release-card';
        if (selectedUpdate && selectedUpdate.id === update.id) {
            card.classList.add('selected');
        }
        
        card.setAttribute('data-id', update.id);
        
        const badgeClass = getBadgeClass(update.type);
        
        card.innerHTML = `
            <div class="card-header-row">
                <span class="card-date-badge">${update.date}</span>
                <span class="badge ${badgeClass}">${update.type}</span>
            </div>
            <div class="card-body-content">
                ${update.htmlContent}
            </div>
            <div class="card-action-bar">
                <button class="card-tweet-icon-btn" title="Tweet this update">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    Tweet
                </button>
            </div>
        `;
        
        // Card click selection
        card.addEventListener('click', (e) => {
            // Check if tweet button clicked
            const tweetBtnClicked = e.target.closest('.card-tweet-icon-btn');
            selectCard(update);
            
            if (tweetBtnClicked) {
                // Instantly focus and scroll to tweet composer
                setTimeout(() => {
                    tweetTextarea.focus();
                    composerSection.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        });
        
        feedContainer.appendChild(card);
    });
}

// Select Card & Open Composer
function selectCard(update) {
    selectedUpdate = update;
    
    // Highlight active card
    document.querySelectorAll('.release-card').forEach(card => {
        card.classList.remove('selected');
        if (card.getAttribute('data-id') === update.id) {
            card.classList.add('selected');
        }
    });
    
    // Toggle composer view
    composerEmpty.classList.add('hidden');
    composerCard.classList.remove('hidden');
    
    // Update contents
    composerBadge.className = `badge ${getBadgeClass(update.type)}`;
    composerBadge.textContent = update.type;
    composerDate.textContent = update.date;
    composerNoteContent.innerHTML = update.htmlContent;
    
    // Generate draft tweet
    recomposeTweet();
}

// Construct Tweet Text based on Selected Note and Active Tags
function recomposeTweet() {
    if (!selectedUpdate) return;
    
    const activeTags = [];
    hashtagsList.querySelectorAll('.tag-pill.active').forEach(pill => {
        activeTags.push(pill.getAttribute('data-tag'));
    });
    
    const headerStr = `📢 BigQuery ${selectedUpdate.type} (${selectedUpdate.date}):\n`;
    const linkStr = selectedUpdate.link ? `\n\nRef: ${selectedUpdate.link}` : '';
    const tagsStr = activeTags.length > 0 ? `\n\n${activeTags.join(' ')}` : '';
    
    // Calculate character limit for text summary
    // Total character budget = 280
    // Reserved = header + links + hashtags
    const reservedLength = headerStr.length + linkStr.length + tagsStr.length;
    const maxTextLen = 280 - reservedLength;
    
    let summaryText = selectedUpdate.textContent;
    if (summaryText.length > maxTextLen) {
        summaryText = summaryText.substring(0, maxTextLen - 3).trim() + '...';
    }
    
    const fullTweetText = `${headerStr}${summaryText}${linkStr}${tagsStr}`;
    tweetTextarea.value = fullTweetText;
    updateCharCounter();
}

// Update character counter and warnings
function updateCharCounter() {
    const textLen = tweetTextarea.value.length;
    charCountSpan.textContent = `${textLen}/280`;
    
    if (textLen > 280) {
        charCountSpan.classList.add('exceeded');
        charCountSpan.classList.remove('warning');
        tweetWarning.classList.remove('hidden');
        tweetBtn.disabled = true;
    } else if (textLen > 250) {
        charCountSpan.classList.add('warning');
        charCountSpan.classList.remove('exceeded');
        tweetWarning.classList.add('hidden');
        tweetBtn.disabled = false;
    } else {
        charCountSpan.classList.remove('warning', 'exceeded');
        tweetWarning.classList.add('hidden');
        tweetBtn.disabled = false;
    }
}

// Copy Tweet text to clipboard
function copyTweetToClipboard() {
    const text = tweetTextarea.value;
    navigator.clipboard.writeText(text).then(() => {
        showToast('Tweet copied to clipboard!', 'success');
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        showToast('Failed to copy text', 'error');
    });
}

// Launch Twitter share Intent
function postToX() {
    const tweetText = tweetTextarea.value;
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(xUrl, '_blank', 'width=600,height=400,resizable=yes');
}

// Helpers
function getBadgeClass(type) {
    const lookup = {
        'feature': 'badge-feature',
        'announcement': 'badge-announcement',
        'issue': 'badge-issue',
        'breaking': 'badge-breaking',
        'change': 'badge-change',
        'general': 'badge-general'
    };
    return lookup[type.toLowerCase()] || 'badge-general';
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Check type for icons
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        `;
    } else {
        iconSvg = `
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
        `;
    }
    
    toast.innerHTML = `${iconSvg} <span>${message}</span>`;
    toastContainer.appendChild(toast);
    
    // Fade out and remove
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3000);
}
