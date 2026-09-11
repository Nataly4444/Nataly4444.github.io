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

  const headFrag = document.createDocumentFragment();
  cards.forEach(card => {
    const clone = card.cloneNode(true);
    clone.classList.add('skill-category-clone');
    headFrag.appendChild(clone);
  });
  grid.insertBefore(headFrag, grid.firstChild);

  cards.forEach(card => {
    const clone = card.cloneNode(true);
    clone.classList.add('skill-category-clone');
    grid.appendChild(clone);
  });

  const allCards = grid.querySelectorAll('.skill-category');
  const origOffset = cardCount;
  const dupOffset = cardCount * 2;

  function contentScrollLeftForCard(card) {
    return card.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft;
  }

  let loopWidth = 0;
  let dupAlignScroll = 0;
  let loopStartScroll = 0;

  function refreshLoopMetrics() {
    const firstOrig = allCards[origOffset];
    const dup = allCards[dupOffset];
    const loopHead = allCards[0];
    if (!firstOrig || !dup || !loopHead) return;
    loopStartScroll = contentScrollLeftForCard(loopHead);
    const home = contentScrollLeftForCard(firstOrig);
    const dupPos = contentScrollLeftForCard(dup);
    const w = dupPos - home;
    if (w > 1) {
      loopWidth = w;
      dupAlignScroll = dupPos;
    }
  }

  function normalizeCarouselScrollPosition() {
    if (loopWidth <= 0) return;
    const prevBeh = track.style.scrollBehavior;
    track.style.scrollBehavior = 'auto';
    let guard = 0;
    while (track.scrollLeft >= dupAlignScroll - 0.5 && guard < 48) {
      track.scrollLeft -= loopWidth;
      guard += 1;
    }
    guard = 0;
    while (track.scrollLeft <= loopStartScroll + 0.5 && guard < 48) {
      track.scrollLeft += loopWidth;
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
    const targetCard = useClone ? allCards[dupOffset + index] : allCards[origOffset + index];
    if (!targetCard) return;
    const left = contentScrollLeftForCard(targetCard);
    track.scrollTo({ left, behavior });
  }

  function updateCurrentIndexFromScroll() {
    const sl = track.scrollLeft;
    let closest = 0;
    let minDist = Infinity;
    for (let i = 0; i < cardCount; i++) {
      const dist = Math.abs(contentScrollLeftForCard(allCards[origOffset + i]) - sl);
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
      if (!isAutoScrolling && loopWidth > 0 && (track.scrollLeft >= dupAlignScroll - 1 || track.scrollLeft <= loopStartScroll + 1)) {
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
    refreshLoopMetrics();
    let next = track.scrollLeft + e.deltaY;
    if (loopWidth > 0) {
      let guard = 0;
      while (next < loopStartScroll - 0.5 && guard < 48) {
        next += loopWidth;
        guard += 1;
      }
      guard = 0;
      while (next >= dupAlignScroll - 0.5 && guard < 48) {
        next -= loopWidth;
        guard += 1;
      }
    }
    track.scrollLeft = next;
  }, { passive: false });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      refreshLoopMetrics();
      const firstOrig = allCards[origOffset];
      if (firstOrig && loopWidth > 0) {
        track.style.scrollBehavior = 'auto';
        track.scrollLeft = contentScrollLeftForCard(firstOrig);
        track.style.scrollBehavior = '';
        refreshLoopMetrics();
      }
      if (!prefersReducedMotion) startAutoScroll();
    });
  });
}


let lastProjectModalTrigger = null;
let projectsData = [];
let projectCardEventsBound = false;

const PROJECT_LINK_LABELS = {
  demo: 'Live Demo',
  github: 'Code',
  caseStudy: 'Case Study'
};

function isValidLink(url) {
  return url && url !== '#' && String(url).trim() !== '';
}

function renderProjectLinks(links, className = 'project-link') {
  if (!links) return '';
  return Object.entries(links)
    .filter(([type, url]) => isValidLink(url) && PROJECT_LINK_LABELS[type])
    .map(([type, url]) => `
      <a href="${url}" class="${className}" target="_blank" rel="noopener noreferrer">
        ${PROJECT_LINK_LABELS[type]}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M3 3L13 13M13 13V5M13 13H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </a>
    `).join('');
}

function renderProjectListSection(title, items, className = 'project-list-section') {
  if (!Array.isArray(items) || items.length === 0) return '';

  return `
    <div class="${className}">
      ${title ? `<h4 class="project-list-section-title">${title}</h4>` : ''}
      <ul class="project-list-section-list">
        ${items.map(item => `<li class="project-list-section-item">${item}</li>`).join('')}
      </ul>
    </div>
  `;
}

