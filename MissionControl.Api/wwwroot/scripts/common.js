// Common JavaScript Utilities

const baseUrl = window.location.origin;

// API Helper
async function apiCall(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API Error: ${response.status} - ${text}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch (error) {
    console.error('API Call Error:', error);
    throw error;
  }
}

// Get Current User (mock for now - backend endpoint to be added)
async function getCurrentUser() {
  // Try to get from localStorage first
  const stored = localStorage.getItem('currentUser');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      // Invalid JSON, continue to API call
    }
  }

  // Try API endpoint (will fail gracefully if not implemented)
  try {
    const user = await apiCall('/api/Users/current');
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
      return user;
    }
  } catch (error) {
    // Endpoint doesn't exist yet, return mock user
    console.warn('User endpoint not available, using mock user');
  }

  // Fallback: return mock user based on URL param or default
  const urlParams = new URLSearchParams(window.location.search);
  const role = urlParams.get('role') || 'user';
  const siteId = urlParams.get('siteId') || '1';

  const mockUser = {
    userId: 1,
    siteId: parseInt(siteId),
    name: role === 'admin' ? 'Admin User' : 'Regular User',
    email: role === 'admin' ? 'admin@example.com' : 'user@example.com',
    role: role === 'admin' ? 'IT Security Lead' : 'Clinical Engineering'
  };

  localStorage.setItem('currentUser', JSON.stringify(mockUser));
  return mockUser;
}

// Check if user is admin
function isAdmin(role) {
  if (!role) return false;
  const roleUpper = role.toUpperCase();
  return roleUpper.includes('ADMIN') || 
         roleUpper.includes('SECURITY LEAD') || 
         roleUpper.includes('DIRECTOR');
}

// Format Date
function formatDate(date) {
  if (!date) return '(unknown)';
  try {
    return new Date(date).toLocaleString();
  } catch (e) {
    return date;
  }
}

function formatDateShort(date) {
  if (!date) return '(unknown)';
  try {
    return new Date(date).toLocaleDateString();
  } catch (e) {
    return date;
  }
}

// Impact Band Class Helper
function impactClassFor(band) {
  const upper = (band || '').toUpperCase();
  if (upper === 'RED') return 'pill-red';
  if (upper === 'YELLOW') return 'pill-yellow';
  if (upper === 'GREEN') return 'pill-green';
  return 'pill-tlp';
}

function badgeBandClass(band) {
  const upper = (band || '').toUpperCase();
  if (upper === 'RED') return 'badge-band-red';
  if (upper === 'YELLOW') return 'badge-band-yellow';
  if (upper === 'GREEN') return 'badge-band-green';
  return 'badge-band-unknown';
}

// Build Site Query
function buildSiteQuery(siteId) {
  return siteId ? `?siteId=${siteId}` : '';
}

// Playbook for Alert (from original code)
function playbookForAlert(alert) {
  const band = (alert.impactBand || '').toUpperCase();
  const func = (alert.affectedFunction || '').toLowerCase();

  if (band === 'RED' && func.includes('lab')) {
    return [
      'Notify lab supervisor and IT security within 30 minutes.',
      'Apply interim controls (manual review or secondary checks).',
      'Schedule a follow-up decision in 4 hours.'
    ];
  }

  if (band === 'RED') {
    return [
      'Confirm scope and which systems are affected.',
      'Put interim containment in place where possible.',
      'Decide GO/HOLD/ESCALATE within the current shift.'
    ];
  }

  if (band === 'YELLOW') {
    return [
      'Verify asset inventory and confirm this alert truly applies.',
      'Document mitigation or compensating controls.',
      'Re-evaluate within 24 hours if still on HOLD.'
    ];
  }

  if (band === 'GREEN') {
    return [
      'Record the alert and any minor mitigations.',
      'Fold into normal patch / maintenance workflow.'
    ];
  }

  return [
    'Verify whether this alert actually applies to your environment.',
    'Record a GO/HOLD/ESCALATE decision once understood.'
  ];
}

// Show Notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 1rem;
    right: 1rem;
    background: #111827;
    border: 1px solid #00ffff;
    border-radius: 0.5rem;
    padding: 1rem 1.5rem;
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    z-index: 2000;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Export for use in other scripts
window.CommonUtils = {
  apiCall,
  getCurrentUser,
  isAdmin,
  formatDate,
  formatDateShort,
  impactClassFor,
  badgeBandClass,
  buildSiteQuery,
  playbookForAlert,
  showNotification,
  baseUrl
};

