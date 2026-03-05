const DEFAULT_CRM_URL = 'https://ave.avecrm.nl';

async function getStoredSettings() {
  const result = await chrome.storage.local.get(['crmUrl', 'apiToken']);
  return {
    crmUrl: result.crmUrl || '',
    apiToken: result.apiToken || '',
  };
}

async function saveSettings(crmUrl, apiToken) {
  const normalizedUrl = normalizeCrmUrl(crmUrl);
  await chrome.storage.local.set({
    crmUrl: normalizedUrl,
    apiToken: apiToken.trim(),
  });
}

function showStatus(message, type = 'loading') {
  const el = document.getElementById('status');
  el.textContent = message;
  el.className = `status ${type}`;
  el.style.display = 'block';
}

function hideStatus() {
  document.getElementById('status').style.display = 'none';
}

function normalizeCrmUrl(crmUrl) {
  let url = crmUrl.trim().replace(/\/$/, '');
  if (url && !/^https?:\/\//i.test(url)) {
    url = 'http://' + url;
  }
  return url;
}

function getApiBaseUrl(crmUrl) {
  const url = normalizeCrmUrl(crmUrl);
  return `${url}/api/v1`;
}

async function fetchAssignments(crmUrl, apiToken) {
  const baseUrl = getApiBaseUrl(crmUrl);
  const response = await fetch(`${baseUrl}/assignments`, {
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Ongeldige token. Controleer je API token.');
    }
    throw new Error(`API fout: ${response.status}`);
  }

  return response.json();
}

async function extractLinkedInProfile() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.includes('linkedin.com/in/')) {
    throw new Error('Open een LinkedIn-profielpagina (linkedin.com/in/...)');
  }

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractProfileText,
  });

  if (!results?.[0]?.result) {
    throw new Error('Kon profieltekst niet extraheren. Vernieuw de pagina en probeer opnieuw.');
  }

  return {
    profileText: results[0].result.text,
    linkedinUrl: tab.url,
  };
}

function extractProfileText() {
  const parts = [];
  const seen = new Set();

  function addText(selector) {
    try {
      document.querySelectorAll(selector).forEach((el) => {
        const text = el?.innerText?.trim();
        if (text && !seen.has(text) && text.length > 2) {
          seen.add(text);
          parts.push(text);
        }
      });
    } catch (_) {}
  }

  addText('h1.text-heading-xlarge');
  addText('h1.inline.t-24');
  addText('.text-body-medium.break-words');
  addText('.pv-text-details__left-panel h1');
  addText('.pv-about-section .inline-show-more-text');
  addText('.pv-profile-section');
  addText('section.pv-profile-section');
  addText('.pv-entity__summary-info');
  addText('.experience-item');

  if (parts.length < 3) {
    document.querySelectorAll('main h1, main h2, main p, main .inline-show-more-text').forEach((el) => {
      const text = el?.innerText?.trim();
      if (text && text.length > 15 && !seen.has(text)) {
        seen.add(text);
        parts.push(text);
      }
    });
  }

  return { text: parts.join('\n\n') || document.body?.innerText?.slice(0, 15000) || '' };
}

async function importProfile(crmUrl, apiToken, assignmentUid, profileText, linkedinUrl) {
  const baseUrl = getApiBaseUrl(crmUrl);
  const response = await fetch(`${baseUrl}/linkedin-import`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      profile_text: profileText,
      linkedin_url: linkedinUrl || null,
      assignment_uid: assignmentUid,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Fout ${response.status}`);
  }

  return data;
}

async function init() {
  const { crmUrl, apiToken } = await getStoredSettings();

  document.getElementById('crm-url').value = crmUrl || DEFAULT_CRM_URL;
  document.getElementById('api-token').value = apiToken;

  const hasSettings = crmUrl && apiToken;
  document.getElementById('assignments-section').style.display = hasSettings ? 'block' : 'none';
  document.getElementById('setup-section').style.display = hasSettings ? 'none' : 'block';

  if (hasSettings) {
    try {
      const assignments = await fetchAssignments(crmUrl, apiToken);
      const select = document.getElementById('assignment-select');
      select.innerHTML = '<option value="">Kies een opdracht...</option>';
      assignments.forEach((a) => {
        const opt = document.createElement('option');
        opt.value = a.uid;
        opt.textContent = `${a.title} (${a.account?.name || '?'})`;
        select.appendChild(opt);
      });
      document.getElementById('import-btn').disabled = false;
      document.getElementById('status').style.display = 'none';
      document.getElementById('status').textContent = '';
    } catch (err) {
      showStatus(err.message, 'error');
      document.getElementById('setup-section').style.display = 'block';
      document.getElementById('assignments-section').style.display = 'none';
      document.getElementById('import-btn').disabled = true;
    }
  }
}

document.getElementById('save-settings').addEventListener('click', async () => {
  const crmUrl = document.getElementById('crm-url').value?.trim();
  const apiToken = document.getElementById('api-token').value?.trim();
  const btn = document.getElementById('save-settings');

  if (!crmUrl || !apiToken) {
    alert('Vul CRM URL en API token in.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Bezig...';

  try {
    await saveSettings(crmUrl, apiToken);
    document.getElementById('setup-section').style.display = 'none';
    document.getElementById('assignments-section').style.display = 'block';
    document.getElementById('assignment-select').innerHTML = '<option value="">Laden...</option>';
    await init();
  } catch (err) {
    alert('Fout: ' + (err.message || 'Onbekende fout'));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Opslaan';
  }
});

document.getElementById('import-btn').addEventListener('click', async () => {
  const assignmentUid = document.getElementById('assignment-select').value;
  if (!assignmentUid) {
    alert('Kies eerst een opdracht.');
    return;
  }

  const { crmUrl, apiToken } = await getStoredSettings();
  if (!crmUrl || !apiToken) {
    alert('Configureer eerst de instellingen.');
    return;
  }

  const btn = document.getElementById('import-btn');
  btn.disabled = true;
  showStatus('Profiel ophalen...', 'loading');

  try {
    const { profileText, linkedinUrl } = await extractLinkedInProfile();
    showStatus('Importeren via AI...', 'loading');

    await importProfile(crmUrl, apiToken, assignmentUid, profileText, linkedinUrl);
    showStatus('Contact aangemaakt en gekoppeld aan opdracht!', 'success');
  } catch (err) {
    showStatus(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

init();
