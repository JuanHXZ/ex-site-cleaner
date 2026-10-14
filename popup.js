function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function renderList(containerId, countId, items) {
  const container = document.getElementById(containerId);
  const countBadge = document.getElementById(countId);
  countBadge.textContent = items.length;

  if (items.length === 0) {
    container.innerHTML = '<div class="empty">Sin datos almacenados</div>';
    return;
  }

  container.innerHTML = items
    .map(
      (item) =>
        `<div class="item"><span class="key">${escapeHtml(item.key)}:</span> <span class="val">${escapeHtml(item.value)}</span></div>`
    )
    .join('');
}

// Función que se inyecta en la pestaña activa para extraer los datos locales
async function collectPageStorageData() {
  const localItems = Object.entries(localStorage).map(([key, value]) => ({
    key,
    value: value.length > 120 ? value.slice(0, 120) + '...' : value
  }));

  const sessionItems = Object.entries(sessionStorage).map(([key, value]) => ({
    key,
    value: value.length > 120 ? value.slice(0, 120) + '...' : value
  }));

  const otherItems = [];

  // 1. IndexedDB
  if (window.indexedDB && typeof indexedDB.databases === 'function') {
    try {
      const dbs = await indexedDB.databases();
      dbs.forEach((db) => {
        if (db.name) {
          otherItems.push({ key: '[IndexedDB]', value: `${db.name} (v${db.version})` });
        }
      });
    } catch (e) {}
  }

  // 2. Cache Storage (Service Workers / PWA)
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      cacheNames.forEach((name) => {
        otherItems.push({ key: '[Cache]', value: name });
      });
    } catch (e) {}
  }

  // 3. Service Workers activos
  if ('serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      regs.forEach((reg) => {
        otherItems.push({ key: '[ServiceWorker]', value: reg.scope });
      });
    } catch (e) {}
  }

  // 4. Uso de disco estimado
  let usage = 0;
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      usage = estimate.usage || 0;
    } catch (e) {}
  }

  return { localItems, sessionItems, otherItems, usage };
}

document.addEventListener('DOMContentLoaded', async () => {
  const domainEl = document.getElementById('domain');
  const quotaEl = document.getElementById('quota');
  const cleanBtn = document.getElementById('clean-btn');
  const statusEl = document.getElementById('status');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.url || /^(edge|chrome|about|extension):/i.test(tab.url)) {
    domainEl.textContent = 'Página del sistema';
    quotaEl.textContent = 'No se pueden inspeccionar páginas internas';
    cleanBtn.disabled = true;
    return;
  }

  const url = new URL(tab.url);
  const origin = url.origin;
  domainEl.textContent = url.hostname;

  async function loadSiteData() {
    try {
      // Obtener cookies (incluye HttpOnly y subdominios asociados)
      const cookies = await chrome.cookies.getAll({ url: tab.url });
      const cookieItems = cookies.map((c) => ({
        key: c.name + (c.httpOnly ? ' (HttpOnly)' : ''),
        value: c.value.length > 100 ? c.value.slice(0, 100) + '...' : c.value
      }));
      renderList('cookies-list', 'cookies-count', cookieItems);

      // Obtener datos del almacenamiento en la página
      const [injectionResult] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: collectPageStorageData
      });

      if (injectionResult && injectionResult.result) {
        const { localItems, sessionItems, otherItems, usage } = injectionResult.result;
        renderList('local-list', 'local-count', localItems);
        renderList('session-list', 'session-count', sessionItems);
        renderList('other-list', 'other-count', otherItems);
        quotaEl.textContent = `Espacio en disco usado por el origen: ${formatBytes(usage)}`;
      }
    } catch (err) {
      quotaEl.textContent = 'No se pudo leer parte del almacenamiento';
    }
  }

  await loadSiteData();

  cleanBtn.addEventListener('click', async () => {
    cleanBtn.disabled = true;
    cleanBtn.textContent = 'Limpiando...';

    try {
      await chrome.browsingData.remove(
        { origins: [origin] },
        {
          cache: true,
          cacheStorage: true,
          cookies: true,
          fileSystems: true,
          indexedDB: true,
          localStorage: true,
          serviceWorkers: true,
          webSQL: true
        }
      );

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          sessionStorage.clear();
          localStorage.clear();
        }
      });

      // Actualizar contadores en la ventana antes de cerrar
      await loadSiteData();

      statusEl.textContent = '¡Datos eliminados correctamente!';
      statusEl.style.color = '#a6e3a1';

      setTimeout(() => {
        chrome.tabs.reload(tab.id);
        window.close();
      }, 600);
    } catch (error) {
      statusEl.textContent = `Error: ${error.message}`;
      statusEl.style.color = '#f38ba8';
      cleanBtn.disabled = false;
      cleanBtn.textContent = 'Limpiar todo y recargar';
    }
  });
});