// Admin Dashboard JavaScript

let currentUser = null;
let currentSiteId = '';
let patchesCache = [];
let controlsCache = [];
let recentAlertsCache = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await CommonUtils.getCurrentUser();
  document.getElementById('userName').textContent = currentUser.name || 'Admin User';

  setupNavigation();
  await loadSites();
  await refreshAll();
  setupEventHandlers();
});

// Navigation
function setupNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
    });
  });
}

function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(`tab-${tabName}`).classList.add('active');

  // Load data for the tab
  if (tabName === 'patches') {
    loadPatches();
  } else if (tabName === 'controls') {
    loadControls();
  } else if (tabName === 'alerts') {
    loadActiveAlert();
    loadRecentAlerts();
  }
}

// Sites
async function loadSites() {
  try {
    const sites = await CommonUtils.apiCall('/api/Sites');
    const selects = document.querySelectorAll('#siteSelector, #filterPatchSite, #filterControlSite');
    
    selects.forEach(select => {
      // Keep "All Sites" option
      const allOption = select.querySelector('option[value=""]');
      select.innerHTML = '';
      if (allOption) select.appendChild(allOption);
      
      sites.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.siteId;
        opt.textContent = s.name;
        select.appendChild(opt);
      });
    });

    document.getElementById('siteSelector').onchange = (e) => {
      currentSiteId = e.target.value;
      refreshAll();
    };
  } catch (err) {
    console.error('Error loading sites:', err);
  }
}

// Overview Metrics
async function loadOverviewMetrics() {
  try {
    const query = CommonUtils.buildSiteQuery(currentSiteId);
    const metrics = await CommonUtils.apiCall(`/api/Metrics/overview${query}`);

    document.getElementById('mTotalAlerts').textContent = metrics.totalAlerts || 0;
    document.getElementById('mActiveAlerts').textContent = metrics.activeAlerts || 0;
    document.getElementById('mBands').textContent = 
      `${metrics.redAlerts || 0} / ${metrics.yellowAlerts || 0} / ${metrics.greenAlerts || 0}`;
    document.getElementById('mCoverage').textContent = 
      metrics.coveragePercent != null ? `${metrics.coveragePercent.toFixed(1)}%` : '–';

    // Mock patches and controls (backend to be added)
    document.getElementById('mPatchesPending').textContent = patchesCache.filter(p => p.status === 'PENDING').length;
    document.getElementById('mControlsActive').textContent = controlsCache.filter(c => c.status === 'ACTIVE').length;
  } catch (err) {
    console.error('Error loading metrics:', err);
  }
}

// Patches Management
async function loadPatches() {
  try {
    // Mock data for now (backend endpoint to be added)
    if (patchesCache.length === 0) {
      patchesCache = [
        {
          id: 1,
          name: 'Windows Security Update KB123456',
          cve: 'CVE-2024-0001',
          status: 'PENDING',
          affectedSystems: 'All Windows servers',
          date: new Date().toISOString(),
          notes: 'Critical security update'
        },
        {
          id: 2,
          name: 'Linux Kernel Patch 5.15.2',
          cve: 'CVE-2024-0002',
          status: 'APPLIED',
          affectedSystems: 'Production servers',
          date: new Date(Date.now() - 86400000).toISOString(),
          notes: 'Applied successfully'
        }
      ];
    }

    renderPatches();
  } catch (err) {
    console.error('Error loading patches:', err);
    CommonUtils.showNotification('Error loading patches', 'error');
  }
}

