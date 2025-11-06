// ABOUTME: Renderer process script for preferences window
// ABOUTME: Handles UI interactions and IPC communication with main process
const { ipcRenderer } = require('electron');

let currentSettings = {};

// Tab switching - Updated for DaisyUI tabs
document.querySelectorAll('[role="tab"]').forEach(button => {
  button.addEventListener('click', () => {
    const tabName = button.getAttribute('data-tab');
    if (!tabName) return;

    // Update active tab button (DaisyUI uses 'tab-active' class)
    document.querySelectorAll('[role="tab"]').forEach(b => b.classList.remove('tab-active'));
    button.classList.add('tab-active');

    // Update active tab content (show/hide with 'hidden' class)
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    const tabContent = document.getElementById(tabName);
    if (tabContent) {
      tabContent.classList.remove('hidden');
    }
  });
});

// Load settings on startup
async function loadSettings() {
  currentSettings = await ipcRenderer.invoke('get-settings');
  populateForm();
  checkNotificationPermission();
  checkHooksStatus();
  await loadAvailableSounds();
}

function populateForm() {
  // General tab
  document.getElementById('autoStart').checked = currentSettings.autoStart || false;
  document.getElementById('skipHooksPrompt').checked = currentSettings.skipHooksPrompt || false;
  document.getElementById('statsRefreshInterval').value = currentSettings.statsRefreshInterval || 30;

  // Notifications tab
  document.getElementById('notificationsEnabled').checked = currentSettings.notificationsEnabled;
  document.getElementById('soundEnabled').checked = currentSettings.soundEnabled;

  const titleFormatSelect = document.getElementById('notificationTitleFormat');
  if (titleFormatSelect && currentSettings.notificationTitleFormat) {
    titleFormatSelect.value = currentSettings.notificationTitleFormat;
  }

  // Notification body content
  const notificationBody = currentSettings.notificationBody || {};
  document.getElementById('showSessionId').checked = notificationBody.showSessionId !== false;
  document.getElementById('showTotalTokens').checked = notificationBody.showTotalTokens !== false;
  document.getElementById('showTokenBreakdown').checked = notificationBody.showTokenBreakdown || false;
  document.getElementById('showCacheStats').checked = notificationBody.showCacheStats || false;
  document.getElementById('showCost').checked = notificationBody.showCost !== false;
  document.getElementById('showTimestamp').checked = notificationBody.showTimestamp !== false;
  document.getElementById('showStopReason').checked = notificationBody.showStopReason || false;
  document.getElementById('showResponsePreview').checked = notificationBody.showResponsePreview || false;
  document.getElementById('previewLength').value = notificationBody.previewLength || 100;

  // Menu tab
  document.getElementById('compactMode').checked = currentSettings.menuVisibility?.compactMode || false;
  document.getElementById('showMessages').checked = currentSettings.menuVisibility?.showMessages !== false;
  document.getElementById('showTokens').checked = currentSettings.menuVisibility?.showTokens !== false;
  document.getElementById('showCosts').checked = currentSettings.menuVisibility?.showCosts !== false;
  document.getElementById('showBurnRate').checked = currentSettings.menuVisibility?.showBurnRate !== false;
  document.getElementById('showSessions').checked = currentSettings.menuVisibility?.showSessions !== false;
  document.getElementById('showModelBreakdown').checked = currentSettings.menuVisibility?.showModelBreakdown !== false;

  updateVisibilitySection();
}

async function loadAvailableSounds() {
  const sounds = await ipcRenderer.invoke('get-available-sounds');
  const soundSelect = document.getElementById('soundFile');
  soundSelect.innerHTML = '';

  sounds.forEach(sound => {
    const option = document.createElement('option');
    option.value = sound.value;
    option.textContent = sound.label;
    if (sound.value === currentSettings.soundFile) {
      option.selected = true;
    }
    soundSelect.appendChild(option);
  });
}

