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
    const prevBtn = root?.querySelector('[data-slider-prev]');
    const nextBtn = root?.querySelector('[data-slider-next]');
    const dotsWrap = root?.querySelector('[data-slider-dots]');
    const cards = track ? Array.from(track.querySelectorAll('.skill-card')) : [];

    if (!track || cards.length === 0) return;

    let activeIndex = 0;
    let isAnimating = false;

    if (dotsWrap) {
      dotsWrap.innerHTML = cards.map(() => '<span class="slider-dot"></span>').join('');
    }
    const dots = Array.from(dotsWrap?.querySelectorAll('.slider-dot') || []);

    function applyTransforms() {
      cards.forEach((card, i) => {
        const offset = i - activeIndex;
        const absOffset = Math.abs(offset);

        const rotateY = offset * 42;
        const translateX = offset * 58;
        const translateZ = -absOffset * 120;
        const scale = absOffset === 0 ? 1 : absOffset === 1 ? 0.82 : 0.68;
        const opacity = absOffset > 3 ? 0 : absOffset === 0 ? 1 : absOffset === 1 ? 0.72 : 0.4;
        const zIndex = cards.length - absOffset;

        card.style.transform = `translateX(${translateX}%) rotateY(${rotateY}deg) translateZ(${translateZ}px) scale(${scale})`;
        card.style.opacity = opacity;
        card.style.zIndex = zIndex;
        card.style.pointerEvents = absOffset === 0 ? 'auto' : 'none';
        card.classList.toggle('is-active', offset === 0);
      });

      dots.forEach((d, i) => d.classList.toggle('active', i === activeIndex));

      if (prevBtn) prevBtn.disabled = activeIndex === 0;
      if (nextBtn) nextBtn.disabled = activeIndex === cards.length - 1;
    }

    function goTo(index) {
      if (isAnimating) return;
      activeIndex = Math.max(0, Math.min(cards.length - 1, index));
      isAnimating = true;
      applyTransforms();
      setTimeout(() => { isAnimating = false; }, 420);
    }

    prevBtn?.addEventListener('click', () => goTo(activeIndex - 1));
    nextBtn?.addEventListener('click', () => goTo(activeIndex + 1));

    dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

    let dragStartX = 0;
    let isDragging = false;

    track.addEventListener('pointerdown', (e) => {
      dragStartX = e.clientX;
      isDragging = true;
      track.setPointerCapture(e.pointerId);
    });

    track.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
    });

    track.addEventListener('pointerup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      const diff = dragStartX - e.clientX;
      if (Math.abs(diff) > 40) {
        goTo(activeIndex + (diff > 0 ? 1 : -1));
      }
    });

    track.addEventListener('pointercancel', () => { isDragging = false; });

    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') goTo(activeIndex - 1);
      if (e.key === 'ArrowRight') goTo(activeIndex + 1);
    });

    root.setAttribute('tabindex', '0');

    applyTransforms();
  }

  initStarfield();
  initFooterTimestamp();
  initSkillsSlider();
})();
