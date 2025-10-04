(function loadYT() {
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
})();

let playerA;
let isSyncing = false; // evita loops de eventos
let playerReady = false;
let pendingSync = null;
let currentQueueItemId = null;
let isHandlingQueueEnd = false;

const queueListEl = document.getElementById('queueList');
const queueStatusEl = document.getElementById('queueStatus');
const requestedByInput = document.getElementById('requestedByInput');
const manualTitleInput = document.getElementById('vid1Title');
const videoIdInput = document.getElementById('vid1');

async function fetchQueue() {
  if (!queueListEl || !queueStatusEl) {
    return;
  }
  try {
    queueStatusEl.textContent = 'Cargando la cola...';
    const response = await fetch('/api/music/queue');
    if (!response.ok) {
      throw new Error(`Estado ${response.status}`);
    }
    const items = await response.json();
    renderQueue(items);
  } catch (error) {
    console.error('Error al obtener la cola', error);
    queueStatusEl.textContent = 'No se pudo cargar la cola.';
    if (queueListEl) {
      queueListEl.innerHTML = '';
    }
  }
}

function renderQueue(items) {
  if (!queueListEl || !queueStatusEl) {
    return;
  }
  queueListEl.innerHTML = '';
  if (!Array.isArray(items) || items.length === 0) {
    queueStatusEl.textContent = 'No hay canciones en cola.';
    return;
  }
  queueStatusEl.textContent = `Canciones en cola: ${items.length}`;
  items.forEach(item => {
    const li = document.createElement('li');
    li.className = 'queue-item';

    const thumb = document.createElement('img');
    thumb.className = 'queue-thumb';
    thumb.alt = '';
    thumb.loading = 'lazy';
    thumb.src = item.thumbnailUrl || (item.videoId ? `https://img.youtube.com/vi/${item.videoId}/default.jpg` : '');

    const body = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'queue-title';
    title.textContent = item.title;
    body.appendChild(title);

    if (item.requestedBy) {
      const meta = document.createElement('div');
      meta.className = 'queue-meta';
      meta.textContent = `Solicitada por ${item.requestedBy}`;
      body.appendChild(meta);
    }

    if (item.enqueuedAt) {
      const metaTime = document.createElement('div');
      metaTime.className = 'queue-meta';
      const parsed = new Date(item.enqueuedAt);
      if (!isNaN(parsed)) {
        metaTime.textContent = parsed.toLocaleString();
        body.appendChild(metaTime);
      }
    }

    li.appendChild(thumb);
    li.appendChild(body);

    queueListEl.appendChild(li);
  });
}

async function enqueueSong(details) {
  if (!details || !details.videoId || !details.title) {
    throw new Error('Faltan datos obligatorios para la canciï¿½n.');
  }
  const payload = {
    videoId: details.videoId,
    title: details.title,
    channelTitle: details.channelTitle ?? null,
    thumbnailUrl: details.thumbnailUrl ?? null,
    requestedBy: (requestedByInput?.value || '').trim() || null
  };

  const response = await fetch('/api/music/queue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'No se pudo guardar la canciï¿½n.');
  }

  const item = await response.json();
  await fetchQueue();
  return item;
}

async function playOldestSongFromQueue() {
  try {
    const response = await fetch('/api/music/queue');
    if (!response.ok) {
      throw new Error(`Estado ${response.status}`);
    }
    const items = await response.json();
    if (!Array.isArray(items) || items.length === 0) {
      return false;
    }
    const nextItem = items[0];
    if (!nextItem.videoId) {
      return false;
    }
    currentQueueItemId = nextItem.id || null;
    const startTimestamp = Date.now() + 1000;
    await connection.invoke('LoadVideos', nextItem.videoId, startTimestamp, currentQueueItemId);
    return true;
  } catch (error) {
    console.error('No se pudo iniciar la reproducción desde la cola', error);
    return false;
  }
}

async function removeQueueItemFromQueue(queueItemId) {
  if (!queueItemId) {
    return;
  }
  const response = await fetch(`/api/music/queue/${queueItemId}`, { method: 'DELETE' });
  if (!response.ok && response.status !== 404) {
    const message = await response.text();
    throw new Error(message || `Estado ${response.status}`);
  }
}

async function handleQueueSongEnded() {
  if (isHandlingQueueEnd) {
    return;
  }
  isHandlingQueueEnd = true;
  try {
    const finishedId = currentQueueItemId;
    currentQueueItemId = null;
    if (finishedId) {
      try {
        await removeQueueItemFromQueue(finishedId);
      } catch (error) {
        console.error('No se pudo eliminar la canción finalizada de la cola', error);
      } finally {
        fetchQueue();
      }
    } else {
      fetchQueue();
    }
    const hasNext = await playOldestSongFromQueue();
    if (!hasNext) {
      connection.invoke('Pause');
    }
  } finally {
    isHandlingQueueEnd = false;
  }
}

