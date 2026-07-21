(function () {
  var THUMB_SELECTOR = '.hero2-thumb img, .gallery-item img';
  var overlay, imgEl, currentList = [], currentIndex = -1;

  function collectImages() {
    return Array.prototype.filter.call(
      document.querySelectorAll(THUMB_SELECTOR),
      function (img) { return img.getAttribute('src'); }
    );
  }

  function show(index) {
    if (!currentList.length) return;
    currentIndex = (index + currentList.length) % currentList.length;
    imgEl.src = currentList[currentIndex].src;
  }

  function openLightbox(clickedImg) {
    currentList = collectImages();
    show(currentList.indexOf(clickedImg));
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML =
      '<button class="lightbox-btn lightbox-close" aria-label="סגור">✕</button>' +
      '<button class="lightbox-btn lightbox-prev" aria-label="התמונה הקודמת">›</button>' +
      '<img class="lightbox-img" alt="">' +
      '<button class="lightbox-btn lightbox-next" aria-label="התמונה הבאה">‹</button>';
    document.body.appendChild(overlay);
    imgEl = overlay.querySelector('.lightbox-img');

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeLightbox();
    });
    overlay.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
    overlay.querySelector('.lightbox-prev').addEventListener('click', function () { show(currentIndex - 1); });
    overlay.querySelector('.lightbox-next').addEventListener('click', function () { show(currentIndex + 1); });

    document.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') show(currentIndex + 1);
      if (e.key === 'ArrowRight') show(currentIndex - 1);
    });
  }

  document.addEventListener('click', function (e) {
    if (e.target.matches && e.target.matches(THUMB_SELECTOR)) {
      e.preventDefault();
      openLightbox(e.target);
    }
  });

  buildOverlay();
})();
