(() => {
  'use strict';
  const notice = document.getElementById('notice');
  const owner = localStorage.getItem('redaction-offline-owner');
  const dbName = 'redaction-rh-offline-v1';
  const draftKey = `${owner}:redaction-draft-new`;
  const voiceKey = 'redaction-rh-voice-enabled-v1';
  const voiceToggle = document.getElementById('voice-toggle');
  voiceToggle.checked = localStorage.getItem(voiceKey) === 'on';
  voiceToggle.onchange = () => { try { localStorage.setItem(voiceKey, voiceToggle.checked ? 'on' : 'off'); } catch { voiceToggle.checked = false; } };
  let playing = null;
  function speak(kind) {
    if (!voiceToggle.checked || !['in', 'out', 'prestation'].includes(kind)) return;
    const name = kind === 'in' ? 'arrival' : kind === 'out' ? 'departure' : 'submission';
    try {
      playing?.pause();
      playing = new Audio(new URL(`rh-voice/${name}-offline.mp3`, location.href));
      playing.play().catch(() => {});
    } catch { /* L'enregistrement local ne dépend pas de l'audio. */ }
  }
  const show = (text) => { notice.textContent = text; };
  const day = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kinshasa', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const open = () => new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('operations', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  async function records() {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('operations');
      const req = tx.objectStore('operations').getAll();
      req.onsuccess = () => resolve(req.result.filter((entry) => entry.owner === owner).sort((a, b) => a.recordedAt.localeCompare(b.recordedAt)));
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  }
  async function save(entry) {
    const db = await open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('operations', 'readwrite');
      tx.objectStore('operations').put({ ...entry, id: crypto.randomUUID(), owner, recordedAt: new Date().toISOString() });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
    await render();
    show('Enregistré sur cet appareil. Envoi après reconnexion avec le même compte.');
    speak(entry.kind);
  }
  async function render() {
    const list = document.getElementById('pending');
    list.replaceChildren();
    const items = await records();
    for (const entry of items) {
      const li = document.createElement('li');
      li.textContent = `${entry.kind === 'prestation' ? 'Prestation ' + entry.date : entry.kind === 'absence' ? 'Absence ' + entry.startDate + ' – ' + entry.endDate : entry.kind === 'in' ? 'Arrivée' : 'Sortie'} · ${new Date(entry.recordedAt).toLocaleString('fr-FR')} · en attente`;
      list.append(li);
    }
    if (!items.length) { const li = document.createElement('li'); li.textContent = 'Aucune opération RH en attente.'; list.append(li); }
    const today = day();
    const input = document.querySelector('input[name="date"]');
    input.max = today;
    if (!input.value) input.value = today;
    let signed = {};
    try { signed = JSON.parse(localStorage.getItem(`redaction-presence-${owner}-${today}`) || '{}'); } catch {}
    const queuedIn = items.some((entry) => entry.kind === 'in' && new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kinshasa' }).format(new Date(entry.recordedAt)) === today);
    document.getElementById('in').disabled = signed.in || queuedIn;
    document.getElementById('out').disabled = (!signed.in && !queuedIn) || signed.out || items.some((entry) => entry.kind === 'out' && new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kinshasa' }).format(new Date(entry.recordedAt)) === today);
  }
  if (!owner) { show('Ouvrez et connectez-vous à votre compte Rédaction une première fois avec Internet avant d’utiliser le mode hors ligne.'); }
  else {
    document.getElementById('actions').hidden = false;
    render().then(() => show('Mode hors ligne prêt.')).catch(() => show('Stockage local indisponible : ne saisissez pas d’opération.'));
    for (const action of ['in', 'out']) document.getElementById(action).onclick = () => save({ kind: action }).catch(() => show('Enregistrement impossible : stockage local indisponible.'));
    document.getElementById('prestation').onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const date = form.elements.date.value;
      const description = form.elements.description.value.trim();
      if (!date || date > day() || !description || description.length > 500) { show('Vérifiez la date et la description.'); return; }
      save({ kind: 'prestation', date, description }).then(() => { form.elements.description.value = ''; }).catch(() => show('Enregistrement impossible : stockage local indisponible.'));
    };
    document.getElementById('absence').onsubmit = (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const startDate = form.elements.startDate.value;
      const endDate = form.elements.endDate.value;
      const category = form.elements.category.value.trim();
      const days = (Date.parse(endDate + 'T00:00:00Z') - Date.parse(startDate + 'T00:00:00Z')) / 86400000;
      if (!startDate || !endDate || days < 0 || days > 365 || !category || category.length > 100) { show('Vérifiez le type et les dates.'); return; }
      save({ kind: 'absence', startDate, endDate, category }).then(() => form.reset()).catch(() => show('Enregistrement impossible : stockage local indisponible.'));
    };
    const draft = localStorage.getItem(draftKey);
    if (draft) { try { const values = JSON.parse(draft).values; document.getElementById('title').value = values.title || ''; document.getElementById('content').value = values.content || ''; } catch {} }
    document.getElementById('draft').onclick = () => {
      try {
        const current = JSON.parse(localStorage.getItem(draftKey) || '{}');
        localStorage.setItem(draftKey, JSON.stringify({ savedAt: Date.now(), scheduledAt: '', values: { ...current.values, title: document.getElementById('title').value, content: document.getElementById('content').value, categoryDocumentIds: current.values?.categoryDocumentIds || [], tagNames: current.values?.tagNames || [], isBreaking: false } }));
        show('Texte conservé sur cet appareil. Reprenez-le dans « Nouvel article » après reconnexion.');
      } catch { show('Stockage indisponible : texte non enregistré.'); }
    };
  }
  document.getElementById('retry').onclick = () => location.assign(new URL('./', location.href).href);
  window.addEventListener('online', () => {
    show('Connexion détectée. Vérification du serveur…');
    const home = new URL('./', location.href);
    const destination = localStorage.getItem(draftKey) ? new URL('nouveau', home) : home;
    fetch(home.href, { cache: 'no-store' }).then((response) => {
      if (response.ok) location.assign(destination.href);
      else show('Le serveur ne répond pas encore. Réessayez dans quelques instants.');
    }).catch(() => show('Le serveur ne répond pas encore. Réessayez dans quelques instants.'));
  });
})();
