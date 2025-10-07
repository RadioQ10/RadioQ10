(function initializeUserManager() {
    window.radioUser = window.radioUser ?? null;
  const modal = document.getElementById('userModal');
  const modalOverlay = document.getElementById('userModalOverlay');
  const nameForm = document.getElementById('userNameForm');
  const nameInput = document.getElementById('userNameInput');
  const nameError = document.getElementById('userNameError');
  const saveButton = document.getElementById('userNameSubmit');
  const changeUserButton = document.getElementById('changeUserButton');
    const requestedByInput = document.getElementById('requestedByInput');


    const queueListEl = document.getElementById('userList');
    const queueStatusEl = document.getElementById('userStatus');

  const storageKey = 'radioUser';

  function setRequestedByInput(name) {
    if (!requestedByInput) {
      return;
    }
    requestedByInput.value = name || '';
    requestedByInput.readOnly = true;
    requestedByInput.classList.add('bg-white/60');
  }

  function showChangeButton(show) {
    if (!changeUserButton) {
      return;
    }
    changeUserButton.classList.toggle('hidden', !show);
  }

  function showModal(prefillName = '') {
    if (!modal || !modalOverlay) {
      return;
    }
    if (nameInput) {
      nameInput.value = prefillName;
      nameInput.focus();
    }
    nameError?.classList.add('hidden');
    modal.classList.remove('hidden');
    modalOverlay.classList.remove('hidden');
  }

  function hideModal() {
    if (!modal || !modalOverlay) {
      return;
    }
    modal.classList.add('hidden');
    modalOverlay.classList.add('hidden');
  }

  function persistUser(user) {
    window.radioUser = user;
    try {
        localStorage.setItem(storageKey, JSON.stringify(user));
        connection.invoke("UserInfo", user.name);
    } catch (error) {
      console.warn('No se pudo guardar el usuario en el almacenamiento local.', error);
    }
    setRequestedByInput(user.name);
    showChangeButton(true);
  }

  async function fetchUser(id) {
    try {
      const response = await fetch(`/api/users/${id}`);
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('No se pudo validar el usuario almacenado.', error);
      return null;
    }
    }

    async function fetchUsers() {
        try {
            const response = await fetch(`/api/users/actuals`);
            if (!response.ok) {
                return null;
            }

            let data = await response.json();
            console.log(data);
            renderUser(data);


        } catch (error) {
            console.error('No se pudo validar el usuario almacenado.', error);
            return null;
        }
    }

    function renderUser(items) {
        if (!queueListEl || !queueStatusEl) {
            return;
        }
        queueListEl.innerHTML = '';
        if (!Array.isArray(items) || items.length === 0) {
            queueStatusEl.textContent = 'No hay usuarios actuales.';
            queueListEl.innerHTML = '<div class="rounded-2xl border border-dashed border-orange-200 bg-orange-50/50 px-5 py-6 text-center text-sm text-orange-500">No hay usuarios.</div>';
            return;
        }
        queueStatusEl.textContent = `Usuarios actuales: ${items.length}`;
        items.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'group flex items-center gap-4 rounded-2xl border border-orange-100 bg-white/80 p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-orange-100/50 animate-fade-in';
            li.style.animationDelay = `${index * 100}ms`;

            const body = document.createElement('div');
            body.className = 'flex-1 space-y-1';

            const title = document.createElement('div');
            title.className = 'text-sm font-semibold text-slate-800 group-hover:text-orange-600 transition-colors duration-300 line-clamp-2';
            title.textContent = item;
            body.appendChild(title);

            li.appendChild(body);

            queueListEl.appendChild(li);
        });
    }



  function clearStoredUser() {
    window.radioUser = null;
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('No se pudo limpiar el almacenamiento local.', error);
    }
    setRequestedByInput('');
    showChangeButton(false);
  }

  async function registerUser(name) {
    const payload = { name };
    const response = await fetch('/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'No se pudo registrar el usuario.');
    }

    return await response.json();
  }

  async function handleFormSubmit(event) {
    event.preventDefault();
    if (!nameInput || !saveButton) {
      return;
    }
    const name = nameInput.value.trim();
    if (name.length < 2) {
      nameError?.classList.remove('hidden');
      nameError.textContent = 'Ingresa un nombre de al menos 2 caracteres.';
      nameInput.focus();
      return;
    }

    nameError?.classList.add('hidden');
    saveButton.disabled = true;
    saveButton.textContent = 'Guardando...';

    try {
      const user = await registerUser(name);
      persistUser(user);
      hideModal();
    } catch (error) {
      console.error('No se pudo registrar al usuario.', error);
      nameError?.classList.remove('hidden');
      nameError.textContent = 'No se pudo registrar tu nombre. Inténtalo nuevamente.';
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = 'Guardar nombre';
    }
  }

  async function initialize() {
    let storedUser = null;
    try {
      const value = localStorage.getItem(storageKey);
      storedUser = value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn('No se pudo leer el usuario almacenado.', error);
    }

    if (storedUser?.id) {
      const verifiedUser = await fetchUser(storedUser.id);
      if (verifiedUser) {
        persistUser(verifiedUser);
        hideModal();
        return;
      }
      clearStoredUser();
    }

    showModal();
  }

  nameForm?.addEventListener('submit', handleFormSubmit);

  changeUserButton?.addEventListener('click', () => {
    const currentName = window.radioUser?.name || '';
    clearStoredUser();
    showModal(currentName);
  });

  modalOverlay?.addEventListener('click', () => {
    if (!window.radioUser) {
      return;
    }
    hideModal();
  });

    window.userManager = {
       fetchUsers
    };

  initialize();
})();
