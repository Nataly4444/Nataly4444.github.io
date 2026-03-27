const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

async function loadContent() {
  try {
    const response = await fetch('/content.json');
    if (response.ok) return await response.json();
    console.error('Failed to load content:', response.status);
  } catch (error) {
    console.error('Failed to load content:', error);
  }
  return null;
}

function populateBasicContent(data) {
  document.querySelectorAll('[data-content]').forEach(el => {
    const key = el.getAttribute('data-content');
    if (data[key]) {
      if (key === 'about') {
        el.innerHTML = data[key];
      } else {
        el.textContent = data[key];
      }
    }
  });

  document.querySelectorAll('[data-contact]').forEach(el => {
    const key = el.getAttribute('data-contact');
    if (data.contacts && data.contacts[key]) {
      el.textContent = data.contacts[key];
    }
  });

  document.querySelectorAll('[data-link]').forEach(el => {
    const key = el.getAttribute('data-link');
    if (data.contacts && data.contacts[key]) {
      const value = data.contacts[key];
      if (key === 'email' || key === 'emailGmail') {
        el.href = value.startsWith('mailto:') ? value : `mailto:${value}`;
      } else {
        el.href = value;
      }
    }
  });


  const title = `${data.name} - ${data.title}`;
  document.title = title;
  
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.content = title;
  
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  if (twitterTitle) twitterTitle.content = title;
  
  const description = data.tagline;
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) metaDescription.content = description;
  
  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogDescription) ogDescription.content = description;
  
  const twitterDescription = document.querySelector('meta[name="twitter:description"]');
  if (twitterDescription) twitterDescription.content = description;
}

