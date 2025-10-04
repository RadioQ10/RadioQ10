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
          alert('Ocurrió un error al guardar la canción en la cola.');
        }
      });
    }

    const API_KEY = 'AIzaSyCeSDqbhZ2ozXjfmgdKHfW5wCFbBaibMr0';
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
      });
    }

    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        connection.invoke('Pause');
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

    const barPauseBtn = document.getElementById('barPauseBtn');
    if (barPauseBtn) {
      barPauseBtn.addEventListener('click', () => {
        connection.invoke('Pause');
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
        } catch (error) {
          console.error('No se pudo reproducir la canción desde la cola', error);
        }
      });
    }

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