function renderProjectCard(project) {
  const hasScreenshots = Array.isArray(project.screenshots) && project.screenshots.length > 0;
  const linksHtml = renderProjectLinks(project.links);
  const businessValueHtml = renderProjectListSection('', project.businessValue);

  const previewButton = hasScreenshots
    ? `<button class="project-link project-link-button" type="button" data-action="view-preview" data-project-id="${project.id}">Preview</button>`
    : '';

  return `
    <article class="project-card">
      <div class="project-card-top">
        <span class="project-category">${project.category}</span>
        ${project.role ? `<span class="project-status">${project.role}</span>` : ''}
        ${project.status ? `<span class="project-status">${project.status}</span>` : ''}
      </div>

      <h3 class="project-title">${project.title}</h3>

      <p class="project-description">${project.description}</p>

      ${businessValueHtml}

      <div class="project-stack">
        ${(project.stack || []).map(tech => `<span class="project-tech">${tech}</span>`).join('')}
      </div>

      <div class="project-links">
        ${previewButton}
        ${linksHtml}
      </div>
    </article>
  `;
}

function renderProjectModalContent(project) {
  const hasScreenshots = Array.isArray(project.screenshots) && project.screenshots.length > 0;
  const linksHtml = renderProjectLinks(project.links, 'project-link project-modal-link');
  const businessValueHtml = renderProjectListSection(
    '',
    project.businessValue,
    'project-modal-section project-list-section'
  );
  const featuresHtml = renderProjectListSection(
    'Features',
    project.features,
    'project-modal-section project-list-section'
  );

  const screenshotsHtml = hasScreenshots
    ? `
      <div class="project-modal-screenshots" id="project-modal-screenshots">
        <div class="project-screenshots-header">
          <h4 class="project-modal-section-title">Screenshots</h4>
          <div class="project-screenshots-nav">
            <button class="project-screenshots-nav-btn" type="button" data-action="screenshots-prev" aria-label="Previous screenshot">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M11.25 14.25L6.75 9L11.25 3.75" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button class="project-screenshots-nav-btn" type="button" data-action="screenshots-next" aria-label="Next screenshot">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M6.75 3.75L11.25 9L6.75 14.25" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="project-screenshots-track" tabindex="0" role="region" aria-label="Project screenshots">
          <div class="project-screenshots-row">
            ${project.screenshots.map(shot => `
              <figure class="project-modal-image">
                <img src="${shot.src}" alt="${shot.alt || ''}" loading="lazy" draggable="false" />
                ${shot.caption ? `<figcaption class="project-modal-caption">${shot.caption}</figcaption>` : ''}
              </figure>
            `).join('')}
          </div>
        </div>
      </div>
    `
    : '';

  return `
    <div class="project-modal-overlay">
      <div class="project-modal" role="dialog" aria-modal="true" aria-labelledby="project-modal-title" tabindex="-1">
        <div class="project-modal-header">
          <div class="project-modal-header-text">
            <div class="project-card-top">
              <span class="project-category">${project.category}</span>
              ${project.role ? `<span class="project-status">${project.role}</span>` : ''}
              ${project.status ? `<span class="project-status">${project.status}</span>` : ''}
            </div>
            <h3 id="project-modal-title" class="project-modal-title">${project.title}</h3>
          </div>
          <button class="project-modal-close" type="button" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="project-modal-body">
          <p class="project-modal-description">${project.description}</p>

          ${businessValueHtml}

          ${featuresHtml}

          <div class="project-modal-section">
            <h4 class="project-modal-section-title">Stack</h4>
            <div class="project-stack">
              ${(project.stack || []).map(tech => `<span class="project-tech">${tech}</span>`).join('')}
            </div>
          </div>

          ${screenshotsHtml}

          ${linksHtml ? `<div class="project-modal-links">${linksHtml}</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

function getScreenshotScrollStep(track) {
  const slide = track.querySelector('.project-modal-image');
  if (!slide) return track.clientWidth * 0.85;
  const row = track.querySelector('.project-screenshots-row');
  const gap = row ? parseFloat(getComputedStyle(row).gap) || 16 : 16;
  return slide.offsetWidth + gap;
}

function scrollScreenshotTrack(track, direction) {
  track.scrollBy({
    left: getScreenshotScrollStep(track) * direction,
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
  });
}

function closeScreenshotLightbox() {
  const root = document.getElementById('project-modal-root');
  if (!root) return;
  const lightbox = root.querySelector('.screenshot-lightbox');
  if (lightbox) lightbox.remove();
}

function openScreenshotLightbox(src, alt) {
  const root = document.getElementById('project-modal-root');
  if (!root || !src) return;

  closeScreenshotLightbox();

  const lightbox = document.createElement('div');
  lightbox.className = 'screenshot-lightbox';
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', alt || 'Screenshot preview');
  lightbox.innerHTML = `
    <button class="screenshot-lightbox-close" type="button" aria-label="Close preview">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </button>
    <img src="${src}" alt="${alt || ''}" draggable="false" />
  `;
  root.appendChild(lightbox);

  const closeBtn = lightbox.querySelector('.screenshot-lightbox-close');
  if (closeBtn) closeBtn.focus();
}

function setupScreenshotCarousel(root) {
  const track = root.querySelector('.project-screenshots-track');
  if (!track) return;

  let isDragging = false;
  let dragDistance = 0;
  let startX = 0;
  let startScrollLeft = 0;

  const onMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    dragDistance = Math.max(dragDistance, Math.abs(startX - e.pageX));
    track.scrollLeft = startScrollLeft + (startX - e.pageX);
  };

  const stopDragging = () => {
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove('is-dragging');
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', stopDragging);
  };

  track.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || e.target.closest('.project-screenshots-nav-btn')) return;
    isDragging = true;
    dragDistance = 0;
    startX = e.pageX;
    startScrollLeft = track.scrollLeft;
    track.classList.add('is-dragging');
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', stopDragging);
  });

  track.addEventListener('click', (e) => {
    if (dragDistance > 6) return;
    const img = e.target.closest('.project-modal-image img');
    if (!img) return;
    openScreenshotLightbox(img.getAttribute('src'), img.getAttribute('alt') || '');
  });

  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      scrollScreenshotTrack(track, -1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      scrollScreenshotTrack(track, 1);
    }
  });
}