function populateSkills(data) {
  const skillsContainer = document.querySelector('[data-skills]');
  if (!skillsContainer || !data.skills) return;

  const html = Object.entries(data.skills).map(([category, skills]) => `
    <div class="skill-category">
      <h3 class="skill-category-title">${category}</h3>
      <ul class="skill-list">
        ${skills.map(skill => `<li class="skill-item">${skill}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  skillsContainer.innerHTML = html;
  setupSkillsSlider();
}

function setupSkillsSlider() {
  const track = document.querySelector('.skills-slider-track');
  const grid = document.querySelector('.skills-grid');
  if (!track || !grid) return;

  const cards = grid.querySelectorAll('.skill-category');
  const cardCount = cards.length;
  if (cardCount === 0) return;

  cards.forEach(card => {
    const clone = card.cloneNode(true);
    clone.classList.add('skill-category-clone');
    grid.appendChild(clone);
  });

  const allCards = grid.querySelectorAll('.skill-category');

  function contentScrollLeftForCard(card) {
    return card.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;
  }

  let loopWidth = 0;
  let dupAlignScroll = 0;

  function refreshLoopMetrics() {
    const first = allCards[0];
    const dup = allCards[cardCount];
    if (!first || !dup) return;
    const home = contentScrollLeftForCard(first);
    const dupPos = contentScrollLeftForCard(dup);
    const w = dupPos - home;
    if (w > 1) {
      loopWidth = w;
      dupAlignScroll = dupPos;
    }
  }

  function normalizeCarouselScrollPosition() {
    if (loopWidth <= 0 || dupAlignScroll <= 0) return;
    const prevBeh = track.style.scrollBehavior;
    track.style.scrollBehavior = 'auto';
    let guard = 0;
    while (track.scrollLeft >= dupAlignScroll - 0.5 && guard < 48) {
      track.scrollLeft -= loopWidth;
      guard += 1;
    }
    track.style.scrollBehavior = prevBeh;
  }

  let currentIndex = 0;
  let autoSlideIndex = 0;
  let autoNextStepTimer = null;
  let autoAfterScrollTimer = null;
  const INTERVAL = 2000;
  const AUTO_SETTLE_MS = 1200;
  let isAutoScrolling = false;

  function scrollToIndex(index, useClone = false, behavior = 'smooth') {
    if (index >= cardCount) index = 0;
    if (index < 0) index = cardCount - 1;
    currentIndex = index;
    const targetCard = useClone ? allCards[cardCount + index] : allCards[index];
    if (!targetCard) return;
    const left = contentScrollLeftForCard(targetCard);
    track.scrollTo({ left, behavior });
  }

  function updateCurrentIndexFromScroll() {
    const sl = track.scrollLeft;
    let closest = 0;
    let minDist = Infinity;
    for (let i = 0; i < cardCount; i++) {
      const dist = Math.abs(contentScrollLeftForCard(allCards[i]) - sl);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    }
    currentIndex = closest;
  }

  function runAutoScrollStep() {
    autoNextStepTimer = null;
    const stepStart = Date.now();
    refreshLoopMetrics();
    if (loopWidth <= 0) {
      autoNextStepTimer = setTimeout(runAutoScrollStep, INTERVAL);
      return;
    }

    normalizeCarouselScrollPosition();

    const nextIndex = (autoSlideIndex + 1) % cardCount;
    const nextUseClone = autoSlideIndex === cardCount - 1 && nextIndex === 0;

    if (autoAfterScrollTimer) {
      clearTimeout(autoAfterScrollTimer);
      autoAfterScrollTimer = null;
    }

    isAutoScrolling = true;
    scrollToIndex(nextIndex, nextUseClone, 'smooth');
    autoSlideIndex = nextIndex;

    autoAfterScrollTimer = setTimeout(() => {
      autoAfterScrollTimer = null;
      try {
        refreshLoopMetrics();
        normalizeCarouselScrollPosition();
        updateCurrentIndexFromScroll();
      } finally {
        isAutoScrolling = false;
        const wait = Math.max(0, INTERVAL - (Date.now() - stepStart));
        autoNextStepTimer = setTimeout(runAutoScrollStep, wait);
      }
    }, AUTO_SETTLE_MS);
  }

  function startAutoScroll() {
    stopAutoScroll();
    autoNextStepTimer = setTimeout(runAutoScrollStep, INTERVAL);
  }

  function stopAutoScroll() {
    if (autoNextStepTimer) {
      clearTimeout(autoNextStepTimer);
      autoNextStepTimer = null;
    }
    if (autoAfterScrollTimer) {
      clearTimeout(autoAfterScrollTimer);
      autoAfterScrollTimer = null;
    }
    isAutoScrolling = false;
  }

  let userScrollTimeout = null;
  function onUserScroll() {
    stopAutoScroll();
    if (userScrollTimeout) clearTimeout(userScrollTimeout);
    userScrollTimeout = setTimeout(() => {
      userScrollTimeout = null;
      refreshLoopMetrics();
      normalizeCarouselScrollPosition();
      updateCurrentIndexFromScroll();
      autoSlideIndex = currentIndex;
      startAutoScroll();
    }, 3000);
  }

  let carouselScrollSettleTimer = null;
  track.addEventListener('scroll', () => {
    updateCurrentIndexFromScroll();
    if (carouselScrollSettleTimer) clearTimeout(carouselScrollSettleTimer);
    carouselScrollSettleTimer = setTimeout(() => {
      carouselScrollSettleTimer = null;
      if (!isAutoScrolling && loopWidth > 0 && track.scrollLeft >= dupAlignScroll - 1) {
        refreshLoopMetrics();
        normalizeCarouselScrollPosition();
        updateCurrentIndexFromScroll();
      }
    }, 150);
  });

  const ro = new ResizeObserver(() => {
    refreshLoopMetrics();
  });
  ro.observe(track);

  let isDragging = false;
  let startX = 0;
  let startScrollLeft = 0;

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const delta = startX - e.pageX;
    track.scrollLeft = startScrollLeft + delta;
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    isDragging = false;
    track.style.cursor = '';
    track.style.userSelect = '';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  track.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
    isDragging = true;
    startX = e.pageX;
    startScrollLeft = track.scrollLeft;
    track.style.cursor = 'grabbing';
    track.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    onUserScroll();
  });

  let touchSliderScrollLeft = null;
  track.addEventListener('touchstart', (e) => {
    if (!e.isTrusted) return;
    touchSliderScrollLeft = track.scrollLeft;
  }, { passive: true });
  const endTouchSlider = (e) => {
    if (!e.isTrusted || touchSliderScrollLeft === null) return;
    if (Math.abs(track.scrollLeft - touchSliderScrollLeft) > 6) {
      onUserScroll();
    }
    touchSliderScrollLeft = null;
  };
  track.addEventListener('touchend', endTouchSlider, { passive: true });
  track.addEventListener('touchcancel', endTouchSlider, { passive: true });

  track.addEventListener('wheel', (e) => {
    if (e.deltaY === 0) return;
    if (track.scrollWidth <= track.clientWidth) return;

    onUserScroll();

    e.preventDefault();
    track.scrollLeft += e.deltaY;
  }, { passive: false });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      refreshLoopMetrics();
      if (!prefersReducedMotion) startAutoScroll();
    });
  });
}


