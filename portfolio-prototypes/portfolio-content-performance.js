(() => {
  const fileName = decodeURIComponent(location.pathname.split('/').pop() || '');
  const configs = {
    'portfolio-project2-ai-agent.html': {
      key: 'project2',
      prototypeSelector: '.interactive .frame'
    },
    'portfolio-project3-vibe-coding.html': {
      key: 'project3',
      prototypeSelector: ''
    },
    'portfolio-project4-appendix.html': {
      key: 'project4',
      prototypeSelector: '.prototype-demo .frame'
    }
  };
  const config = configs[fileName];
  if (!config) return;

  const pages = [...document.querySelectorAll('.page')];
  if (!pages.length) return;

  const WINDOW_SIZE = 5;
  const RELEASE_DELAY = 1600;
  const FIGMA_FILL_SCALE = 1.15;
  const responsiveSizes = '(max-width: 650px) 100vw, (max-width: 1050px) calc(100vw - 28px), (max-width: 1380px) calc(100vw - 142px), (max-width: 1566px) calc(100vw - 286px), 1280px';
  const mediaByPage = new Map();
  const releaseTimers = new Map();
  let intentPage = 1;
  let scrollDirection = 1;
  let protectedMedia = new Set();

  const displayPageOf = page => Number(page?.id?.replace(/^p/i, '')) || 1;
  const placeholderFor = image => {
    const width = Math.max(1, Number(image.getAttribute('width')) || 16);
    const height = Math.max(1, Number(image.getAttribute('height')) || 9);
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}'/%3E`;
  };

  pages.forEach(page => {
    const images = [
      ...page.querySelectorAll('.frame > img.static-frame[data-responsive-src], .static-frame-tiles img[data-responsive-src]')
    ];
    if (!images.length) return;
    mediaByPage.set(displayPageOf(page), images);
    images.forEach(image => {
      image.dataset.decodeActive = 'false';
      image.dataset.portfolioPlaceholder = placeholderFor(image);
    });
  });

  const cancelRelease = image => {
    const timer = releaseTimers.get(image);
    if (timer) clearTimeout(timer);
    releaseTimers.delete(image);
  };

  const activateImage = (image, isCurrent, isTileGroup) => {
    if (!image) return;
    cancelRelease(image);
    const wasActive = image.dataset.decodeActive === 'true';
    image.dataset.decodeActive = 'true';
    image.loading = isTileGroup ? 'lazy' : 'eager';
    image.fetchPriority = isCurrent && !isTileGroup ? 'auto' : 'low';
    if (image.dataset.fullSourceActive === 'true') return;
    if (wasActive && !image.getAttribute('src')?.startsWith('data:image/')) return;
    if (image.dataset.responsiveSizes) image.setAttribute('sizes', image.dataset.responsiveSizes);
    if (image.dataset.responsiveSrcset) image.setAttribute('srcset', image.dataset.responsiveSrcset);
    if (image.dataset.responsiveSrc && image.getAttribute('src') !== image.dataset.responsiveSrc) {
      image.src = image.dataset.responsiveSrc;
    }
    const decode = () => {
      if (image.dataset.decodeActive !== 'true' || typeof image.decode !== 'function') return;
      image.decode().catch(() => {});
    };
    if (image.complete && image.naturalWidth) decode();
    else image.addEventListener('load', decode, { once: true });
  };

  const activatePageMedia = (images, isCurrent) => {
    const isTileGroup = images.length > 1 && images[0]?.closest('.static-frame-tiles');
    images.forEach(image => activateImage(image, isCurrent, Boolean(isTileGroup)));
  };

  const releaseImage = image => {
    if (!image || protectedMedia.has(image)) return;
    const frame = image.closest('.frame');
    if (frame?.classList.contains('is-expanded') || image.dataset.fullSourceActive === 'true') {
      scheduleRelease(image);
      return;
    }
    image._fullSourceRequest = (image._fullSourceRequest || 0) + 1;
    image.removeAttribute('srcset');
    image.removeAttribute('sizes');
    image.loading = 'lazy';
    image.fetchPriority = 'low';
    image.src = image.dataset.portfolioPlaceholder;
    image.dataset.decodeActive = 'false';
    releaseTimers.delete(image);
  };

  function scheduleRelease(image) {
    if (!image || protectedMedia.has(image) || releaseTimers.has(image)) return;
    releaseTimers.set(image, setTimeout(() => releaseImage(image), RELEASE_DELAY));
  }

  const windowPages = (page, direction = scrollDirection) => {
    const total = pages.length;
    const maxStart = Math.max(1, total - WINDOW_SIZE + 1);
    const preferredStart = direction >= 0 ? page - 1 : page - 3;
    const start = Math.max(1, Math.min(maxStart, preferredStart));
    return Array.from({ length: Math.min(WINDOW_SIZE, total) }, (_, index) => start + index);
  };

  const setIntent = (page, direction, releaseImmediately = false) => {
    if (!Number.isFinite(page)) return;
    const nextPage = Math.max(1, Math.min(pages.length, page));
    const inferredDirection = direction || (nextPage === intentPage ? scrollDirection : nextPage > intentPage ? 1 : -1);
    intentPage = nextPage;
    scrollDirection = inferredDirection;
    const activePages = windowPages(intentPage, inferredDirection);
    protectedMedia = new Set(activePages.flatMap(activePage => mediaByPage.get(activePage) || []));
    mediaByPage.forEach((images, displayPage) => {
      if (activePages.includes(displayPage)) activatePageMedia(images, displayPage === intentPage);
      else images.forEach(image => releaseImmediately ? releaseImage(image) : scheduleRelease(image));
    });
    document.documentElement.dataset[`${config.key}ImageWindow`] = activePages.join(',');
  };

  const pageFromHash = hash => {
    const match = /^#p(\d+)$/i.exec(hash || '');
    if (match) return Number(match[1]);
    if (!hash || hash === '#top') return 1;
    const target = document.querySelector(hash);
    if (!target) return null;
    if (target.classList.contains('page')) return displayPageOf(target);
    let next = target.nextElementSibling;
    while (next && !next.classList.contains('page')) next = next.nextElementSibling;
    return next ? displayPageOf(next) : null;
  };

  intentPage = pageFromHash(location.hash) || 1;
  setIntent(intentPage, 1, true);

  const focusObserver = new IntersectionObserver(entries => {
    const current = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => Math.abs(a.boundingClientRect.top - innerHeight * .4) - Math.abs(b.boundingClientRect.top - innerHeight * .4))[0];
    if (!current) return;
    const displayPage = displayPageOf(current.target);
    setIntent(displayPage, displayPage === intentPage ? scrollDirection : displayPage > intentPage ? 1 : -1);
  }, { rootMargin: '-34% 0px -55%', threshold: 0 });
  pages.forEach(page => focusObserver.observe(page));

  const warmAnchor = event => {
    const anchor = event.target.closest?.('a[href^="#"]');
    if (!anchor) return;
    const page = pageFromHash(anchor.getAttribute('href'));
    if (!page) return;
    setIntent(page, page >= intentPage ? 1 : -1);
  };
  document.addEventListener('pointerdown', warmAnchor, { passive: true });
  document.addEventListener('focusin', warmAnchor);

  /* Capture lightbox intent before each page's existing click handler runs.
     This guarantees that an offscreen poster is restored before arrow-nav. */
  document.addEventListener('click', event => {
    const control = event.target.closest?.('.frame-expand');
    if (!control) return;
    const frame = control.closest('.frame');
    const page = frame?.closest('.page');
    if (!frame || !page) return;
    const displayPage = displayPageOf(page);
    setIntent(displayPage, displayPage >= intentPage ? 1 : -1);
    if (frame.dataset.portfolioPrototype === 'true') {
      const mountPrototype = config.key === 'project2'
        ? window.mountManagedPrototype
        : window.mountPrototype;
      if (typeof mountPrototype === 'function') mountPrototype(frame);
    }
    if (!frame.classList.contains('is-expanded')) {
      const inlineWidth = Math.max(1, frame.getBoundingClientRect().width);
      frame.style.setProperty('--lightbox-target-width', `${Math.min(1920, Math.round(inlineWidth * 1.5))}px`);
    }
  }, true);

  const apiName = `__${config.key.toUpperCase()}_IMAGE_WINDOW__`;
  window[apiName] = {
    size: WINDOW_SIZE,
    activePages: () => [...mediaByPage.entries()]
      .filter(([, images]) => images.some(image => image.dataset.decodeActive === 'true'))
      .map(([page]) => page),
    setIntent
  };

  const prototypeFrames = config.prototypeSelector
    ? [...document.querySelectorAll(config.prototypeSelector)]
    : [];
  const syncPrototypeCanvas = frame => {
    const width = frame.clientWidth;
    const height = frame.clientHeight;
    if (!width || !height) return;
    const scale = width / 1920 * FIGMA_FILL_SCALE;
    frame.style.setProperty('--prototype-canvas-scale', String(scale));
    frame.style.setProperty('--prototype-canvas-left', `${(width - 1920 * scale) / 2}px`);
    frame.style.setProperty('--prototype-canvas-top', `${(height - 1080 * scale) / 2}px`);
  };
  prototypeFrames.forEach(frame => {
    frame.dataset.portfolioPrototype = 'true';
    frame.dataset.lightboxNavigable = 'true';
    syncPrototypeCanvas(frame);
  });
  if (prototypeFrames.length && 'ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(entries => entries.forEach(entry => syncPrototypeCanvas(entry.target)));
    prototypeFrames.forEach(frame => resizeObserver.observe(frame));
  } else if (prototypeFrames.length) {
    addEventListener('resize', () => prototypeFrames.forEach(syncPrototypeCanvas), { passive: true });
  }

  addEventListener('pageshow', () => {
    setIntent(intentPage, scrollDirection, true);
    prototypeFrames.forEach(syncPrototypeCanvas);
  });
})();
