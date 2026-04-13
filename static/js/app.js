/**
 * Customer Support Agent — Dashboard JavaScript
 * Handles navigation, compose form, inbox list, detail modal, and review queue.
 */

const API_BASE = '/api/v1';

// ── Navigation ──────────────────────────────────────────────────────

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const viewId = item.dataset.view;
        switchView(viewId);
    });
});

function switchView(viewId) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navEl = document.querySelector(`[data-view="${viewId}"]`);
    if (navEl) navEl.classList.add('active');

    // Update views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const viewEl = document.getElementById(`view-${viewId}`);
    if (viewEl) viewEl.classList.add('active');

    // Refresh data for target view
    if (viewId === 'inbox') loadInbox();
    if (viewId === 'review') loadReviewQueue();
}

// ── Sample Emails ───────────────────────────────────────────────────

const SAMPLES = [
    {
        sender: 'jane.smith@company.com',
        subject: 'Double charge on my subscription',
        body: 'Hi,\n\nI just checked my bank statement and it looks like I was charged twice for my Pro subscription this month — once on April 1st and again on April 3rd.\n\nThe amounts are $29.99 each. Can you please look into this and process a refund for the duplicate charge?\n\nThank you,\nJane'
    },
    {
        sender: 'dev.team@startup.io',
        subject: 'API returning 401 errors after key rotation',
        body: 'Hello support,\n\nWe rotated our API keys yesterday following your documentation, but all our requests are now returning 401 Unauthorized errors.\n\nWe\'ve confirmed the new key is being sent in the Authorization header correctly. Our integration was working fine before the rotation.\n\nCan you help us debug this? It\'s blocking our production deployment.\n\nBest,\nMike from DevOps'
    },
    {
        sender: 'alex.johnson@email.com',
        subject: 'Cannot reset my password',
        body: 'Hi there,\n\nI\'ve been trying to reset my password for the past hour but I never receive the reset email. I\'ve checked my spam folder and everything.\n\nMy account email is alex.johnson@email.com. I need to access my account urgently for a deadline.\n\nPlease help!\nAlex'
    },
    {
        sender: 'sarah.miller@corp.net',
        subject: 'What are your business hours?',
        body: 'Hello,\n\nI wanted to know your customer support business hours and whether you offer support on weekends. Also, do you have a phone support line?\n\nThanks,\nSarah'
    },
];

let sampleIndex = 0;

document.getElementById('btn-sample').addEventListener('click', () => {
    const sample = SAMPLES[sampleIndex % SAMPLES.length];
    document.getElementById('email-sender').value = sample.sender;
    document.getElementById('email-subject').value = sample.subject;
    document.getElementById('email-body').value = sample.body;
    sampleIndex++;
    showToast('Sample email loaded', 'info');
});

// ── Compose Form ────────────────────────────────────────────────────