// --- SignalR ---
const connection = new signalR.HubConnectionBuilder()
  .withUrl("/radioHub")
  .withAutomaticReconnect()
  .build();

connection.start().catch(err => console.error(err.toString()));
fetchQueue();

// Recibe eventos del hub
connection.on("SyncState", (id1, startTimestamp, percent, isPlaying, queueItemId) => {
  currentQueueItemId = queueItemId || null;
  // Sincroniza el estado global al conectar
  isSyncing = true;
  playerReady = false;
  playerA.loadVideoById({videoId: id1, startSeconds: 0});
  document.getElementById('vid1').value = id1;
  // Espera a que el video estÃ© listo y lo posiciona
  const syncToState = () => {
    if (!playerA || typeof playerA.seekTo !== 'function') {
      setTimeout(syncToState, 200);
      return;
    }
    setPercent(percent).then(() => {
      if (isPlaying) {
        playerA.playVideo();
      } else {
        playerA.pauseVideo();
      }
      isSyncing = false;
    });
  };
  setTimeout(syncToState, 500);
});
connection.on("Play", () => {
  isSyncing = true;
  playerA && playerA.playVideo();
  setTimeout(() => { isSyncing = false; }, 300);
});
connection.on("Pause", () => {
  isSyncing = true;
  playerA && playerA.pauseVideo();
  setTimeout(() => { isSyncing = false; }, 300);
});
connection.on("SeekPercent", (percent) => {
  isSyncing = true;
  isRemoteSeek = true;
  setPercent(percent);
  setTimeout(() => { isSyncing = false; isRemoteSeek = false; }, 300);
});
connection.on("LoadVideos", (id1, startTimestamp, queueItemId) => {
  isSyncing = true;
  currentQueueItemId = queueItemId || null;
  playerReady = false;
  playerA.loadVideoById({videoId: id1, startSeconds: 0});
  document.getElementById('vid1').value = id1;
  // Guarda la sincronizaciÃ³n pendiente
  pendingSync = { id1, startTimestamp };
  tryStartSync();
});

function tryStartSync() {
  if (!pendingSync) return;
  if (!playerA || typeof playerA.playVideo !== 'function') {
    setTimeout(tryStartSync, 200);
    return;
  }
  // Espera a la hora exacta para iniciar el video
  const now = Date.now();
  const waitMs = Math.max(0, pendingSync.startTimestamp - now);
  setTimeout(() => {
    playerA.seekTo(0, true);
    playerA.playVideo();
    isSyncing = false;
    pendingSync = null;
  }, waitMs);
}

// Se llama automÃ¡ticamente cuando la API estÃ¡ lista
window.onYouTubeIframeAPIReady = function () {
  playerA = new YT.Player('player1', {
    height: '360',
    width: '640',
    videoId: '', // se establece al cargar
    // hide native controls so UI controls are the single source of actions
    playerVars: { rel: 0, playsinline: 1, controls: 0 },
    events: {
      'onReady': () => {
        playerReady = true;
        tryStartSync(); // Intenta iniciar la sincronizaciÃ³n si hay una pendiente
      },
      'onStateChange': onStateChangeA
    }
  });
};

// --- SincronizaciÃ³n bÃ¡sica local + global ---
function onStateChangeA(e) {
  if (isSyncing) return;
  handleGlobalSync(e, playerA);
}

// EnvÃ­a eventos al hub si la acciÃ³n fue local
function handleGlobalSync(e, player) {
  if (isSyncing) return;
  if (e.data === YT.PlayerState.PLAYING) {
    connection.invoke("Play");
  } else if (e.data === YT.PlayerState.PAUSED) {
    connection.invoke("Pause");
  } else if (e.data === YT.PlayerState.BUFFERING) {
    // Detecta seek manual
    const percent = Math.round((safeGetCurrentTime(player) / safeGetDuration(player)) * 100);
    if (percent > 0 && percent <= 100) {
      connection.invoke("SeekPercent", percent);
    }
  } else if (e.data === YT.PlayerState.ENDED) {
    handleQueueSongEnded().catch(error => console.error('Error al manejar el final de la canción', error));
  }
}

function safeGetCurrentTime(p) {
  try { return typeof p.getCurrentTime === 'function' ? p.getCurrentTime() : 0; }
  catch { return 0; }
}
function safeGetDuration(p) {
  try { return typeof p.getDuration === 'function' ? p.getDuration() : 0; }
  catch { return 0; }
}