async function checkNotificationPermission() {
  const isSupported = await ipcRenderer.invoke('check-notification-permission');
  const statusEl = document.getElementById('permissionStatus');
  if (statusEl) {
    statusEl.textContent = isSupported ? 'Granted' : 'Not Available';
    statusEl.style.color = isSupported ? '#34C759' : '#FF3B30';
  }
}

async function checkHooksStatus() {
  const isInstalled = await ipcRenderer.invoke('check-hooks-installed');
  const statusEl = document.getElementById('hooksStatus');
  const statusText = document.getElementById('hooksStatusText');

  if (statusEl && statusText) {
    if (isInstalled) {
      statusEl.className = 'alert alert-success';
      statusText.textContent = 'Hooks are installed and active';
    } else {
      statusEl.className = 'alert alert-warning';
      statusText.textContent = 'Hooks are not installed - notifications will not work';
    }
  }
}

function updateVisibilitySection() {
  const compactMode = document.getElementById('compactMode').checked;
  const visibilitySection = document.getElementById('visibilitySection');
  if (visibilitySection) {
    if (compactMode) {
      visibilitySection.classList.add('disabled');
    } else {
      visibilitySection.classList.remove('disabled');
    }
  }
}

// Save settings when changed
async function saveSettings(updates) {
  currentSettings = { ...currentSettings, ...updates };
  await ipcRenderer.invoke('update-settings', updates);
}

// Event listeners for General tab
document.getElementById('autoStart')?.addEventListener('change', (e) => {
  saveSettings({ autoStart: e.target.checked });
});

document.getElementById('skipHooksPrompt')?.addEventListener('change', (e) => {
  saveSettings({ skipHooksPrompt: e.target.checked });
});

document.getElementById('statsRefreshInterval')?.addEventListener('change', (e) => {
  saveSettings({ statsRefreshInterval: parseInt(e.target.value) });
});

// Event listeners for Notifications tab
document.getElementById('notificationsEnabled')?.addEventListener('change', (e) => {
  saveSettings({ notificationsEnabled: e.target.checked });
});

document.getElementById('soundEnabled')?.addEventListener('change', (e) => {
  saveSettings({ soundEnabled: e.target.checked });
});

document.getElementById('soundFile')?.addEventListener('change', (e) => {
  saveSettings({ soundFile: e.target.value });
});

document.getElementById('notificationTitleFormat')?.addEventListener('change', (e) => {
  saveSettings({ notificationTitleFormat: e.target.value });
});

document.getElementById('testSound')?.addEventListener('click', async () => {
  const soundFile = document.getElementById('soundFile').value;
  await ipcRenderer.invoke('test-sound', soundFile);
});

document.getElementById('testNotification')?.addEventListener('click', async () => {
  await ipcRenderer.invoke('test-notification');
});

// Event listeners for notification body content
document.getElementById('showSessionId')?.addEventListener('change', (e) => {
  saveSettings({
    notificationBody: {
      ...currentSettings.notificationBody,
      showSessionId: e.target.checked
    }
  });
});

document.getElementById('showTotalTokens')?.addEventListener('change', (e) => {
  saveSettings({
    notificationBody: {
      ...currentSettings.notificationBody,
      showTotalTokens: e.target.checked
    }
  });
});

document.getElementById('showTokenBreakdown')?.addEventListener('change', (e) => {
  saveSettings({
    notificationBody: {
      ...currentSettings.notificationBody,
      showTokenBreakdown: e.target.checked
    }
  });
});

document.getElementById('showCacheStats')?.addEventListener('change', (e) => {
  saveSettings({
    notificationBody: {
      ...currentSettings.notificationBody,
      showCacheStats: e.target.checked
    }
  });
});

document.getElementById('showCost')?.addEventListener('change', (e) => {
  saveSettings({
    notificationBody: {
      ...currentSettings.notificationBody,
      showCost: e.target.checked
    }
  });
});

