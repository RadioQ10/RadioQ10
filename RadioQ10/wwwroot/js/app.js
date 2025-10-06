(function loadYT() {
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
})();

let playerA;
let isSyncing = false; // evita loops de eventos
let playerReady = false;
let pendingSync = null;
const manualTitleInput = document.getElementById('vid1Title');
const videoIdInput = document.getElementById('vid1');

const queueManager = window.queueManager;
if (!queueManager) {
  throw new Error('queueManager no está disponible.');
}

const {
  fetchQueue,
  enqueueSong,
  playOldestSongFromQueue,
  removeQueueItemFromQueue,
  handleQueueSongEnded,
  setCurrentQueueItemId,
  getCurrentQueueItemId,
  clearCurrentQueueItem
} = queueManager;

// --- SignalR ---
const connection = new signalR.HubConnectionBuilder()
  .withUrl("/radioHub")
  .withAutomaticReconnect()
  .build();

connection.start().catch(err => console.error(err.toString()));
fetchQueue();

// Recibe eventos del hub
connection.on("SyncState", (id1, startTimestamp, percent, isPlaying, queueItemId) => {
  setCurrentQueueItemId(queueItemId || null);
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
  if (window.setBarState) window.setBarState(true);
  setTimeout(() => { isSyncing = false; }, 300);
});
connection.on("Pause", () => {
  isSyncing = true;
  playerA && playerA.pauseVideo();
  if (window.setBarState) window.setBarState(false);
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
  setCurrentQueueItemId(queueItemId || null);
  playerReady = false;
  playerA.loadVideoById({videoId: id1, startSeconds: 0});
  document.getElementById('vid1').value = id1;
  // Guarda la sincronizaciÃ³n pendiente
  pendingSync = { id1, startTimestamp };
  tryStartSync();
});
connection.on("UpdateQueue", () => {
    window.queueManager.fetchQueue();
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
    container.innerHTML = '<div class="rounded-2xl border border-dashed border-orange-200 bg-orange-50/50 px-5 py-6 text-center text-sm text-orange-500">No se encontraron videos para esa búsqueda.</div>';
    return;
  }
  results.forEach((video, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'group relative flex w-full items-center gap-4 rounded-2xl border border-transparent bg-white/90 p-4 text-left text-slate-800 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-orange-300 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-orange-200 animate-fade-in';
    button.style.animationDelay = `${index * 100}ms`;
    button.setAttribute('role', 'listitem');
    button.setAttribute('aria-label', 'Sincronizar ' + video.title);
    
    const thumb = document.createElement('img');
    thumb.src = video.thumbnail;
    thumb.alt = 'Miniatura de ' + video.title;
    thumb.className = 'h-20 w-32 rounded-xl object-cover ring-1 ring-orange-100/60 group-hover:ring-orange-300 transition-all duration-300';
    
    const info = document.createElement('div');
    info.className = 'flex flex-col gap-1 flex-1';
    
    const title = document.createElement('span');
    title.className = 'text-sm font-semibold text-slate-800 group-hover:text-orange-600 transition-colors duration-300 line-clamp-2';
    title.textContent = video.title;
    
    const meta = document.createElement('span');
    meta.className = 'text-xs text-slate-400';
    meta.innerHTML = `<span class="inline-flex items-center gap-1"><svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"/></svg>ID: ${video.id}</span>`;
    
    const addIcon = document.createElement('div');
    addIcon.className = 'flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110';
    addIcon.innerHTML = '<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"/></svg>';
    
    info.appendChild(title);
    info.appendChild(meta);
    button.appendChild(thumb);
    button.appendChild(info);
    button.appendChild(addIcon);
    
    button.addEventListener('click', () => {
      selectVideo(video);
    });
    
    container.appendChild(button);
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
    console.error('No se pudo guardar la canción en la cola', error);
    const message = error instanceof Error ? error.message : '';
    if (message && message.toLowerCase().includes('nombre')) {
      alert(message);
    } else {
      alert('Ocurrió un error al guardar la canción en la cola.');
    }
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

// botÃ³n de UI para porcentaje (opcional, solo si existe en la vista)
const seekPercentBtn = document.getElementById('seekPercentBtn');
if (seekPercentBtn) {
  seekPercentBtn.addEventListener('click', () => {
    const percentInput = document.getElementById('percent');
    const val = percentInput ? percentInput.value : undefined;
    if (val == null) {
      return;
    }
    setPercent(val);
    connection.invoke('SeekPercent', val);
  });
}

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
  getCurrentQueueItemId,
  clearCurrentQueueItem,
  handleQueueSongEnded
};