function renderProjectModal(project) {
  const root = document.getElementById('project-modal-root');
  if (!root) return;
  root.innerHTML = renderProjectModalContent(project);
}

function closeProjectModal() {
  const root = document.getElementById('project-modal-root');
  if (!root) return;

  closeScreenshotLightbox();
  root.innerHTML = '';
  document.body.classList.remove('modal-open');

  if (lastProjectModalTrigger) {
    lastProjectModalTrigger.focus();
    lastProjectModalTrigger = null;
  }
}

function openProjectModal(project, triggerElement, scrollToScreenshots = false) {
  const root = document.getElementById('project-modal-root');
  if (!root || !project) return;

  lastProjectModalTrigger = triggerElement;
  renderProjectModal(project);
  setupScreenshotCarousel(root);
  document.body.classList.add('modal-open');

  const closeBtn = root.querySelector('.project-modal-close');
  if (closeBtn) closeBtn.focus();

  if (scrollToScreenshots) {
    const screenshots = root.querySelector('#project-modal-screenshots');
    if (screenshots) {
      requestAnimationFrame(() => {
        screenshots.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      });
    }
  }
}

function setupProjectModalEvents() {
  const root = document.getElementById('project-modal-root');
  if (!root) return;

  root.addEventListener('click', (e) => {
    if (e.target.closest('.screenshot-lightbox-close') || e.target.classList.contains('screenshot-lightbox')) {
      closeScreenshotLightbox();
      return;
    }
    if (e.target.classList.contains('project-modal-overlay')) {
      closeProjectModal();
    }
    if (e.target.closest('.project-modal-close')) {
      closeProjectModal();
    }
    if (e.target.closest('[data-action="screenshots-prev"]')) {
      const track = root.querySelector('.project-screenshots-track');
      if (track) scrollScreenshotTrack(track, -1);
    }
    if (e.target.closest('[data-action="screenshots-next"]')) {
      const track = root.querySelector('.project-screenshots-track');
      if (track) scrollScreenshotTrack(track, 1);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (root.querySelector('.screenshot-lightbox')) {
      closeScreenshotLightbox();
      return;
    }
    if (root.querySelector('.project-modal-overlay')) {
      closeProjectModal();
    }
  });
}

function setupProjectCardEvents() {
  const projectsContainer = document.querySelector('[data-projects]');
  if (!projectsContainer || projectCardEventsBound) return;

  projectCardEventsBound = true;
  projectsContainer.addEventListener('click', (e) => {
    const button = e.target.closest('[data-action]');
    if (!button) return;

    const projectId = button.getAttribute('data-project-id');
    const project = projectsData.find(p => p.id === projectId);
    if (!project) return;

    const action = button.getAttribute('data-action');
    if (action === 'view-details') {
      openProjectModal(project, button);
    } else if (action === 'view-preview') {
      openProjectModal(project, button, true);
    }
  });
}

function populateProjects(data) {
  const projectsContainer = document.querySelector('[data-projects]');
  if (!projectsContainer || !data.projects) return;

  projectsData = data.projects;
  projectsContainer.innerHTML = data.projects.map(renderProjectCard).join('');
  setupProjectCardEvents();
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
  setupProjectModalEvents();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