document.getElementById('showTimestamp')?.addEventListener('change', (e) => {
  saveSettings({
    notificationBody: {
      ...currentSettings.notificationBody,
      showTimestamp: e.target.checked
    }
  });
});

document.getElementById('showStopReason')?.addEventListener('change', (e) => {
  saveSettings({
    notificationBody: {
      ...currentSettings.notificationBody,
      showStopReason: e.target.checked
    }
  });
});

document.getElementById('showResponsePreview')?.addEventListener('change', (e) => {
  saveSettings({
    notificationBody: {
      ...currentSettings.notificationBody,
      showResponsePreview: e.target.checked
    }
  });
});

document.getElementById('previewLength')?.addEventListener('change', (e) => {
  saveSettings({
    notificationBody: {
      ...currentSettings.notificationBody,
      previewLength: parseInt(e.target.value)
    }
  });
});

// Event listeners for Menu tab
document.getElementById('compactMode')?.addEventListener('change', (e) => {
  saveSettings({
    menuVisibility: {
      ...currentSettings.menuVisibility,
      compactMode: e.target.checked
    }
  });
  updateVisibilitySection();
});

document.getElementById('showMessages')?.addEventListener('change', (e) => {
  saveSettings({
    menuVisibility: {
      ...currentSettings.menuVisibility,
      showMessages: e.target.checked
    }
  });
});

document.getElementById('showTokens')?.addEventListener('change', (e) => {
  saveSettings({
    menuVisibility: {
      ...currentSettings.menuVisibility,
      showTokens: e.target.checked
    }
  });
});

document.getElementById('showCosts')?.addEventListener('change', (e) => {
  saveSettings({
    menuVisibility: {
      ...currentSettings.menuVisibility,
      showCosts: e.target.checked
    }
  });
});

document.getElementById('showBurnRate')?.addEventListener('change', (e) => {
  saveSettings({
    menuVisibility: {
      ...currentSettings.menuVisibility,
      showBurnRate: e.target.checked
    }
  });
});

document.getElementById('showSessions')?.addEventListener('change', (e) => {
  saveSettings({
    menuVisibility: {
      ...currentSettings.menuVisibility,
      showSessions: e.target.checked
    }
  });
});

document.getElementById('showModelBreakdown')?.addEventListener('change', (e) => {
  saveSettings({
    menuVisibility: {
      ...currentSettings.menuVisibility,
      showModelBreakdown: e.target.checked
    }
  });
});

// Event listeners for Advanced tab - Hooks Management
document.getElementById('installHooks')?.addEventListener('click', async () => {
  const button = document.getElementById('installHooks');
  button.disabled = true;
  button.textContent = 'Installing...';

  try {
    const result = await ipcRenderer.invoke('install-hooks');
    if (result.success) {
      alert('Success: ' + result.message);
      await checkHooksStatus();
    } else {
      alert('Error: ' + result.message);
    }
  } catch (error) {
    alert('Error installing hooks: ' + error.message);
  } finally {
    button.disabled = false;
    button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Install/Reinstall Hooks';
  }
});

document.getElementById('openHooksConfig')?.addEventListener('click', async () => {
  await ipcRenderer.invoke('open-hooks-config');
});

document.getElementById('restoreHooksBackup')?.addEventListener('click', async () => {
  if (confirm('Are you sure you want to restore the hooks backup? This will overwrite your current hooks configuration.')) {
    const result = await ipcRenderer.invoke('restore-hooks-backup');
    if (result.success) {
      alert('Success: ' + result.message);
      await checkHooksStatus();
    } else {
      alert('Error: ' + result.message);
    }
  }
});

// Event listeners for Advanced tab - Data Management
document.getElementById('openSettingsFile')?.addEventListener('click', async () => {
  await ipcRenderer.invoke('open-settings-file');
});

document.getElementById('resetSettings')?.addEventListener('click', async () => {
  if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
    currentSettings = await ipcRenderer.invoke('reset-settings');
    populateForm();
  }
});

// Load settings when page loads
loadSettings();
