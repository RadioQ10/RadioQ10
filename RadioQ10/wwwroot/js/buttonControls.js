(function bootstrapButtonControls() {
    function registerButtonControls() {
        const radioApp = window.radioApp;
        if (!radioApp) {
            console.error('radioApp no está disponible.');
            return;
        }

        const { connection } = radioApp;

        const videoIdInput = document.getElementById('vid1');
        const manualTitleInput = document.getElementById('vid1Title');
        const loadBtn = document.getElementById('loadBtn');
        if (loadBtn) {
            loadBtn.addEventListener('click', async () => {
                const id1 = (videoIdInput?.value || '').trim();
                const title = (manualTitleInput?.value || '').trim();
                if (!id1) {
                    alert('Pega el videoId y vuelve a intentar.');
                    return;
                }
                if (!title) {
                    alert('Completa el título de la canción.');
                    return;
                }
                try {
                    await radioApp.enqueueSong({
                        videoId: id1,
                        title,
                        channelTitle: null,
                        thumbnailUrl: null
                    });
                } catch (error) {
                    console.error('No se pudo guardar la canción en la cola', error);
                    const message = error instanceof Error ? error.message : '';
                    if (message && message.toLowerCase().includes('nombre')) {
                        alert(message);
                    } else {
                        alert('Ocurrió un error al guardar la canción en la cola.');
                    }
                }
            });
        }

      const API_KEY = 'AIzaSyBvdmKbuvuACbaf95KHSrDkfj8A2HcSNOM';
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
      searchBtn.addEventListener('click', async () => {
        const query = document.getElementById('searchQuery').value.trim();
        if (!query) {
          return;
        }
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=8&q=${encodeURIComponent(query)}&key=${API_KEY}`;
        try {
          const res = await fetch(url);
          const data = await res.json();
          const results = (data.items || []).map(item => ({
            id: item.id?.videoId,
            title: item.snippet?.title ?? '',
            channelTitle: item.snippet?.channelTitle ?? '',
            thumbnail: item.snippet?.thumbnails?.medium?.url
              || item.snippet?.thumbnails?.default?.url
              || (item.id?.videoId ? `https://img.youtube.com/vi/${item.id.videoId}/default.jpg` : '')
          })).filter(video => video.id && video.title);
          radioApp.renderSearchResults(results);
        } catch (error) {
          console.error('No se pudo realizar la búsqueda en YouTube', error);
        }
      });
    }

        const playBtn = document.getElementById('playBtn');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                connection.invoke('Play');
                setBarState(true);
            });
        }

        const pauseBtn = document.getElementById('pauseBtn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                connection.invoke('Pause');
                setBarState(false);
            });
        }

        const seekPercentBtn = document.getElementById('seekPercentBtn');
        if (seekPercentBtn) {
            seekPercentBtn.addEventListener('click', () => {
                const val = document.getElementById('percent').value;
                radioApp.setPercent(val);
                connection.invoke('SeekPercent', val);
            });
        }

        function setBarState(isPlaying) {
            const barPlayBtn = document.getElementById('barPlayBtn');
            const barPauseBtn = document.getElementById('barPauseBtn');
            if (barPlayBtn && barPauseBtn) {
                if (isPlaying) {
                    barPlayBtn.style.transform = 'scale(0.8)';
                    barPlayBtn.style.opacity = '0';
                    setTimeout(() => {
                        barPlayBtn.classList.add('hidden');
                        barPauseBtn.classList.remove('hidden');
                        barPauseBtn.style.transform = 'scale(1)';
                        barPauseBtn.style.opacity = '1';
                    }, 150);
                } else {
                    barPauseBtn.style.transform = 'scale(0.8)';
                    barPauseBtn.style.opacity = '0';
                    setTimeout(() => {
                        barPauseBtn.classList.add('hidden');
                        barPlayBtn.classList.remove('hidden');
                        barPlayBtn.style.transform = 'scale(1)';
                        barPlayBtn.style.opacity = '1';
                    }, 150);
                }
            }
        }

        const barPauseBtn = document.getElementById('barPauseBtn');
        if (barPauseBtn) {
            barPauseBtn.addEventListener('click', () => {
                connection.invoke('Pause');
                setBarState(false);
            });
        }

        const barPlayBtn = document.getElementById('barPlayBtn');
        if (barPlayBtn) {
            barPlayBtn.addEventListener('click', async () => {
                try {
                    const started = await radioApp.playOldestSongFromQueue();
                    if (!started) {
                        connection.invoke('Play');
                    }
                    setBarState(true);
                } catch (error) {
                    console.error('No se pudo reproducir la canción desde la cola', error);
                }
            });
        }

        // Exponer función para uso en app.js
        window.setBarState = setBarState;

        const barRestartBtn = document.getElementById('barRestartBtn');
        if (barRestartBtn) {
            barRestartBtn.addEventListener('click', () => {
                connection.invoke('SeekPercent', 0);
                setTimeout(() => connection.invoke('Play'), 150);
            });
        }

        const barNextBtn = document.getElementById('barNextBtn');
        if (barNextBtn) {
            barNextBtn.addEventListener('click', async () => {
                try {
                    await radioApp.handleQueueSongEnded();
                } catch (error) {
                    console.error('No se pudo pasar a la siguiente canción', error);
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', registerButtonControls);
    } else {
        registerButtonControls();
    }
})();
