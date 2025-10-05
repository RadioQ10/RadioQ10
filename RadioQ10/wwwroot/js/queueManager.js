(function initializeQueueManager() {
  const queueListEl = document.getElementById('queueList');
  const queueStatusEl = document.getElementById('queueStatus');
  const requestedByInput = document.getElementById('requestedByInput');

  let currentQueueItemId = null;
  let isHandlingQueueEnd = false;

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
      queueListEl.innerHTML = '<div class="rounded-2xl border border-dashed border-orange-200 bg-orange-50/50 px-5 py-6 text-center text-sm text-orange-500">La cola está vacía. Busca y selecciona videos para agregar.</div>';
      return;
    }
    queueStatusEl.textContent = `Canciones en cola: ${items.length}`;
    items.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'group flex items-center gap-4 rounded-2xl border border-orange-100 bg-white/80 p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-100/50 animate-fade-in';
      li.style.animationDelay = `${index * 100}ms`;

      const thumb = document.createElement('img');
      thumb.className = 'h-16 w-24 rounded-xl object-cover ring-1 ring-orange-100/60 group-hover:ring-orange-300 transition-all duration-300';
      thumb.alt = '';
      thumb.loading = 'lazy';
      thumb.src = item.thumbnailUrl || (item.videoId ? `https://img.youtube.com/vi/${item.videoId}/mqdefault.jpg` : '');

      const body = document.createElement('div');
      body.className = 'flex-1 space-y-1';

      const title = document.createElement('div');
      title.className = 'text-sm font-semibold text-slate-800 group-hover:text-orange-600 transition-colors duration-300 line-clamp-2';
      title.textContent = item.title;
      body.appendChild(title);

      if (item.requestedBy) {
        const meta = document.createElement('div');
        meta.className = 'text-xs text-slate-500';
        meta.innerHTML = `<span class="inline-flex items-center gap-1"><svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/></svg>Solicitada por ${item.requestedBy}</span>`;
        body.appendChild(meta);
      }

      if (item.enqueuedAt) {
        const metaTime = document.createElement('div');
        metaTime.className = 'text-xs text-slate-400';
        const parsed = new Date(item.enqueuedAt);
        if (!isNaN(parsed)) {
          metaTime.innerHTML = `<span class="inline-flex items-center gap-1"><svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"/></svg>${parsed.toLocaleString()}</span>`;
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
      throw new Error('Faltan datos obligatorios para la canción.');
    }
    const activeUser = window.radioUser;
    if (!activeUser || !activeUser.id) {
      throw new Error('Debes registrar tu nombre antes de agregar canciones.');
    }

    if (requestedByInput) {
      requestedByInput.value = activeUser.name || '';
    }

    const payload = {
      videoId: details.videoId,
      title: details.title,
      channelTitle: details.channelTitle ?? null,
      thumbnailUrl: details.thumbnailUrl ?? null,
      userId: activeUser.id,
      requestedBy: activeUser.name || null
    };

    const response = await fetch('/api/music/queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'No se pudo guardar la canción.');
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

  function setCurrentQueueItemId(queueItemId) {
    currentQueueItemId = queueItemId || null;
  }

  function getCurrentQueueItemId() {
    return currentQueueItemId;
  }

  function clearCurrentQueueItem() {
    currentQueueItemId = null;
  }

  window.queueManager = {
    fetchQueue,
    renderQueue,
    enqueueSong,
    playOldestSongFromQueue,
    removeQueueItemFromQueue,
    handleQueueSongEnded,
    setCurrentQueueItemId,
    getCurrentQueueItemId,
    clearCurrentQueueItem
  };
})();
