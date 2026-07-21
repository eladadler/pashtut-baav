(function () {
  var DEFAULT_SETTINGS = {
    headingFont: 'Rubik',
    bodyFont: 'Assistant',
    headingWeight: '800',
    bodyWeight: '400',
    headingScale: 100,
    bodyScale: 100
  };

  function ensureFontLoaded(fontName) {
    if (!fontName) return;
    var id = 'gf-' + fontName.replace(/\s+/g, '-');
    if (document.getElementById(id)) return;
    var link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + fontName.replace(/ /g, '+') + ':wght@300;400;500;600;700;800;900&display=swap';
    document.head.appendChild(link);
  }

  function applySettings(settings) {
    var s = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    ensureFontLoaded(s.headingFont);
    ensureFontLoaded(s.bodyFont);
    var root = document.documentElement.style;
    root.setProperty('--font-heading', '"' + s.headingFont + '", system-ui, sans-serif');
    root.setProperty('--font-body', '"' + s.bodyFont + '", system-ui, sans-serif');
    root.setProperty('--font-heading-weight', s.headingWeight);
    root.setProperty('--font-body-weight', s.bodyWeight);
    root.setProperty('--heading-scale', s.headingScale / 100);
    root.setProperty('--body-scale', s.bodyScale / 100);
  }

  fetch('content.json', { cache: 'no-store' })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) {
      if (!data) return;
      var texts = data.texts || {};
      var images = data.images || {};

      applySettings(data.settings);

      Object.keys(texts).forEach(function (key) {
        var el = document.querySelector('[data-key="' + key + '"]');
        if (el) el.innerHTML = texts[key];
      });

      Object.keys(images).forEach(function (key) {
        document.querySelectorAll('[data-img-key="' + key + '"]').forEach(function (host) {
          var img = host.querySelector('img');
          if (img && images[key]) img.src = images[key];
        });
      });

      setupHeroMoreTile(images);
    })
    .catch(function () { /* no saved content yet — defaults in the HTML stand */ });

  function setupHeroMoreTile(images) {
    var galleryKeys = Object.keys(images)
      .filter(function (k) { return /^gallery-\d+$/.test(k) && images[k]; })
      .sort(function (a, b) { return Number(a.split('-')[1]) - Number(b.split('-')[1]); });

    var tile = document.getElementById('hero2-more-tile');
    if (!tile || galleryKeys.length <= 2) return;

    var extra = galleryKeys.length - 2;
    document.getElementById('hero2-more-bg').src = images[galleryKeys[2]];
    document.getElementById('hero2-more-count').textContent = '+' + extra;
    tile.classList.add('visible');
  }
})();