document.getElementById('compose-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const sender = document.getElementById('email-sender').value.trim();
    const subject = document.getElementById('email-subject').value.trim();
    const body = document.getElementById('email-body').value.trim();

    if (!sender || !subject || !body) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    // Toggle loading state
    setLoading(true);

    try {
        const response = await fetch(`${API_BASE}/process-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender, subject, body }),
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || `Server error (${response.status})`);
        }

        const data = await response.json();
        showResult(data);
        showToast(`Email processed — Ticket ${data.ticket_id}`, 'success');
        updateBadges();

    } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
        console.error('Process email failed:', err);
    } finally {
        setLoading(false);
    }
});

function setLoading(loading) {
    const btn = document.getElementById('btn-send');
    const text = document.getElementById('btn-send-text');
    const spinner = document.getElementById('btn-send-spinner');
    btn.disabled = loading;
    text.style.display = loading ? 'none' : 'inline-flex';
    spinner.style.display = loading ? 'inline-flex' : 'none';
}

// ── Show Pipeline Result ────────────────────────────────────────────

function showResult(data) {
    const panel = document.getElementById('result-panel');
    panel.style.display = 'block';

    // Status badge
    const statusBadge = document.getElementById('result-status-badge');
    const statusText = formatStatus(data.status);
    statusBadge.textContent = statusText;
    statusBadge.className = `badge badge-${data.status}`;

    // Pipeline steps
    const stepsEl = document.getElementById('pipeline-steps');
    const category = typeof data.category === 'object' ? data.category : data.category;
    const catName = typeof category === 'string' ? category : (category?.value || category || 'unknown');
    const confidence = (data.confidence * 100).toFixed(0);

    const confColor = data.confidence >= 0.8 ? 'var(--color-success)' :
                      data.confidence >= 0.5 ? 'var(--color-warning)' : 'var(--color-danger)';

    stepsEl.innerHTML = `
        <div class="step-card">
            <div class="step-label">Ticket ID</div>
            <div class="step-value" style="font-family: monospace; color: var(--accent-hover);">#${data.ticket_id}</div>
        </div>
        <div class="step-card">
            <div class="step-label">Category</div>
            <div class="step-value category">
                <span class="category-dot" style="background: var(--cat-${catName})"></span>
                ${capitalize(catName)}
            </div>
        </div>
        <div class="step-card">
            <div class="step-label">Confidence</div>
            <div class="step-value" style="color: ${confColor}">${confidence}%</div>
            <div class="confidence-bar">
                <div class="confidence-fill" style="width: ${confidence}%; background: ${confColor}"></div>
            </div>
        </div>
        <div class="step-card">
            <div class="step-label">Escalated</div>
            <div class="step-value" style="color: ${data.needs_escalation ? 'var(--color-warning)' : 'var(--color-success)'}">
                ${data.needs_escalation ? '⚠️ Yes' : '✅ No'}
            </div>
        </div>
    `;

    // Draft response
    document.getElementById('draft-response-text').textContent = data.draft_response || '(No draft generated)';

    // Escalation info
    const escInfo = document.getElementById('escalation-info');
    if (data.needs_escalation && data.escalation_reason) {
        escInfo.style.display = 'block';
        document.getElementById('escalation-reason-text').textContent = data.escalation_reason;
    } else {
        escInfo.style.display = 'none';
    }

    // Smooth scroll to result
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Inbox ───────────────────────────────────────────────────────────

async function loadInbox() {
    try {
        const response = await fetch(`${API_BASE}/emails`);
        const data = await response.json();
        renderInbox(data.tickets || []);
    } catch (err) {
        console.error('Failed to load inbox:', err);
        showToast('Failed to load inbox', 'error');
    }
}

function renderInbox(tickets) {
    const listEl = document.getElementById('inbox-list');
    const emptyEl = document.getElementById('inbox-empty');

    // Stats
    document.getElementById('stat-total').textContent = tickets.length;
    document.getElementById('stat-escalated').textContent = tickets.filter(t => t.needs_escalation).length;
    document.getElementById('stat-sent').textContent = tickets.filter(t => t.status === 'sent' || t.status === 'approved').length;

    if (tickets.length === 0) {
        listEl.innerHTML = '';
        listEl.appendChild(emptyEl);
        emptyEl.style.display = 'block';
        return;
    }

    listEl.innerHTML = tickets.map(t => {
        const catName = getCategoryName(t.category);
        const timeStr = formatTime(t.created_at);
        return `
            <div class="email-item" data-ticket-id="${t.ticket_id}">
                <div class="email-main">
                    <div class="email-sender">${escapeHtml(t.email?.sender || 'Unknown')}</div>
                    <div class="email-subject">${escapeHtml(t.email?.subject || '(no subject)')}</div>
                    <div class="email-meta">
                        <span class="badge badge-${catName}">${capitalize(catName)}</span>
                        <span class="badge badge-${t.status}">${formatStatus(t.status)}</span>
                        <span class="email-time">${timeStr}</span>
                    </div>
                </div>
                <div class="email-actions">
                    <span style="font-size: 0.8rem; color: var(--text-muted); font-family: monospace;">#${t.ticket_id}</span>
                </div>
            </div>
        `;
    }).join('');

    // Click handlers
    listEl.querySelectorAll('.email-item').forEach(el => {
        el.addEventListener('click', () => {
            const ticketId = el.dataset.ticketId;
            const ticket = tickets.find(t => t.ticket_id === ticketId);
            if (ticket) showDetail(ticket);
        });
    });
}

// ── Search ──────────────────────────────────────────────────────────

let searchTimeout = null;
document.getElementById('inbox-search')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        const query = e.target.value.toLowerCase().trim();
        const response = await fetch(`${API_BASE}/emails`);
        const data = await response.json();
        let tickets = data.tickets || [];

        if (query) {
            tickets = tickets.filter(t =>
                (t.email?.sender || '').toLowerCase().includes(query) ||
                (t.email?.subject || '').toLowerCase().includes(query) ||
                getCategoryName(t.category).includes(query) ||
                (t.status || '').toLowerCase().includes(query)
            );
        }

        renderInbox(tickets);
    }, 250);
});

// ── Detail Overlay ──────────────────────────────────────────────────

function showDetail(ticket) {
    const overlay = document.getElementById('detail-overlay');
    const body = document.getElementById('detail-body');
    const title = document.getElementById('detail-title');

    title.textContent = ticket.email?.subject || 'Email Details';

    const catName = getCategoryName(ticket.category);
    const confidence = (ticket.confidence * 100).toFixed(0);
    const confColor = ticket.confidence >= 0.8 ? 'var(--color-success)' :
                      ticket.confidence >= 0.5 ? 'var(--color-warning)' : 'var(--color-danger)';

    body.innerHTML = `
        <!-- Email Info -->
        <div class="detail-section">
            <div class="detail-section-title">📧 Original Email</div>
            <div class="detail-field">
                <div class="detail-field-label">From</div>
                <div class="detail-field-value">${escapeHtml(ticket.email?.sender || '')}</div>
            </div>
            <div class="detail-field">
                <div class="detail-field-label">Subject</div>
                <div class="detail-field-value">${escapeHtml(ticket.email?.subject || '')}</div>
            </div>
            <div class="detail-field">
                <div class="detail-field-label">Received</div>
                <div class="detail-field-value">${formatTime(ticket.created_at)}</div>
            </div>
            <div style="margin-top: 12px;">
                <div class="detail-content-block">${escapeHtml(ticket.email?.body || '')}</div>
            </div>
        </div>

        <!-- Classification -->
        <div class="detail-section">
            <div class="detail-section-title">🏷️ Classification</div>
            <div class="detail-field">
                <div class="detail-field-label">Category</div>
                <div class="detail-field-value"><span class="badge badge-${catName}">${capitalize(catName)}</span></div>
            </div>
            <div class="detail-field">
                <div class="detail-field-label">Confidence</div>
                <div class="detail-field-value" style="color: ${confColor}; font-weight: 600;">${confidence}%</div>
            </div>
            <div class="detail-field">
                <div class="detail-field-label">Status</div>
                <div class="detail-field-value"><span class="badge badge-${ticket.status}">${formatStatus(ticket.status)}</span></div>
            </div>
            <div class="detail-field">
                <div class="detail-field-label">Ticket ID</div>
                <div class="detail-field-value" style="font-family: monospace; color: var(--accent-hover);">#${ticket.ticket_id}</div>
            </div>
        </div>

        <!-- KB Context -->
        ${ticket.context && ticket.context.length > 0 ? `
        <div class="detail-section">
            <div class="detail-section-title">📚 Retrieved Knowledge Base Context</div>
            <div class="context-list">
                ${ticket.context.map((chunk, i) => `
                    <div class="context-chunk">${escapeHtml(chunk)}</div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Draft Response -->
        <div class="detail-section">
            <div class="detail-section-title">📝 AI Draft Response</div>
            <div class="detail-content-block">${escapeHtml(ticket.draft_response || '(None)')}</div>
        </div>

        <!-- Final Response -->
        ${ticket.final_response ? `
        <div class="detail-section">
            <div class="detail-section-title">✅ Final Response (Sent)</div>
            <div class="detail-content-block" style="border-left: 3px solid var(--color-success);">${escapeHtml(ticket.final_response)}</div>
        </div>
        ` : ''}

        <!-- Escalation -->
        ${ticket.needs_escalation ? `
        <div class="detail-section">
            <div class="detail-section-title">⚠️ Escalation</div>
            <div class="detail-content-block" style="border-left: 3px solid var(--color-warning);">${escapeHtml(ticket.escalation_reason || 'Escalated for human review')}</div>
        </div>
        ` : ''}
    `;

    overlay.classList.add('active');
}

document.getElementById('detail-close').addEventListener('click', closeDetail);
document.getElementById('detail-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeDetail();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetail();
});

function closeDetail() {
    document.getElementById('detail-overlay').classList.remove('active');
}

// ── Review Queue ────────────────────────────────────────────────────

async function loadReviewQueue() {
    try {
        const response = await fetch(`${API_BASE}/review`);
        const data = await response.json();
        renderReviewQueue(data.tickets || []);
    } catch (err) {
        console.error('Failed to load review queue:', err);
        showToast('Failed to load review queue', 'error');
    }
}

function renderReviewQueue(tickets) {
    const listEl = document.getElementById('review-list');
    const emptyEl = document.getElementById('review-empty');

    if (tickets.length === 0) {
        listEl.innerHTML = '';
        listEl.appendChild(emptyEl);
        emptyEl.style.display = 'block';
        return;
    }

    listEl.innerHTML = tickets.map(t => `
        <div class="card" style="margin-bottom: 12px; animation: fadeSlideIn 0.3s ease;">
            <div class="card-header">
                <h2 class="card-title" style="font-size: 0.9rem;">
                    <span style="color: var(--text-muted);">#${t.ticket_id}</span> —
                    ${escapeHtml(t.email?.subject || '(no subject)')}
                </h2>
                <span class="badge badge-${getCategoryName(t.category)}">${capitalize(getCategoryName(t.category))}</span>
            </div>
            <div class="card-body">
                <div class="detail-field" style="margin-bottom: 8px;">
                    <div class="detail-field-label">From</div>
                    <div class="detail-field-value">${escapeHtml(t.email?.sender || '')}</div>
                </div>
                <div class="detail-field" style="margin-bottom: 8px;">
                    <div class="detail-field-label">Reason</div>
                    <div class="detail-field-value" style="color: var(--color-warning);">${escapeHtml(t.escalation_reason || '')}</div>
                </div>
                <div style="margin-top: 12px;">
                    <div class="detail-section-title">Draft Response</div>
                    <div class="detail-content-block" style="max-height:160px">${escapeHtml(t.draft_response || '')}</div>
                </div>
                <div class="review-actions">
                    <button class="btn btn-success btn-sm" onclick="reviewTicket('${t.ticket_id}', 'approve')">✅ Approve & Send</button>
                    <button class="btn btn-danger btn-sm" onclick="reviewTicket('${t.ticket_id}', 'reject')">❌ Reject</button>
                </div>
            </div>
        </div>
    `).join('');
}

async function reviewTicket(ticketId, action) {
    try {
        const response = await fetch(`${API_BASE}/review/${ticketId}?action=${action}`, {
            method: 'POST',
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.detail || `Failed (${response.status})`);
        }

        const data = await response.json();
        showToast(`Ticket #${ticketId}: ${data.message}`, 'success');
        loadReviewQueue();
        updateBadges();

    } catch (err) {
        showToast(`Error: ${err.message}`, 'error');
    }
}

// ── Badge Updates ───────────────────────────────────────────────────

async function updateBadges() {
    try {
        const [emailsRes, reviewRes] = await Promise.all([
            fetch(`${API_BASE}/emails`),
            fetch(`${API_BASE}/review`),
        ]);

        const emails = await emailsRes.json();
        const review = await reviewRes.json();

        const inboxCount = emails.total || 0;
        const reviewCount = review.pending_count || 0;

        const inboxBadge = document.getElementById('inbox-badge');
        const reviewBadge = document.getElementById('review-badge');

        if (inboxCount > 0) {
            inboxBadge.textContent = inboxCount;
            inboxBadge.style.display = 'inline';
        } else {
            inboxBadge.style.display = 'none';
        }

        if (reviewCount > 0) {
            reviewBadge.textContent = reviewCount;
            reviewBadge.style.display = 'inline';
        } else {
            reviewBadge.style.display = 'none';
        }
    } catch (err) {
        console.error('Failed to update badges:', err);
    }
}

// ── Toasts ──────────────────────────────────────────────────────────

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || ''}</span><span>${escapeHtml(message)}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ── Utilities ───────────────────────────────────────────────────────

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function getCategoryName(category) {
    if (!category) return 'unknown';
    if (typeof category === 'string') return category.toLowerCase();
    if (typeof category === 'object' && category.value) return category.value.toLowerCase();
    return 'unknown';
}

function formatStatus(status) {
    if (!status) return 'Unknown';
    const map = {
        'processing': 'Processing',
        'sent': 'Sent',
        'approved': 'Approved',
        'pending_review': 'Pending Review',
        'follow_up_scheduled': 'Follow-up',
        'rejected': 'Rejected',
    };
    return map[status] || capitalize(String(status).replace(/_/g, ' '));
}

function formatTime(isoString) {
    if (!isoString) return '';
    try {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;

        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
        return isoString;
    }
}

// ── Init ────────────────────────────────────────────────────────────

updateBadges();