function renderPatches() {
  const tbody = document.getElementById('patchesTableBody');
  const siteFilter = document.getElementById('filterPatchSite').value;
  const statusFilter = document.getElementById('filterPatchStatus').value;
  const dateFilter = document.getElementById('filterPatchDate').value;

  let filtered = [...patchesCache];

  if (siteFilter) {
    // Filter by site when backend is ready
  }
  if (statusFilter) {
    filtered = filtered.filter(p => p.status === statusFilter);
  }
  if (dateFilter) {
    const filterDate = new Date(dateFilter);
    filtered = filtered.filter(p => {
      const patchDate = new Date(p.date);
      return patchDate.toDateString() === filterDate.toDateString();
    });
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center muted">No patches found</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(patch => `
    <tr>
      <td>${patch.name}</td>
      <td>${patch.cve || '–'}</td>
      <td><span class="badge ${getPatchStatusClass(patch.status)}">${patch.status}</span></td>
      <td>${patch.affectedSystems || '–'}</td>
      <td>${CommonUtils.formatDateShort(patch.date)}</td>
      <td>
        <button class="btn-secondary btn-sm" onclick="editPatch(${patch.id})">Edit</button>
        <button class="btn-danger btn-sm" onclick="deletePatch(${patch.id})">Delete</button>
      </td>
    </tr>
  `).join('');
}

function getPatchStatusClass(status) {
  if (status === 'APPLIED') return 'badge-band-green';
  if (status === 'FAILED') return 'badge-band-red';
  return 'badge-band-yellow';
}

function setupPatchHandlers() {
  document.getElementById('btnAddPatch').onclick = () => openPatchModal();
  document.getElementById('patchForm').onsubmit = savePatch;
  document.getElementById('filterPatchSite').onchange = renderPatches;
  document.getElementById('filterPatchStatus').onchange = renderPatches;
  document.getElementById('filterPatchDate').onchange = renderPatches;
}

function openPatchModal(patchId = null) {
  const modal = document.getElementById('patchModal');
  const form = document.getElementById('patchForm');
  
  if (patchId) {
    const patch = patchesCache.find(p => p.id === patchId);
    if (patch) {
      document.getElementById('patchModalTitle').textContent = 'Edit Patch';
      document.getElementById('patchId').value = patch.id;
      document.getElementById('patchName').value = patch.name;
      document.getElementById('patchCVE').value = patch.cve || '';
      document.getElementById('patchStatus').value = patch.status;
      document.getElementById('patchAffectedSystems').value = patch.affectedSystems || '';
      document.getElementById('patchNotes').value = patch.notes || '';
    }
  } else {
    document.getElementById('patchModalTitle').textContent = 'Add Patch';
    form.reset();
    document.getElementById('patchId').value = '';
  }
  
  modal.classList.remove('hidden');
}

function closePatchModal() {
  document.getElementById('patchModal').classList.add('hidden');
  document.getElementById('patchForm').reset();
}

async function savePatch(e) {
  e.preventDefault();
  
  const patchId = document.getElementById('patchId').value;
  const patch = {
    name: document.getElementById('patchName').value,
    cve: document.getElementById('patchCVE').value,
    status: document.getElementById('patchStatus').value,
    affectedSystems: document.getElementById('patchAffectedSystems').value,
    notes: document.getElementById('patchNotes').value,
    date: new Date().toISOString()
  };

  try {
    if (patchId) {
      // Update existing
      const index = patchesCache.findIndex(p => p.id == patchId);
      if (index !== -1) {
        patchesCache[index] = { ...patchesCache[index], ...patch, id: parseInt(patchId) };
      }
    } else {
      // Add new
      patch.id = patchesCache.length > 0 ? Math.max(...patchesCache.map(p => p.id)) + 1 : 1;
      patchesCache.push(patch);
    }

    // TODO: Call API endpoint when available
    // await CommonUtils.apiCall('/api/Patches', { method: patchId ? 'PUT' : 'POST', body: JSON.stringify(patch) });

    CommonUtils.showNotification(`Patch ${patchId ? 'updated' : 'created'} successfully`);
    closePatchModal();
    renderPatches();
    loadOverviewMetrics();
  } catch (err) {
    console.error('Error saving patch:', err);
    CommonUtils.showNotification('Error saving patch', 'error');
  }
}

function editPatch(id) {
  openPatchModal(id);
}

function deletePatch(id) {
  if (confirm('Are you sure you want to delete this patch?')) {
    patchesCache = patchesCache.filter(p => p.id !== id);
    renderPatches();
    loadOverviewMetrics();
    CommonUtils.showNotification('Patch deleted');
  }
}

// Controls Management
async function loadControls() {
  try {
    // Mock data for now (backend endpoint to be added)
    if (controlsCache.length === 0) {
      controlsCache = [
        {
          id: 1,
          name: 'Firewall Rule Enforcement',
          type: 'PREVENTIVE',
          status: 'ACTIVE',
          effectiveness: 95,
          description: 'Automated firewall rule enforcement',
          siteId: 1
        },
        {
          id: 2,
          name: 'Intrusion Detection System',
          type: 'DETECTIVE',
          status: 'ACTIVE',
          effectiveness: 88,
          description: 'Real-time threat detection',
          siteId: 1
        }
      ];
    }

    renderControls();
  } catch (err) {
    console.error('Error loading controls:', err);
    CommonUtils.showNotification('Error loading controls', 'error');
  }
}

function renderControls() {
  const tbody = document.getElementById('controlsTableBody');
  const typeFilter = document.getElementById('filterControlType').value;
  const statusFilter = document.getElementById('filterControlStatus').value;
  const siteFilter = document.getElementById('filterControlSite').value;

  let filtered = [...controlsCache];

  if (typeFilter) {
    filtered = filtered.filter(c => c.type === typeFilter);
  }
  if (statusFilter) {
    filtered = filtered.filter(c => c.status === statusFilter);
  }
  if (siteFilter) {
    filtered = filtered.filter(c => c.siteId == siteFilter);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center muted">No controls found</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(control => `
    <tr>
      <td>${control.name}</td>
      <td>${control.type}</td>
      <td><span class="badge ${control.status === 'ACTIVE' ? 'badge-band-green' : 'badge-band-unknown'}">${control.status}</span></td>
      <td>${control.effectiveness}%</td>
      <td>Site ${control.siteId || '–'}</td>
      <td>
        <button class="btn-secondary btn-sm" onclick="editControl(${control.id})">Edit</button>
        <button class="btn-danger btn-sm" onclick="deleteControl(${control.id})">Delete</button>
        <button class="btn-primary btn-sm" onclick="toggleControl(${control.id})">
          ${control.status === 'ACTIVE' ? 'Disable' : 'Enable'}
        </button>
      </td>
    </tr>
  `).join('');
}

function setupControlHandlers() {
  document.getElementById('btnAddControl').onclick = () => openControlModal();
  document.getElementById('controlForm').onsubmit = saveControl;
  document.getElementById('filterControlType').onchange = renderControls;
  document.getElementById('filterControlStatus').onchange = renderControls;
  document.getElementById('filterControlSite').onchange = renderControls;
}

function openControlModal(controlId = null) {
  const modal = document.getElementById('controlModal');
  const form = document.getElementById('controlForm');
  
  if (controlId) {
    const control = controlsCache.find(c => c.id === controlId);
    if (control) {
      document.getElementById('controlModalTitle').textContent = 'Edit Control';
      document.getElementById('controlId').value = control.id;
      document.getElementById('controlName').value = control.name;
      document.getElementById('controlType').value = control.type;
      document.getElementById('controlStatus').value = control.status;
      document.getElementById('controlDescription').value = control.description || '';
      document.getElementById('controlEffectiveness').value = control.effectiveness || 0;
    }
  } else {
    document.getElementById('controlModalTitle').textContent = 'Add Control';
    form.reset();
    document.getElementById('controlId').value = '';
    document.getElementById('controlEffectiveness').value = 0;
  }
  
  modal.classList.remove('hidden');
}

function closeControlModal() {
  document.getElementById('controlModal').classList.add('hidden');
  document.getElementById('controlForm').reset();
}

async function saveControl(e) {
  e.preventDefault();
  
  const controlId = document.getElementById('controlId').value;
  const control = {
    name: document.getElementById('controlName').value,
    type: document.getElementById('controlType').value,
    status: document.getElementById('controlStatus').value,
    description: document.getElementById('controlDescription').value,
    effectiveness: parseInt(document.getElementById('controlEffectiveness').value) || 0,
    siteId: currentSiteId ? parseInt(currentSiteId) : null
  };

  try {
    if (controlId) {
      const index = controlsCache.findIndex(c => c.id == controlId);
      if (index !== -1) {
        controlsCache[index] = { ...controlsCache[index], ...control, id: parseInt(controlId) };
      }
    } else {
      control.id = controlsCache.length > 0 ? Math.max(...controlsCache.map(c => c.id)) + 1 : 1;
      controlsCache.push(control);
    }

    // TODO: Call API endpoint when available
    // await CommonUtils.apiCall('/api/Controls', { method: controlId ? 'PUT' : 'POST', body: JSON.stringify(control) });

    CommonUtils.showNotification(`Control ${controlId ? 'updated' : 'created'} successfully`);
    closeControlModal();
    renderControls();
    loadOverviewMetrics();
  } catch (err) {
    console.error('Error saving control:', err);
    CommonUtils.showNotification('Error saving control', 'error');
  }
}

function editControl(id) {
  openControlModal(id);
}

function deleteControl(id) {
  if (confirm('Are you sure you want to delete this control?')) {
    controlsCache = controlsCache.filter(c => c.id !== id);
    renderControls();
    loadOverviewMetrics();
    CommonUtils.showNotification('Control deleted');
  }
}

function toggleControl(id) {
  const control = controlsCache.find(c => c.id === id);
  if (control) {
    control.status = control.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    renderControls();
    loadOverviewMetrics();
    CommonUtils.showNotification(`Control ${control.status === 'ACTIVE' ? 'enabled' : 'disabled'}`);
  }
}

// Alerts Management (reuse from original)
async function loadActiveAlert() {
  const details = document.getElementById('alertDetails');
  const noAlert = document.getElementById('noAlert');
  const statusText = document.getElementById('actionStatus');

  statusText.textContent = '';

  try {
    const query = CommonUtils.buildSiteQuery(currentSiteId);
    const alert = await CommonUtils.apiCall(`/api/Alerts/active${query}`);

    noAlert.style.display = 'none';
    details.style.display = 'block';

    document.getElementById('tlpPill').textContent = alert.tlp || 'TLP:UNKNOWN';
    const impactPill = document.getElementById('impactPill');
    impactPill.textContent = alert.impactBand || 'IMPACT:UNKNOWN';
    impactPill.className = `pill ${CommonUtils.impactClassFor(alert.impactBand)}`;

    document.getElementById('statusPill').textContent = alert.status || 'STATUS:UNKNOWN';

    const decisionPill = document.getElementById('decisionPill');
    if (alert.currentDecision) {
      decisionPill.style.display = 'inline-flex';
      decisionPill.textContent = `Decision: ${alert.currentDecision}`;
    } else {
      decisionPill.style.display = 'none';
    }

    document.getElementById('alertTitle').textContent = alert.title;
    document.getElementById('alertDescription').textContent = alert.description || '(no description)';
    document.getElementById('alertFunction').textContent = alert.affectedFunction || '(unspecified)';
    document.getElementById('alertDetected').textContent = CommonUtils.formatDate(alert.detectedAt);

    const playbook = CommonUtils.playbookForAlert(alert);
    const pbList = document.getElementById('playbookList');
    pbList.innerHTML = '';
    playbook.forEach(step => {
      const li = document.createElement('li');
      li.textContent = step;
      pbList.appendChild(li);
    });

    const alertId = alert.alertId;
    document.getElementById('btnGo').onclick = () => sendDecision(alertId, 'GO');
    document.getElementById('btnHold').onclick = () => sendDecision(alertId, 'HOLD');
    document.getElementById('btnEscalate').onclick = () => sendDecision(alertId, 'ESCALATE');

    await loadHistory(alertId);
  } catch (err) {
    if (err.message.includes('404')) {
      details.style.display = 'none';
      noAlert.style.display = 'block';
      document.getElementById('historyList').innerHTML = '<div class="muted">No decisions yet.</div>';
      document.getElementById('playbookList').innerHTML = '';
    } else {
      console.error('Error loading active alert:', err);
    }
  }
}

async function loadHistory(alertId) {
  const list = document.getElementById('historyList');
  list.innerHTML = '<div class="muted">Loading…</div>';

  try {
    const items = await CommonUtils.apiCall(`/api/Alerts/${alertId}/decisions`);

    if (!items || items.length === 0) {
      list.innerHTML = '<div class="muted">No decisions yet.</div>';
      return;
    }

    list.innerHTML = '';
    items.forEach(d => {
      const row = document.createElement('div');
      row.className = 'history-item';

      const main = document.createElement('div');
      main.className = 'history-main';

      const actionBadge = document.createElement('span');
      actionBadge.className = 'badge badge-decision';
      actionBadge.textContent = d.action;
      main.appendChild(actionBadge);

      if (d.userName) {
        const who = document.createElement('span');
        who.textContent = d.userName;
        main.appendChild(who);
      }

      if (d.notes) {
        const notes = document.createElement('span');
        notes.className = 'history-notes';
        notes.textContent = `– ${d.notes}`;
        main.appendChild(notes);
      }

      const time = document.createElement('span');
      time.className = 'history-time';
      time.textContent = CommonUtils.formatDate(d.createdAt);

      row.appendChild(main);
      row.appendChild(time);
      list.appendChild(row);
    });
  } catch (err) {
    console.error('Error loading history:', err);
    list.innerHTML = '<div class="muted">Error loading history.</div>';
  }
}

async function sendDecision(alertId, action) {
  const statusText = document.getElementById('actionStatus');
  statusText.textContent = 'Submitting decision…';

  const body = {
    action: action,
    userId: currentUser.userId || 1,
    notes: `Decision taken from admin dashboard: ${action}`
  };

  try {
    await CommonUtils.apiCall(`/api/Alerts/${alertId}/decision`, {
      method: 'POST',
      body: JSON.stringify(body)
    });

    statusText.textContent = `Decision ${action} recorded. Refreshing data…`;
    await refreshAll();
  } catch (err) {
    console.error('Error submitting decision:', err);
    statusText.textContent = 'Error submitting decision.';
  }
}

async function loadRecentAlerts() {
  const listEl = document.getElementById('recentAlertsList') || document.getElementById('recentAlertsListAlerts');
  if (!listEl) return;

  listEl.innerHTML = '<div class="muted">Loading…</div>';

  try {
    const query = CommonUtils.buildSiteQuery(currentSiteId);
    recentAlertsCache = await CommonUtils.apiCall(`/api/Alerts${query}`);
    renderRecentAlerts();
  } catch (err) {
    console.error('Error loading alerts:', err);
    listEl.innerHTML = '<div class="muted">Error loading alerts.</div>';
  }
}

function renderRecentAlerts() {
  const listEl = document.getElementById('recentAlertsList') || document.getElementById('recentAlertsListAlerts');
  if (!listEl) return;

  const bandFilter = document.getElementById('filterBand')?.value || '';
  const statusFilter = document.getElementById('filterStatus')?.value || '';

  if (!recentAlertsCache || recentAlertsCache.length === 0) {
    listEl.innerHTML = '<div class="muted">No alerts yet.</div>';
    return;
  }

  let alerts = [...recentAlertsCache];
  alerts.sort((a, b) => {
    const da = a.detectedAt ? new Date(a.detectedAt).getTime() : 0;
    const db = b.detectedAt ? new Date(b.detectedAt).getTime() : 0;
    return db - da;
  });

  if (bandFilter) {
    alerts = alerts.filter(a => (a.impactBand || '').toUpperCase() === bandFilter);
  }
  if (statusFilter) {
    alerts = alerts.filter(a => (a.status || '').toUpperCase() === statusFilter);
  }

  alerts = alerts.slice(0, 10);

  if (alerts.length === 0) {
    listEl.innerHTML = '<div class="muted">No alerts match filters.</div>';
    return;
  }

  listEl.innerHTML = '';
  alerts.forEach(a => {
    const item = document.createElement('div');
    item.className = 'recent-item';

    const band = a.impactBand || 'UNKNOWN';
    const bandClass = CommonUtils.badgeBandClass(band);
    const status = a.status || 'UNKNOWN';
    const decision = a.currentDecision;
    const timeText = CommonUtils.formatDate(a.detectedAt);

    item.innerHTML = `
      <div class="recent-title-row">
        <span class="recent-title" title="${a.title}">${a.title}</span>
      </div>
      <div class="recent-meta">
        <span class="badge ${bandClass}">${band}</span>
        <span class="badge badge-status">${status}</span>
        ${decision ? `<span class="badge badge-decision">${decision}</span>` : ''}
        <span class="recent-time">${timeText}</span>
      </div>
    `;
    listEl.appendChild(item);
  });
}

// Event Handlers
function setupEventHandlers() {
  setupPatchHandlers();
  setupControlHandlers();
  
  const bandFilter = document.getElementById('filterBand');
  const statusFilter = document.getElementById('filterStatus');
  if (bandFilter) bandFilter.onchange = renderRecentAlerts;
  if (statusFilter) statusFilter.onchange = renderRecentAlerts;
}

// Refresh All
async function refreshAll() {
  await Promise.all([
    loadOverviewMetrics(),
    loadRecentAlerts()
  ]);
  
  const activeTab = document.querySelector('.nav-tab.active');
  if (activeTab) {
    const tabName = activeTab.dataset.tab;
    if (tabName === 'alerts') {
      await loadActiveAlert();
    }
  }
}

// Make functions globally available
window.editPatch = editPatch;
window.deletePatch = deletePatch;
window.openPatchModal = openPatchModal;
window.closePatchModal = closePatchModal;
window.editControl = editControl;
window.deleteControl = deleteControl;
window.toggleControl = toggleControl;
window.openControlModal = openControlModal;
window.closeControlModal = closeControlModal;

