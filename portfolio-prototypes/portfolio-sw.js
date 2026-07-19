const BUILD_REV = '40b4273b77eb';
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