function populateProjects(data) {
  const projectsContainer = document.querySelector('[data-projects]');
  if (!projectsContainer || !data.projects) return;

  const html = data.projects.map(project => {
    const linksHtml = Object.entries(project.links || {})
      .filter(([_, url]) => url && url !== '#')
      .map(([type, url]) => `
        <a href="${url}" class="project-link" target="_blank" rel="noopener noreferrer">
          ${type === 'demo' ? 'View Demo' : 'View Code'}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M3 3L13 13M13 13V5M13 13H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      `).join('');

    return `
      <article class="project-card">
        <div class="project-header">
          <h3 class="project-title">${project.title}</h3>
          <p class="project-subtitle">${project.subtitle}</p>
        </div>
        <p class="project-description">${project.description}</p>
        <div class="project-meta">
          <div>
            <p class="project-role">Role: ${project.role}</p>
          </div>
          <div>
            <p class="project-stack-label">Stack:</p>
            <div class="project-stack">
              ${project.stack.map(tech => `<span class="project-tech">${tech}</span>`).join('')}
            </div>
          </div>
        </div>
        <ul class="project-highlights">
          ${project.highlights.map(highlight => `<li class="project-highlight">${highlight}</li>`).join('')}
        </ul>
        ${linksHtml ? `<div class="project-links">${linksHtml}</div>` : ''}
      </article>
    `;
  }).join('');

  projectsContainer.innerHTML = html;
}

function populateExperience(data) {
  const experienceContainer = document.querySelector('[data-experience]');
  if (!experienceContainer || !data.experience) return;

  const html = data.experience.map(exp => `
    <div class="timeline-item">
      <div class="timeline-header">
        <h3 class="timeline-title">${exp.title}</h3>
        <p class="timeline-company">${exp.company}</p>
      </div>
      <p class="timeline-period">${exp.period}</p>
      <ul class="timeline-highlights">
        ${exp.highlights.map(highlight => `<li class="timeline-highlight">${highlight}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  experienceContainer.innerHTML = html;
}

function setupNavigation() {
  const navToggle = document.querySelector('.nav-toggle');
  const navList = document.querySelector('.nav-list');
  
  if (!navToggle || !navList) return;

  function closeMenu() {
    navList.classList.remove('nav-list--open');
    navToggle.setAttribute('aria-expanded', 'false');
  }

  navToggle.addEventListener('click', () => {
    const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      closeMenu();
    } else {
      navList.classList.add('nav-list--open');
      navToggle.setAttribute('aria-expanded', 'true');
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) closeMenu();
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });
}

function setupSmoothScroll() {
  if (prefersReducedMotion) return;

  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#' || href === '#main-content') return;
      
      e.preventDefault();
      const target = document.querySelector(href);
      
      if (target) {
        const headerOffset = 80;
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

function setupAccessibility() {
  document.querySelectorAll('a[target="_blank"]').forEach(link => {
    if (!link.getAttribute('rel')) {
      link.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

async function init() {
  const data = await loadContent();
  
  if (data) {
    populateBasicContent(data);
    populateSkills(data);
    populateProjects(data);
    populateExperience(data);
  }
  
  setupNavigation();
  setupSmoothScroll();
  setupAccessibility();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
