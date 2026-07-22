(() => {
  const PROJECT_PAGE_PATTERN = /\/portfolio-project(?:1-saas|2-ai-agent|3-vibe-coding|4-appendix)\.html$/i;
  const HOME_PAGE_PATTERN = /\/(?:index\.html|portfolio-home-v2-editorial\.html)?$/i;
  const RESUME_PAGE_PATTERN = /\/portfolio-resume\.html$/i;
  const isProjectPage = url => PROJECT_PAGE_PATTERN.test(url.pathname);
  const isPortfolioPage = url => isProjectPage(url) || HOME_PAGE_PATTERN.test(url.pathname) || RESUME_PAGE_PATTERN.test(url.pathname);

  // Each portfolio document owns a large, independent media surface. Keeping the
  // previous document in the back/forward cache would make it compete with the next
  // page for decoded-image, iframe and GPU memory, so portfolio documents are
  // intentionally disposable after navigation.
  if (isPortfolioPage(location)) addEventListener('unload', () => {});

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const style = document.createElement('style');
  style.textContent = `
    .portfolio-transition-layer{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;pointer-events:none;opacity:0;background:rgba(233,237,243,.88);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}
    .portfolio-transition-skeleton{width:min(420px,72vw);padding:28px;border:1px solid rgba(17,18,20,.09);border-radius:16px;background:rgba(255,255,255,.52)}
    .portfolio-transition-line{position:relative;height:10px;margin-top:12px;overflow:hidden;border-radius:999px;background:rgba(17,18,20,.075)}
    .portfolio-transition-line:first-child{width:34%;height:8px;margin-top:0}.portfolio-transition-line:nth-child(2){width:78%;height:17px;margin-top:22px}.portfolio-transition-line:nth-child(3){width:56%}
    .portfolio-transition-line::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.7),transparent);transform:translateX(-110%);animation:portfolio-skeleton-shimmer 1.1s ease-in-out infinite;animation-play-state:paused}
    .portfolio-transition-layer.is-active .portfolio-transition-line::after{animation-play-state:running}
    html.portfolio-releasing .portfolio-transition-layer{background:#e9edf3;backdrop-filter:none;-webkit-backdrop-filter:none}
    html.portfolio-releasing body *:not(.portfolio-transition-layer):not(.portfolio-transition-layer *){background-image:none!important;animation:none!important;transition:none!important}
    @keyframes portfolio-skeleton-shimmer{to{transform:translateX(110%)}}
  `;
  document.head.appendChild(style);

  const layer = document.createElement('div');
  layer.className = 'portfolio-transition-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = '<div class="portfolio-transition-skeleton"><div class="portfolio-transition-line"></div><div class="portfolio-transition-line"></div><div class="portfolio-transition-line"></div></div>';
  document.body.appendChild(layer);
  let leaving = false;
  let resourcesReleased = false;
  const EMPTY_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
  const rememberCurrentDocument = () => {
    if (!isPortfolioPage(location)) return;
    try { sessionStorage.setItem('portfolio-previous-document', location.pathname); } catch (_) {}
  };

  const resetTransition = () => {
    resourcesReleased = false;
    window.__PORTFOLIO_RELEASING__ = false;
    document.documentElement.classList.remove('portfolio-releasing');
    leaving = false;
    layer.classList.remove('is-active');
    layer.getAnimations().forEach(animation => animation.cancel());
    layer.firstElementChild.getAnimations().forEach(animation => animation.cancel());
    layer.style.opacity = '0';
    document.documentElement.style.pointerEvents = '';
  };

  if (!reduceMotion) {
    document.body.animate([
      { opacity: .82 },
      { opacity: 1 }
    ], { duration: 340, easing: 'ease-out', fill: 'both' });
  }

  const releasePortfolioResources = () => {
    if (resourcesReleased) return;
    resourcesReleased = true;
    window.__PORTFOLIO_RELEASING__ = true;
    document.documentElement.classList.add('portfolio-releasing');
    dispatchEvent(new CustomEvent('portfolio:release'));

    // Stop requests first, then replace or detach resource-backed elements while
    // the opaque transition layer hides the teardown from the reader.
    window.stop();
    document.getAnimations().forEach(animation => animation.cancel());

    document.querySelectorAll('video, audio').forEach(media => {
      media.pause();
      media.removeAttribute('src');
      media.querySelectorAll('source').forEach(source => source.removeAttribute('src'));
      media.load();
    });

    document.querySelectorAll('iframe').forEach(frame => {
      frame.src = 'about:blank';
      frame.removeAttribute('srcdoc');
      frame.remove();
    });

    document.querySelectorAll('canvas').forEach(canvas => {
      try {
        const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
        context?.getExtension('WEBGL_lose_context')?.loseContext();
      } catch (_) {}
      canvas.width = 1;
      canvas.height = 1;
      canvas.remove();
    });

    document.querySelectorAll('picture source').forEach(resource => {
      resource.removeAttribute('srcset');
      resource.removeAttribute('sizes');
    });
    document.querySelectorAll('img').forEach(image => {
      image.removeAttribute('srcset');
      image.removeAttribute('sizes');
      image.src = EMPTY_IMAGE;
    });

    document.querySelectorAll('object, embed').forEach(resource => resource.remove());

    document.querySelectorAll('link[rel="preload"], link[rel="prefetch"], link[rel="modulepreload"]')
      .forEach(link => link.remove());
  };

  const clearCurrentDocumentRuntimeCache = async () => {
    const worker = navigator.serviceWorker?.controller;
    if (worker) {
      worker.postMessage({ type: 'PURGE_DOCUMENT', url: location.href });
      return;
    }

    // Remove only the document being left from this portfolio's Cache Storage.
    // Shared CSS/JS stays warm for the destination project, while the old project
    // itself cannot be restored from the service worker's runtime cache.
    if ('caches' in window) {
      try {
        const cacheNames = (await caches.keys()).filter(name => name.startsWith('portfolio-runtime-'));
        await Promise.all(cacheNames.map(async cacheName => {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          await Promise.all(requests
            .filter(request => new URL(request.url).pathname === location.pathname)
            .map(request => cache.delete(request)));
        }));
      } catch (_) {
        // Cache cleanup is an enhancement; navigation must still complete.
      }
    }
  };

  addEventListener('pagehide', () => {
    if (!isPortfolioPage(location)) return;
    rememberCurrentDocument();
    releasePortfolioResources();
    clearCurrentDocumentRuntimeCache();
  });
  addEventListener('pageshow', event => {
    // Safari may still preserve an unload-registered page in its page cache. A
    // persisted restore must become a clean document load, not a resumed heavy page.
    if (event.persisted && isPortfolioPage(location)) {
      location.reload();
      return;
    }
    resetTransition();
  });
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || leaving || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    const destination = new URL(link.href, location.href);
    if (destination.origin !== location.origin || !destination.pathname.toLowerCase().endsWith('.html')) return;

    const switchingPortfolioPages = isPortfolioPage(location) && isPortfolioPage(destination)
      && destination.pathname !== location.pathname;

    event.preventDefault();
    leaving = true;
    document.documentElement.style.pointerEvents = 'none';
    layer.classList.add('is-active');
    if (!reduceMotion) {
      layer.animate([
        { opacity: 0 },
        { opacity: 1 }
      ], { duration: 280, easing: 'ease-out', fill: 'forwards' });
      layer.firstElementChild.animate([
        { opacity: 0, transform: 'translateY(5px) scale(.99)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
      ], { duration: 320, easing: 'cubic-bezier(.2,.72,.2,1)', fill: 'forwards' });
    } else {
      layer.style.opacity = '1';
    }

    const leaveDelay = reduceMotion ? 0 : 440;
    setTimeout(() => {
      if (switchingPortfolioPages) {
        rememberCurrentDocument();
        releasePortfolioResources();
        clearCurrentDocumentRuntimeCache();
      }
      location.href = destination.href;
    }, leaveDelay);
  });
})();
