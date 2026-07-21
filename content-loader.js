(function () {
  fetch('content.json', { cache: 'no-store' })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) {
      if (!data) return;
      var texts = data.texts || {};
      var images = data.images || {};

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
