(function () {
  var token = sessionStorage.getItem('admin-token');
  var pendingImageKey = null;
  var pendingUploads = {}; // key -> {filename, dataBase64}

  var loginScreen = document.getElementById('login-screen');
  var toolbar = document.getElementById('toolbar');
  var stage = document.getElementById('stage');
  var statusEl = document.getElementById('status');
  var fileInput = document.getElementById('file-input');

  function setStatus(msg) { statusEl.textContent = msg || ''; }

  function showEditor() {
    loginScreen.style.display = 'none';
    toolbar.style.display = 'flex';
    loadStage();
  }

  document.getElementById('login-btn').addEventListener('click', doLogin);
  document.getElementById('login-password').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') doLogin();
  });

  function doLogin() {
    var password = document.getElementById('login-password').value;
    fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password })
    }).then(function (r) { return r.json(); }).then(function (data) {
      if (data.ok) {
        token = data.token;
        sessionStorage.setItem('admin-token', token);
        showEditor();
      } else {
        document.getElementById('login-error').textContent = 'סיסמה שגויה';
      }
    });
  }

  if (token) showEditor();

  function loadStage() {
    Promise.all([
      fetch('index.html').then(function (r) { return r.text(); }),
      fetch('content.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : { texts: {}, images: {} }; })
    ]).then(function (results) {
      var html = results[0];
      var content = results[1];
      var doc = new DOMParser().parseFromString(html, 'text/html');

      // Pull in every top-level section from the public page except the hero
      // (which stays untouched here so the toolbar has room) — actually keep everything.
      var body = doc.body;
      Array.prototype.slice.call(body.children).forEach(function (node) {
        if (node.tagName === 'SCRIPT' || node.id === 'file-input') return;
        stage.appendChild(node);
      });

      applyContent(content);
      enableEditing();
    });
  }

  function applyContent(content) {
    var texts = content.texts || {};
    var images = content.images || {};
    Object.keys(texts).forEach(function (key) {
      var el = stage.querySelector('[data-key="' + key + '"]');
      if (el) el.innerHTML = texts[key];
    });
    Object.keys(images).forEach(function (key) {
      var host = stage.querySelector('[data-img-key="' + key + '"]');
      if (!host) return;
      var img = host.querySelector('img');
      if (img) img.src = images[key];
    });
  }

  function enableEditing() {
    stage.querySelectorAll('[data-key]').forEach(function (el) {
      el.setAttribute('contenteditable', 'true');
    });
    stage.querySelectorAll('[data-img-key]').forEach(function (host) {
      var btn = document.createElement('div');
      btn.className = 'img-edit-btn';
      btn.textContent = '📷 החלף תמונה';
      host.appendChild(btn);
      host.addEventListener('click', function (e) {
        e.preventDefault();
        pendingImageKey = host.getAttribute('data-img-key');
        fileInput.click();
      });
    });
  }

  fileInput.addEventListener('change', function () {
    var file = fileInput.files[0];
    if (!file || !pendingImageKey) return;
    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(',')[1];
      var host = stage.querySelector('[data-img-key="' + pendingImageKey + '"]');
      var img = host && host.querySelector('img');
      if (img) img.src = dataUrl;
      pendingUploads[pendingImageKey] = { filename: file.name, dataBase64: base64 };
      setStatus('תמונה חדשה מוכנה לשמירה — לחצו "שמור טיוטה"');
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  });

  function collectTexts() {
    var texts = {};
    stage.querySelectorAll('[data-key]').forEach(function (el) {
      texts[el.getAttribute('data-key')] = el.innerHTML.trim();
    });
    return texts;
  }

  function authHeaders() {
    return { 'Content-Type': 'application/json', 'X-Admin-Token': token };
  }

  function uploadPendingImages() {
    var keys = Object.keys(pendingUploads);
    var images = {};
    var chain = Promise.resolve();
    keys.forEach(function (key) {
      chain = chain.then(function () {
        return fetch('/api/upload', {
          method: 'POST', headers: authHeaders(),
          body: JSON.stringify({ key: key, filename: pendingUploads[key].filename, dataBase64: pendingUploads[key].dataBase64 })
        }).then(function (r) { return r.json(); }).then(function (data) {
          if (data.ok) images[key] = data.path;
        });
      });
    });
    return chain.then(function () { return images; });
  }

  function save() {
    setStatus('שומר...');
    return uploadPendingImages().then(function (images) {
      var texts = collectTexts();
      return fetch('/api/save', {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ texts: texts, images: images })
      }).then(function (r) { return r.json(); }).then(function (data) {
        if (data.ok) {
          pendingUploads = {};
          setStatus('נשמר ✓');
        } else {
          setStatus('שגיאה בשמירה: ' + (data.error || ''));
        }
        return data;
      });
    });
  }

  document.getElementById('save-btn').addEventListener('click', function () {
    save();
  });

  document.getElementById('publish-btn').addEventListener('click', function () {
    save().then(function (data) {
      if (!data.ok) return;
      setStatus('מפרסם לאתר החי...');
      fetch('/api/publish', {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ message: 'עדכון תוכן דרך פאנל האדמין' })
      }).then(function (r) { return r.json(); }).then(function (data) {
        setStatus(data.ok ? 'פורסם! עולה לאוויר תוך דקה ✓' : 'שגיאת פרסום: ' + (data.error || ''));
      });
    });
  });
})();