// --- Cargar video por ID (desde input) ---
function renderSearchResults(results) {
  const container = document.getElementById('searchResults');
  container.innerHTML = '';
  if (!results.length) {
    container.innerHTML = '<div>No se encontraron videos.</div>';
    return;
  }
  results.forEach(video => {
    const div = document.createElement('div');
    div.className = 'video-result';
    div.innerHTML = `<img class="video-thumb" src="${video.thumbnail}" alt="thumb"><span class="video-title">${video.title}</span>`;
    div.addEventListener('click', () => {
      selectVideo(video);
    });
    container.appendChild(div);
  });
}

async function selectVideo(video) {
  if (!video || !video.id) {
    return;
  }
  if (videoIdInput) {
    videoIdInput.value = video.id;
  }
  if (manualTitleInput) {
    manualTitleInput.value = video.title || '';
  }

  try {
    await enqueueSong({
      videoId: video.id,
      title: video.title || video.id,
      channelTitle: video.channelTitle ?? null,
      thumbnailUrl: video.thumbnail ?? null
    });
  } catch (error) {
    console.error('No se pudo guardar la canciï¿½n en la cola', error);
    alert('Ocurriï¿½ un error al guardar la canciï¿½n en la cola.');
    return;
  }
}

// --- Controles play/pause globales: ahora solo notifican al hub ---
// --- MÃ©todo pÃºblico: ir al porcentaje (1-100) ---
async function setPercent(p) {
  // clamp
  p = Math.max(1, Math.min(100, Number(p) || 0));
  await ensureMetadata(playerA);

  const durA = safeGetDuration(playerA);
  if (!durA) return;

  const tA = (p / 100) * durA;

  isSyncing = true;
  try {
    playerA.seekTo(tA, true);
  } finally {
    setTimeout(() => { isSyncing = false; }, 0);
  }
}
window.setPercent = setPercent;

// botÃ³n de UI para porcentaje
document.getElementById('seekPercentBtn').addEventListener('click', () => {
  const val = document.getElementById('percent').value;
  setPercent(val);
  connection.invoke("SeekPercent", val);
});

// Espera a que getDuration() sea confiable
function ensureMetadata(player) {
  return new Promise(resolve => {
    let tries = 0;
    const maxTries = 50; // ~5s
    const timer = setInterval(() => {
      const d = safeGetDuration(player);
      if (d && Number.isFinite(d) && d > 0) {
        clearInterval(timer);
        resolve();
      } else if (++tries >= maxTries) {
        clearInterval(timer);
        resolve(); // seguimos aunque no haya duraciÃ³n
      }
    }, 100);
  });
}

// --- Barra inferior: pausa, seek y rediseÃ±o ---
let isBarDragging = false;
let isRemoteSeek = false;

function formatTime(sec) {
  sec = Math.floor(sec);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
function updateBarProgress() {
  if (!playerA) return;
  if (!isBarDragging && !isRemoteSeek) {
    const current = safeGetCurrentTime(playerA);
    const duration = safeGetDuration(playerA);
    document.getElementById('barCurrentTime').textContent = formatTime(current);
    document.getElementById('barDuration').textContent = formatTime(duration);
    document.getElementById('barProgress').max = duration || 1;
    document.getElementById('barProgress').value = current;
  }
}
setInterval(updateBarProgress, 500);
const barProgress = document.getElementById('barProgress');
barProgress.addEventListener('mousedown', () => { isBarDragging = true; });
barProgress.addEventListener('touchstart', () => { isBarDragging = true; });
barProgress.addEventListener('mouseup', (e) => {
  isBarDragging = false;
  isRemoteSeek = false;
  const val = Number(e.target.value);
  if (!isNaN(val)) {
    // only notify server â€” do not perform local seek here
    const percent = Math.round((val / (safeGetDuration(playerA) || 1)) * 100);
    connection.invoke("SeekPercent", percent);
  }
});
barProgress.addEventListener('touchend', (e) => {
  isBarDragging = false;
  isRemoteSeek = false;
  const val = Number(e.target.value);
  if (!isNaN(val)) {
    const percent = Math.round((val / (safeGetDuration(playerA) || 1)) * 100);
    connection.invoke("SeekPercent", percent);
  }
});
barProgress.addEventListener('input', (e) => {
  if (isBarDragging) {
    const val = Number(e.target.value);
    document.getElementById('barCurrentTime').textContent = formatTime(val);
  }
});

window.radioApp = {
  connection,
  enqueueSong,
  renderSearchResults,
  selectVideo,
  playOldestSongFromQueue,
  setPercent,
  fetchQueue,
  removeQueueItemFromQueue,
  getCurrentQueueItemId: () => currentQueueItemId,
  clearCurrentQueueItem: () => { currentQueueItemId = null; },
  handleQueueSongEnded
};

