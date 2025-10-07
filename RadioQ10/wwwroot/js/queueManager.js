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
      // Mantener copia accesible globalmente para Now Playing
      try { window.__queueItems = items; } catch {}
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

      // Acciones (botón naranja para eliminar)
  const actions = document.createElement('div');
  actions.className = 'ml-auto relative flex items-center gap-2';
  actions.appendChild(createOrangeRemoveButton(item, li));
      li.appendChild(actions);

      queueListEl.appendChild(li);
    });
  }

  // Crea el botón "naranja" para eliminar un item de la cola
  function createOrangeRemoveButton(item, containerEl) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = 'Eliminar de la cola';
    btn.setAttribute('aria-label', 'Eliminar de la cola');
    btn.className = 'inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#ff7a1a] to-[#ff4d00] text-white shadow-md transition-all duration-300 hover:shadow-lg hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-orange-200';
    btn.innerHTML = '<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2h.293l.853 10.236A2 2 0 007.139 18h5.722a2 2 0 001.993-1.764L15.707 6H16a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM8 8a1 1 0 112 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 112 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd"/></svg>';

    let busy = false;
    btn.addEventListener('click', async (ev) => {
      if (busy) return;
      try {
        busy = true;
        // 1) Animación de partículas
        triggerExplosion(containerEl, ev);
        // 2) Colapso suave del contenedor
        await collapseElement(containerEl);
        // 3) Llamar backend y luego refrescar lista
        await removeQueueItemFromQueue(item.id);
        await fetchQueue();
      } catch (error) {
        console.error('No se pudo eliminar el elemento de la cola', error);
        // Si falla, revertimos colapso visual volviendo a mostrar el elemento
        try { containerEl.style.display = ''; containerEl.style.height = ''; } catch {}
      } finally {
        busy = false;
      }
    });

    return btn;
  }

  // Animación de explosión con partículas naranjas
  function triggerExplosion(containerEl, ev) {
    try {
      const rect = containerEl.getBoundingClientRect();
      const originX = (ev?.clientX ?? (rect.left + rect.width / 2)) - rect.left;
      const originY = (ev?.clientY ?? (rect.top + rect.height / 2)) - rect.top;
      const particles = 12;
      containerEl.style.position = containerEl.style.position || 'relative';
      for (let i = 0; i < particles; i++) {
        const p = document.createElement('span');
        p.className = 'q10-particle';
        const size = 4 + Math.random() * 8; // 4-12px
        p.style.width = `${size}px`;
        p.style.height = `${size}px`;
        p.style.left = `${originX}px`;
        p.style.top = `${originY}px`;
        containerEl.appendChild(p);

        const angle = (Math.PI * 2 * i) / particles + Math.random() * 0.6;
        const radius = 40 + Math.random() * 60; // distancia de viaje
        const tx = Math.cos(angle) * radius;
        const ty = Math.sin(angle) * radius;
        requestAnimationFrame(() => {
          p.style.transform = `translate(${tx}px, ${ty}px) rotate(${Math.random()*180}deg)`;
          p.style.opacity = '0';
        });
        setTimeout(() => p.remove(), 750);
      }
      containerEl.classList.add('q10-exploding');
      setTimeout(() => containerEl.classList.remove('q10-exploding'), 300);
    } catch {}
  }

  // Colapsa el elemento con una transición suave de altura
  function collapseElement(el) {
    return new Promise((resolve) => {
      try {
        const h = el.offsetHeight;
        el.classList.add('q10-collapsing');
        el.style.height = h + 'px';
        // Forzar reflow
        void el.offsetHeight;
        el.style.height = '0px';
        el.style.marginTop = '0px';
        el.style.marginBottom = '0px';
        el.style.paddingTop = '0px';
        el.style.paddingBottom = '0px';
        el.style.borderWidth = '0px';
        setTimeout(() => {
          el.style.display = 'none';
          resolve();
        }, 430);
      } catch {
        resolve();
      }
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
      connection.invoke("UpdateQueue");
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
     connection.invoke("UpdateQueue");
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
