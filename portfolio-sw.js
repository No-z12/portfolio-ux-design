const BUILD_REV = '0f6f0905545f';
const CACHE_PREFIX = 'portfolio-runtime-';
const CACHE_NAME = `${CACHE_PREFIX}${BUILD_REV}`;

self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      'navigationPreload' in self.registration
        ? self.registration.navigationPreload.enable().catch(() => {})
        : Promise.resolve(),
      caches.keys().then(keys => Promise.all(
        keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
    ])
  );
});

self.addEventListener('message', event => {
  if (event.data?.type !== 'PURGE_DOCUMENT') return;
  let pathname = '';
  try {
    const url = new URL(event.data.url, self.location.origin);
    if (url.origin !== self.location.origin) return;
    pathname = url.pathname;
  } catch (_) {
    return;
  }

  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith(CACHE_PREFIX)).map(async key => {
        const cache = await caches.open(key);
        const requests = await cache.keys();
        await Promise.all(requests
          .filter(request => new URL(request.url).pathname === pathname)
          .map(request => cache.delete(request)));
      })
    )).catch(() => {})
  );
});

const networkFirst = async (request, preloadResponsePromise) => {
  try {
    let response;
    if (preloadResponsePromise) {
      try { response = await preloadResponsePromise; } catch (_) {}
    }
    if (!response) response = await fetch(request);
    return {
      response,
      cacheCopy: response.ok ? response.clone() : null,
      cache: null
    };
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return { response: cached, cacheCopy: null, cache };
    throw error;
  }
};

const cacheFirstHashed = async request => {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return { response: cached, cacheCopy: null, cache };
  const response = await fetch(request);
  return {
    response,
    cacheCopy: response.ok ? response.clone() : null,
    cache
  };
};

const respondWithBackgroundCache = (event, request, resolution) => {
  event.waitUntil(
    resolution.then(async ({ cacheCopy, cache }) => {
      if (!cacheCopy) return;
      const targetCache = cache || await caches.open(CACHE_NAME);
      await targetCache.put(request, cacheCopy);
    }).catch(() => {})
  );
  event.respondWith(resolution.then(({ response }) => response));
};

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    respondWithBackgroundCache(event, request, networkFirst(request, event.preloadResponse));
    return;
  }

  if (request.destination === 'document') {
    respondWithBackgroundCache(event, request, networkFirst(request, null));
    return;
  }

  const isLanyardRuntimeImage = request.destination === 'image' &&
    /\/assets\/lanyard\/(?:lanyard-poster|profile-portrait|wechat-contact-qr)[^/]*\.png$/i.test(url.pathname);
  if (isLanyardRuntimeImage) {
    respondWithBackgroundCache(event, request, cacheFirstHashed(request));
    return;
  }

  /* Large artwork deliberately stays in the browser HTTP cache. */
  if (/\.(?:png|jpe?g|gif|webp|avif|mp4|webm)$/i.test(url.pathname)) return;

  const looksHashed = /[.-][a-f0-9]{8,}(?:\.|$)/i.test(url.pathname);
  const hasCurrentRevision = url.searchParams.get('v') === BUILD_REV;
  if ((looksHashed || hasCurrentRevision) && ['script', 'style', 'font'].includes(request.destination)) {
    respondWithBackgroundCache(event, request, cacheFirstHashed(request));
    return;
  }

  if (['script', 'style', 'font'].includes(request.destination)) {
    respondWithBackgroundCache(event, request, networkFirst(request, null));
  }
});
