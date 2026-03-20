const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

async function loadContent() {
  try {
    const response = await fetch('/content.json');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to load content:', error);
    return null;
  }
}

function populateBasicContent(data) {
  document.querySelectorAll('[data-content]').forEach(el => {
    const key = el.getAttribute('data-content');
    if (data[key]) {
      el.textContent = data[key];
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
      el.href = data.contacts[key];
    }
  });

  const yearEl = document.querySelector('[data-year]');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

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

  function getOriginalSetWidth() {
    return allCards[cardCount]?.offsetLeft ?? 0;
  }

  let currentIndex = 0;
  let autoScrollTimer = null;
  const INTERVAL = 2000;
  let isAutoScrolling = false;

  function scrollToIndex(index, useClone = false, behavior = 'smooth') {
    if (index >= cardCount) index = 0;
    if (index < 0) index = cardCount - 1;
    currentIndex = index;
    const targetCard = useClone ? allCards[cardCount + index] : allCards[index];
    const offset = targetCard ? targetCard.offsetLeft : 0;
    track.scrollTo({ left: offset, behavior });
  }

  function getVirtualScrollLeft() {
    const setWidth = getOriginalSetWidth();
    let virtualLeft = track.scrollLeft;
    if (setWidth > 0 && virtualLeft >= setWidth) virtualLeft -= setWidth;
    return { virtualLeft, setWidth };
  }

  function updateCurrentIndexFromScroll() {
    const { virtualLeft } = getVirtualScrollLeft();
    let closest = 0;
    let minDist = Infinity;
    for (let i = 0; i < cardCount; i++) {
      const card = allCards[i];
      const dist = Math.abs(card.offsetLeft - virtualLeft);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    }
    currentIndex = closest;
  }

  function startAutoScroll() {
    stopAutoScroll();
    autoScrollTimer = setInterval(() => {
      updateCurrentIndexFromScroll();
      const setWidth = getOriginalSetWidth();
      if (setWidth <= 0) return;

      const inCloneSet = track.scrollLeft >= setWidth - 1;
      const currentAbsIndex = currentIndex + (inCloneSet ? cardCount : 0);
      const nextAbsIndex = currentAbsIndex + 1;
      const nextIndex = nextAbsIndex % cardCount;
      const nextUseClone = nextAbsIndex >= cardCount;

      isAutoScrolling = true;
      scrollToIndex(nextIndex, nextUseClone, 'smooth');
      setTimeout(() => { isAutoScrolling = false; }, 500);
    }, INTERVAL);
  }

  function stopAutoScroll() {
    if (autoScrollTimer) {
      clearInterval(autoScrollTimer);
      autoScrollTimer = null;
    }
    isAutoScrolling = false;
  }

  let userScrollTimeout = null;
  function onUserScroll() {
    stopAutoScroll();
    if (userScrollTimeout) clearTimeout(userScrollTimeout);
    userScrollTimeout = setTimeout(() => {
      userScrollTimeout = null;
      startAutoScroll();
    }, 3000);
  }

  track.addEventListener('scroll', () => {
    updateCurrentIndexFromScroll();
  });

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
    isDragging = true;
    startX = e.pageX;
    startScrollLeft = track.scrollLeft;
    track.style.cursor = 'grabbing';
    track.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    onUserScroll();
  });

  track.addEventListener('touchstart', onUserScroll, { passive: true });

  track.addEventListener('wheel', (e) => {
    if (e.deltaY === 0) return;
    if (track.scrollWidth <= track.clientWidth) return;

    onUserScroll();

    e.preventDefault();
    track.scrollLeft += e.deltaY;
  }, { passive: false });

  requestAnimationFrame(() => {
    requestAnimationFrame(startAutoScroll);
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

  navToggle.addEventListener('click', () => {
    const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', !isExpanded);
    
    if (window.innerWidth < 768) {
      if (!isExpanded) {
        navList.style.display = 'flex';
        navList.style.position = 'absolute';
        navList.style.top = '4rem';
        navList.style.left = '0';
        navList.style.right = '0';
        navList.style.flexDirection = 'column';
        navList.style.background = 'rgba(11, 11, 13, 0.95)';
        navList.style.backdropFilter = 'blur(12px)';
        navList.style.padding = '1.5rem';
        navList.style.borderBottom = '1px solid rgba(255, 255, 255, 0.08)';
      } else {
        navList.style.display = 'none';
      }
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
      navList.style.display = 'flex';
      navList.style.position = 'static';
      navList.style.flexDirection = 'row';
      navList.style.background = 'none';
      navList.style.padding = '0';
      navList.style.borderBottom = 'none';
      navToggle.setAttribute('aria-expanded', 'false');
    } else {
      navList.style.display = 'none';
    }
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 768) {
        navList.style.display = 'none';
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
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
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

function showToast(message, duration = 3000) {
  const toast = document.querySelector('[data-toast]');
  const toastMessage = document.querySelector('[data-toast-message]');
  
  if (!toast || !toastMessage) return;
  
  toastMessage.textContent = message;
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

function setupCopyEmail() {
  const copyButton = document.querySelector('[data-copy-email]');
  if (!copyButton) return;

  copyButton.addEventListener('click', async () => {
    const emailElement = document.querySelector('[data-contact="email"]');
    if (!emailElement) return;

    const email = emailElement.textContent;
    
    try {
      await navigator.clipboard.writeText(email);
      showToast('Email copied to clipboard!');
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = email;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      
      try {
        document.execCommand('copy');
        showToast('Email copied to clipboard!');
      } catch (err) {
        showToast('Failed to copy email');
      }
      
      document.body.removeChild(textArea);
    }
  });
}

function setupAccessibility() {
  document.querySelectorAll('a[target="_blank"]').forEach(link => {
    if (!link.getAttribute('rel')) {
      link.setAttribute('rel', 'noopener noreferrer');
    }
  });

  const focusableElements = document.querySelectorAll(
    'a, button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])'
  );
  
  focusableElements.forEach(el => {
    el.addEventListener('focus', () => {
      if (el.classList && el.classList.contains('nav-link')) {
        el.style.outline = 'none';
        el.style.outlineOffset = '';
        return;
      }

      el.style.outline = '2px solid rgba(255, 255, 255, 0.95)';
      el.style.outlineOffset = '2px';
    });
    
    el.addEventListener('blur', () => {
      el.style.outline = '';
      el.style.outlineOffset = '';
    });
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
  setupCopyEmail();
  setupAccessibility();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
