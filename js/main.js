(function () {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function initStarfield() {
    const canvas = document.getElementById('stars');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let w, h, stars;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.width = Math.floor(window.innerWidth * dpr);
      h = canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';

      const count = Math.floor((window.innerWidth * window.innerHeight) / 6000);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.6 + 0.2,
        a: Math.random() * 0.65 + 0.15,
        v: Math.random() * 0.18 + 0.04,
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff';
      stars.forEach((s) => {
        ctx.globalAlpha = s.a;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    function tick() {
      if (!prefersReducedMotion && stars) {
        stars.forEach((s) => {
          s.y += s.v;
          if (s.y > h + 10) {
            s.y = -10;
            s.x = Math.random() * w;
          }
        });
      }
      draw();
      requestAnimationFrame(tick);
    }

    window.addEventListener('resize', () => {
      resize();
      draw();
    });

    resize();
    tick();
  }

  function initFooterTimestamp() {
    const el = document.getElementById('ts');
    if (el) el.textContent = new Date().toISOString().slice(0, 10);
  }

  function initSkillsSlider() {
    const root = document.getElementById('skills');
    const track = root?.querySelector('[data-slider-track]');
    const cards = track ? Array.from(track.querySelectorAll('.skill-card')) : [];

    if (!track || cards.length === 0) return;

    const total = cards.length;
    let activeIndex = 0;
    let isAnimating = false;
    let autoplayTimer = null;

    function applyTransforms() {
      const cardWidth = cards[0].offsetWidth || 360;
      const sideOffset = cardWidth * 0.86;

      cards.forEach((card, i) => {
        let offset = i - activeIndex;

        if (offset > total / 2) offset -= total;
        if (offset < -total / 2) offset += total;

        const absOffset = Math.abs(offset);
        const sign = offset > 0 ? 1 : offset < 0 ? -1 : 0;

        let translateX, translateZ, rotateY, scale, opacity;

        if (absOffset === 0) {
          translateX = 0; translateZ = 0; rotateY = 0; scale = 1; opacity = 1;
        } else if (absOffset === 1) {
          translateX = sign * sideOffset; translateZ = -80; rotateY = sign * 38; scale = 0.84; opacity = 0.75;
        } else if (absOffset === 2) {
          translateX = sign * (sideOffset + cardWidth * 0.64); translateZ = -160; rotateY = sign * 52; scale = 0.68; opacity = 0.4;
        } else {
          translateX = sign * (sideOffset + cardWidth * 1.1); translateZ = -220; rotateY = sign * 60; scale = 0.55; opacity = 0;
        }

        card.style.transform = `translateX(${translateX}px) rotateY(${rotateY}deg) translateZ(${translateZ}px) scale(${scale})`;
        card.style.opacity = opacity;
        card.style.zIndex = total - absOffset;
        card.style.pointerEvents = absOffset === 0 ? 'auto' : 'none';
        card.classList.toggle('is-active', offset === 0);
      });
    }

    function goTo(index) {
      if (isAnimating) return;
      activeIndex = ((index % total) + total) % total;
      isAnimating = true;
      applyTransforms();
      setTimeout(() => { isAnimating = false; }, 420);
    }

    function startAutoplay() {
      if (prefersReducedMotion) return;
      autoplayTimer = setInterval(() => goTo(activeIndex + 1), 5000);
    }

    function resetAutoplay() {
      clearInterval(autoplayTimer);
      startAutoplay();
    }

    let dragStartX = 0;
    let isDragging = false;

    track.addEventListener('pointerdown', (e) => {
      dragStartX = e.clientX;
      isDragging = true;
      track.setPointerCapture(e.pointerId);
      clearInterval(autoplayTimer);
    });

    track.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
    });

    track.addEventListener('pointerup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      const diff = dragStartX - e.clientX;
      if (Math.abs(diff) > 40) goTo(activeIndex + (diff > 0 ? 1 : -1));
      resetAutoplay();
    });

    track.addEventListener('pointercancel', () => {
      isDragging = false;
      resetAutoplay();
    });

    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { goTo(activeIndex - 1); resetAutoplay(); }
      if (e.key === 'ArrowRight') { goTo(activeIndex + 1); resetAutoplay(); }
    });

    root.setAttribute('tabindex', '0');

    applyTransforms();
    startAutoplay();
  }

  function initPillIcons() {
    document.querySelectorAll('.pill-icon').forEach((img) => {
      if (img.complete && img.naturalWidth === 0) {
        img.setAttribute('data-error', '');
      } else {
        img.addEventListener('error', () => img.setAttribute('data-error', ''));
      }
    });
  }

  initStarfield();
  initFooterTimestamp();
  initSkillsSlider();
  initPillIcons();
})();
