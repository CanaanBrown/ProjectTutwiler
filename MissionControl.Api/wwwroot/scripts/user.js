// User Dashboard JavaScript

let currentUser = null;
let currentSiteId = null;
let alertsCache = [];
let assetsCache = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await CommonUtils.getCurrentUser();
  currentSiteId = currentUser.siteId;

  document.getElementById('userName').textContent = currentUser.name || 'User';
  
  await loadCompanyInfo();
  await loadAssets();
  await refreshAll();
  setupEventHandlers();
});

// Load Company Info
async function loadCompanyInfo() {
  try {
    const sites = await CommonUtils.apiCall('/api/Sites');
    const site = sites.find(s => s.siteId === currentSiteId);
    if (site) {
      document.getElementById('companyName').textContent = site.name;
    }
  } catch (err) {
    console.error('Error loading company info:', err);
  }
}

// Load Assets
async function loadAssets() {
  try {
    // Mock data for now (backend endpoint to be added)
    assetsCache = [
      { id: 1, name: 'Lab Blood Analyzer Controller', vendor: 'Meditech Systems' },
      { id: 2, name: 'Outpatient Check-in Kiosk', vendor: 'Nova Health' },
      { id: 3, name: 'Public Website CMS', vendor: 'CityNet' }
    ];

    // Populate affected systems dropdown
    const select = document.getElementById('incidentAffectedSystems');
    select.innerHTML = '';
    assetsCache.forEach(asset => {
      const opt = document.createElement('option');
      opt.value = asset.id;
      opt.textContent = `${asset.name} (${asset.vendor})`;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Error loading assets:', err);
  }
}

// Load Metrics
async function loadMetrics() {
  try {
    const query = CommonUtils.buildSiteQuery(currentSiteId);
    const metrics = await CommonUtils.apiCall(`/api/Metrics/overview${query}`);

    document.getElementById('mTotalAlerts').textContent = metrics.totalAlerts || 0;
    document.getElementById('mActiveAlerts').textContent = metrics.activeAlerts || 0;
    document.getElementById('mResolvedAlerts').textContent = 
      (metrics.totalAlerts || 0) - (metrics.activeAlerts || 0);
    document.getElementById('mBands').textContent = 
      `${metrics.redAlerts || 0} / ${metrics.yellowAlerts || 0} / ${metrics.greenAlerts || 0}`;
  } catch (err) {
    console.error('Error loading metrics:', err);
  }
}

// Load Incoming Alerts
async function loadIncomingAlerts() {
  const listEl = document.getElementById('incomingAlertsList');
  listEl.innerHTML = '<div class="muted">Loading...</div>';

  try {
    const query = CommonUtils.buildSiteQuery(currentSiteId);
    const alerts = await CommonUtils.apiCall(`/api/Alerts${query}`);

    // Filter for recent active alerts (last 24 hours)
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const incoming = alerts
      .filter(a => {
        if (a.status !== 'ACTIVE') return false;
        if (!a.detectedAt) return false;
        const detected = new Date(a.detectedAt);
        return detected >= yesterday;
      })
      .sort((a, b) => {
        const da = new Date(a.detectedAt).getTime();
        const db = new Date(b.detectedAt).getTime();
        return db - da;
      })
      .slice(0, 10);

    if (incoming.length === 0) {
      listEl.innerHTML = '<div class="muted">No new alerts in the last 24 hours</div>';
      return;
    }

    listEl.innerHTML = '';
    incoming.forEach(alert => {
      const item = document.createElement('div');
      item.className = 'alert-feed-item';
      
      const band = alert.impactBand || 'UNKNOWN';
      const bandClass = CommonUtils.badgeBandClass(band);
      const timeText = CommonUtils.formatDate(alert.detectedAt);

      item.innerHTML = `
        <div class="alert-feed-header">
          <span class="alert-feed-title" onclick="showAlertDetail(${alert.alertId})">${alert.title}</span>
          <span class="badge ${bandClass}">${band}</span>
        </div>
        <div class="alert-feed-meta">
          <span class="muted">${timeText}</span>
          ${alert.affectedFunction ? `<span class="muted">• ${alert.affectedFunction}</span>` : ''}
        </div>
      `;
      
      listEl.appendChild(item);
    });
  } catch (err) {
    console.error('Error loading incoming alerts:', err);
    listEl.innerHTML = '<div class="muted">Error loading alerts</div>';
  }
}

// Load All Alerts
async function loadAllAlerts() {
  const listEl = document.getElementById('alertsList');
  listEl.innerHTML = '<div class="muted">Loading...</div>';

  try {
    const query = CommonUtils.buildSiteQuery(currentSiteId);
    alertsCache = await CommonUtils.apiCall(`/api/Alerts${query}`);

    // Populate related alerts dropdown
    const select = document.getElementById('incidentRelatedAlerts');
    select.innerHTML = '<option value="">No related alerts</option>';
    alertsCache.forEach(alert => {
      const opt = document.createElement('option');
      opt.value = alert.alertId;
      opt.textContent = `${alert.title} (${alert.impactBand || 'UNKNOWN'})`;
      select.appendChild(opt);
    });

    renderAlerts();
  } catch (err) {
    console.error('Error loading alerts:', err);
    listEl.innerHTML = '<div class="muted">Error loading alerts</div>';
  }
}

// Render Alerts
function renderAlerts() {
  const listEl = document.getElementById('alertsList');
  const statusFilter = document.getElementById('filterStatus').value;
  const bandFilter = document.getElementById('filterBand').value;
  const dateFrom = document.getElementById('filterDateFrom').value;
  const dateTo = document.getElementById('filterDateTo').value;

  let filtered = [...alertsCache];

  if (statusFilter) {
    filtered = filtered.filter(a => (a.status || '').toUpperCase() === statusFilter);
  }
  if (bandFilter) {
    filtered = filtered.filter(a => (a.impactBand || '').toUpperCase() === bandFilter);
  }
  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    filtered = filtered.filter(a => {
      if (!a.detectedAt) return false;
      return new Date(a.detectedAt) >= fromDate;
    });
  }
  if (dateTo) {
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    filtered = filtered.filter(a => {
      if (!a.detectedAt) return false;
      return new Date(a.detectedAt) <= toDate;
    });
  }

  // Sort by detected date (newest first)
  filtered.sort((a, b) => {
    const da = a.detectedAt ? new Date(a.detectedAt).getTime() : 0;
    const db = b.detectedAt ? new Date(b.detectedAt).getTime() : 0;
    return db - da;
  });

  if (filtered.length === 0) {
    listEl.innerHTML = '<div class="muted">No alerts match the filters</div>';
    return;
  }

  listEl.innerHTML = '';
  filtered.forEach(alert => {
    const card = document.createElement('div');
    card.className = 'alert-card';
    card.onclick = () => showAlertDetail(alert.alertId);

    const band = alert.impactBand || 'UNKNOWN';
    const bandClass = CommonUtils.badgeBandClass(band);
    const status = alert.status || 'UNKNOWN';
    const timeText = CommonUtils.formatDate(alert.detectedAt);

    card.innerHTML = `
      <div class="alert-card-header">
        <h3 class="alert-card-title">${alert.title}</h3>
        <div class="alert-card-badges">
          <span class="badge ${bandClass}">${band}</span>
          <span class="badge badge-status">${status}</span>
          ${alert.currentDecision ? `<span class="badge badge-decision">${alert.currentDecision}</span>` : ''}
        </div>
      </div>
      <div class="alert-card-body">
        <p class="alert-card-description">${alert.description || '(no description)'}</p>
        <div class="alert-card-meta">
          <span class="muted">Detected: ${timeText}</span>
          ${alert.affectedFunction ? `<span class="muted">• Function: ${alert.affectedFunction}</span>` : ''}
        </div>
      </div>
    `;

    listEl.appendChild(card);
  });
}

// Show Alert Detail
async function showAlertDetail(alertId) {
  const modal = document.getElementById('alertDetailModal');
  const content = document.getElementById('alertDetailContent');
  const title = document.getElementById('alertDetailTitle');

  modal.classList.remove('hidden');
  content.innerHTML = '<div class="muted">Loading...</div>';

  try {
    const alert = alertsCache.find(a => a.alertId === alertId);
    if (!alert) {
      content.innerHTML = '<div class="muted">Alert not found</div>';
      return;
    }

    title.textContent = alert.title;

    const band = alert.impactBand || 'UNKNOWN';
    const bandClass = CommonUtils.badgeBandClass(band);
    const playbook = CommonUtils.playbookForAlert(alert);

    // Load decision history
    let history = [];
    try {
      history = await CommonUtils.apiCall(`/api/Alerts/${alertId}/decisions`);
    } catch (err) {
      console.error('Error loading history:', err);
    }

    content.innerHTML = `
      <div class="alert-detail">
        <div class="pill-row">
          <span class="pill pill-tlp">${alert.tlp || 'TLP:UNKNOWN'}</span>
          <span class="pill ${CommonUtils.impactClassFor(band)}">${band}</span>
          <span class="pill pill-status">${alert.status || 'UNKNOWN'}</span>
          ${alert.currentDecision ? `<span class="pill pill-decision">Decision: ${alert.currentDecision}</span>` : ''}
        </div>

        <div class="form-group">
          <div class="label">Description</div>
          <div class="value">${alert.description || '(no description)'}</div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <div class="label">Affected Function</div>
            <div class="value">${alert.affectedFunction || '(unspecified)'}</div>
          </div>
          <div class="form-group">
            <div class="label">Detected</div>
            <div class="value">${CommonUtils.formatDate(alert.detectedAt)}</div>
          </div>
        </div>

        ${playbook.length > 0 ? `
          <div class="form-group">
            <div class="label">Suggested Next Steps</div>
            <ul class="playbook-list">
              ${playbook.map(step => `<li>${step}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${history.length > 0 ? `
          <div class="form-group">
            <div class="label">Decision History</div>
            <div class="history-list">
              ${history.map(d => `
                <div class="history-item">
                  <div class="history-main">
                    <span class="badge badge-decision">${d.action}</span>
                    ${d.userName ? `<span>${d.userName}</span>` : ''}
                    ${d.notes ? `<span class="history-notes">– ${d.notes}</span>` : ''}
                  </div>
                  <span class="history-time">${CommonUtils.formatDate(d.createdAt)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  } catch (err) {
    console.error('Error loading alert detail:', err);
    content.innerHTML = '<div class="muted">Error loading alert details</div>';
  }
}

function closeAlertDetailModal() {
  document.getElementById('alertDetailModal').classList.add('hidden');
}

// Incident Report
function setupIncidentHandlers() {
  document.getElementById('btnReportIncident').onclick = () => openIncidentModal();
  document.getElementById('incidentForm').onsubmit = submitIncidentReport;
  
  // Set default reporter info
  document.getElementById('incidentReporterName').value = currentUser.name || '';
  document.getElementById('incidentReporterEmail').value = currentUser.email || '';
  
  // Set default date to now
  const now = new Date();
  const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  document.getElementById('incidentDate').value = localDateTime;
}

function openIncidentModal() {
  document.getElementById('incidentModal').classList.remove('hidden');
}

function closeIncidentModal() {
  document.getElementById('incidentModal').classList.add('hidden');
  document.getElementById('incidentForm').reset();
  
  // Reset defaults
  document.getElementById('incidentReporterName').value = currentUser.name || '';
  document.getElementById('incidentReporterEmail').value = currentUser.email || '';
  const now = new Date();
  const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  document.getElementById('incidentDate').value = localDateTime;
}

async function submitIncidentReport(e) {
  e.preventDefault();

  const formData = {
    dateTime: document.getElementById('incidentDate').value,
    title: document.getElementById('incidentTitle').value,
    description: document.getElementById('incidentDescription').value,
    severity: document.getElementById('incidentSeverity').value,
    affectedSystems: Array.from(document.getElementById('incidentAffectedSystems').selectedOptions).map(opt => opt.value),
    reporterName: document.getElementById('incidentReporterName').value,
    reporterEmail: document.getElementById('incidentReporterEmail').value,
    relatedAlerts: Array.from(document.getElementById('incidentRelatedAlerts').selectedOptions).map(opt => opt.value),
    followUpActions: document.getElementById('incidentFollowUp').value,
    siteId: currentSiteId
  };

  // Handle file attachments (for now just note them, backend to handle actual upload)
  const files = document.getElementById('incidentAttachments').files;
  if (files.length > 0) {
    formData.attachmentCount = files.length;
    formData.attachmentNames = Array.from(files).map(f => f.name);
  }

  try {
    // TODO: Call API endpoint when available
    // await CommonUtils.apiCall('/api/Incidents', {
    //   method: 'POST',
    //   body: JSON.stringify(formData)
    // });

    // For now, just show success message
    CommonUtils.showNotification('Incident report submitted successfully');
    closeIncidentModal();
    
    // Refresh alerts in case a new alert was created
    await refreshAll();
  } catch (err) {
    console.error('Error submitting incident report:', err);
    CommonUtils.showNotification('Error submitting incident report', 'error');
  }
}

// Event Handlers
function setupEventHandlers() {
  setupIncidentHandlers();
  
  document.getElementById('filterStatus').onchange = renderAlerts;
  document.getElementById('filterBand').onchange = renderAlerts;
  document.getElementById('filterDateFrom').onchange = renderAlerts;
  document.getElementById('filterDateTo').onchange = renderAlerts;
}

// Refresh All
async function refreshAll() {
  await Promise.all([
    loadMetrics(),
    loadIncomingAlerts(),
    loadAllAlerts()
  ]);
}

function refreshIncomingAlerts() {
  loadIncomingAlerts();
}

// Make functions globally available
window.showAlertDetail = showAlertDetail;
window.closeAlertDetailModal = closeAlertDetailModal;
window.openIncidentModal = openIncidentModal;
window.closeIncidentModal = closeIncidentModal;
window.refreshIncomingAlerts = refreshIncomingAlerts;

