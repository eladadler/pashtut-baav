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
        var host = document.querySelector('[data-img-key="' + key + '"]');
        if (!host) return;
        var img = host.querySelector('img');
        if (img && images[key]) img.src = images[key];
      });
    })
    .catch(function () { /* no saved content yet — defaults in the HTML stand */ });
})();
