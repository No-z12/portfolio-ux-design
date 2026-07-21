(() => {
  const BUILD_REV = '0f6f0905545f';
  const root = document.documentElement;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = Boolean(connection?.saveData);
  const memory = Number(navigator.deviceMemory) || 0;
  const cores = Number(navigator.hardwareConcurrency) || 0;
  const slowNetwork = /(^|-)2g$/.test(connection?.effectiveType || '');
  // Some browsers expose only one of these hints (Safari commonly omits deviceMemory),
  // so either reliable low-end signal is enough to choose the balanced path.
  const constrainedHardware = Boolean((memory && memory <= 4) || (cores && cores <= 4));

  let storedMode = '';
  try { storedMode = localStorage.getItem('portfolio-performance-mode') || ''; } catch (_) {}

  let tier = 'full';
  if (storedMode === 'full' || storedMode === 'balanced' || storedMode === 'lite') {
    tier = storedMode;
  } else if (saveData || slowNetwork || reducedMotion) {
    tier = 'lite';
  } else if (constrainedHardware) {
    tier = 'balanced';
  }

  root.dataset.portfolioTier = tier;
  root.dataset.portfolioSaveData = String(saveData);
  root.dataset.portfolioReducedMotion = String(reducedMotion);

  const detail = Object.freeze({
    buildRev: BUILD_REV,
    tier,
    saveData,
    reducedMotion,
    slowNetwork,
    memory,
    cores,
    isConstrained: tier !== 'full'
  });
  window.PortfolioPerformance = detail;

  addEventListener('pagehide', event => {
    root.classList.add('portfolio-page-suspended');
    document.querySelectorAll('video, audio').forEach(media => media.pause());
    dispatchEvent(new CustomEvent('portfolio:pagehide', { detail: { persisted: event.persisted } }));
  });

  addEventListener('pageshow', event => {
    root.classList.remove('portfolio-page-suspended');
    dispatchEvent(new CustomEvent('portfolio:pageshow', { detail: { persisted: event.persisted } }));
  });

  /* Warm only same-origin HTML on deliberate navigation intent. Large artwork,
     embedded prototypes and the lanyard bundle stay outside this path. */
  const canPrefetchDocuments = /^https?:$/.test(location.protocol) && !saveData && !slowNetwork;
  if (canPrefetchDocuments) {
    const prefetchedDocuments = new Set();
    const currentDocument = new URL(location.href);
    const documentBase = new URL(window.PortfolioDocumentBase || '.', document.baseURI);
    let previousDocumentPath = '';
    try { previousDocumentPath = sessionStorage.getItem('portfolio-previous-document') || ''; } catch (_) {}
    currentDocument.hash = '';

    const appendDocumentPrefetch = rawHref => {
      let target;
      try { target = new URL(rawHref, documentBase); } catch (_) { return; }
      if (target.origin !== location.origin || !/\.html$/i.test(target.pathname)) return;
      target.hash = '';
      if (target.href === currentDocument.href || target.pathname === previousDocumentPath || prefetchedDocuments.has(target.href) || prefetchedDocuments.size >= 4) return;

      prefetchedDocuments.add(target.href);
      const hint = document.createElement('link');
      hint.rel = 'prefetch';
      hint.as = 'document';
      hint.href = target.href;
      hint.fetchPriority = 'low';
      document.head.append(hint);
    };

    const prefetchDocument = anchor => {
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute('download')) return;
      if (anchor.target && anchor.target.toLowerCase() !== '_self') return;
      appendDocumentPrefetch(anchor.href);
    };

    const onNavigationIntent = event => {
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (target) prefetchDocument(target);
    };
    document.addEventListener('pointerover', onNavigationIntent, { passive: true });
    document.addEventListener('pointerdown', onNavigationIntent, { passive: true });
    document.addEventListener('focusin', onNavigationIntent);

    const projectDocuments = [
      'portfolio-project1-saas.html',
      'portfolio-project2-ai-agent.html',
      'portfolio-project3-vibe-coding.html',
      'portfolio-project4-appendix.html'
    ];
    const currentName = decodeURIComponent(location.pathname.split('/').pop() || '');
    const currentIndex = projectDocuments.indexOf(currentName);
    const adjacentDocuments = currentIndex < 0
      ? [projectDocuments[0]]
      : [projectDocuments[currentIndex - 1], projectDocuments[currentIndex + 1]].filter(Boolean);
    const warmAdjacentDocuments = () => {
      if (document.hidden || saveData || slowNetwork) return;
      adjacentDocuments.forEach(appendDocumentPrefetch);
    };
    addEventListener('load', () => {
      if ('requestIdleCallback' in window) requestIdleCallback(warmAdjacentDocuments, { timeout: 2400 });
      else setTimeout(warmAdjacentDocuments, 1600);
    }, { once: true });
  }

  const canRegisterWorker = location.protocol === 'https:' ||
    (location.protocol === 'http:' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1'));
  if (canRegisterWorker && 'serviceWorker' in navigator) {
    addEventListener('load', () => {
      const workerConfig = window.PortfolioServiceWorkerConfig || {};
      navigator.serviceWorker.register(workerConfig.url || './portfolio-sw.js', {
        scope: workerConfig.scope || './',
        updateViaCache: 'none'
      }).catch(() => {});
    }, { once: true });
  }
})();
