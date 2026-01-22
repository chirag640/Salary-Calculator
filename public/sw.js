// Service Worker for PWA support
// Enhanced offline caching strategy

const CACHE_VERSION = "v3";
const STATIC_CACHE = `time-tracker-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `time-tracker-dynamic-${CACHE_VERSION}`;
const API_CACHE = `time-tracker-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `time-tracker-images-${CACHE_VERSION}`;

// Static assets to pre-cache on install
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/logo.png",
  "/history",
  "/profile",
  "/export",
];

// API endpoints to cache for offline access
const CACHEABLE_API_ROUTES = ["/api/profile", "/api/time-entries"];

// Cache size limits
const CACHE_LIMITS = {
  dynamic: 50,
  api: 30,
  images: 30,
};

// Helper: Limit cache size
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    await limitCacheSize(cacheName, maxItems);
  }
}

// Helper: Check if request is API call
function isApiRequest(url) {
  return url.pathname.startsWith("/api/");
}

// Helper: Check if API route should be cached
function isCacheableApi(url) {
  return CACHEABLE_API_ROUTES.some((route) => url.pathname.startsWith(route));
}

// Helper: Check if request is for an image
function isImageRequest(request) {
  const accept = request.headers.get("accept") || "";
  return (
    accept.includes("image") ||
    /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(new URL(request.url).pathname)
  );
}

// Helper: Check if request is for a static asset (JS, CSS, fonts)
function isStaticAsset(url) {
  return (
    /\.(js|css|woff|woff2|ttf|eot)$/i.test(url.pathname) ||
    url.pathname.startsWith("/_next/static/")
  );
}

// Install service worker and cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        // Cache static assets, but don't fail install if some are missing
        return Promise.allSettled(
          STATIC_ASSETS.map((url) => cache.add(url).catch(() => {})),
        );
      })
      .then(() => self.skipWaiting()),
  );
});

// Activate service worker and clean up old caches
self.addEventListener("activate", (event) => {
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE, IMAGE_CACHE];

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => !currentCaches.includes(name))
            .map((name) => caches.delete(name)),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// Fetch strategy based on request type
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip cross-origin requests (except fonts)
  if (url.origin !== location.origin && !url.href.includes("fonts")) return;

  // Handle different request types with appropriate strategies
  if (isApiRequest(url)) {
    // API: Network First with cache fallback
    event.respondWith(handleApiRequest(request, url));
  } else if (isImageRequest(request)) {
    // Images: Cache First with network fallback
    event.respondWith(handleImageRequest(request));
  } else if (isStaticAsset(url)) {
    // Static assets: Stale-While-Revalidate
    event.respondWith(handleStaticAsset(request));
  } else {
    // Pages: Network First with offline fallback
    event.respondWith(handlePageRequest(request));
  }
});

// API Request Handler: Network First
async function handleApiRequest(request, url) {
  try {
    const response = await fetch(request);

    // Only cache successful GET responses for cacheable routes
    if (response.ok && isCacheableApi(url)) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
      limitCacheSize(API_CACHE, CACHE_LIMITS.api);
    }

    return response;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline error response for API
    return new Response(
      JSON.stringify({ error: "Offline", message: "No cached data available" }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

// Image Request Handler: Cache First
async function handleImageRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(IMAGE_CACHE);
      cache.put(request, response.clone());
      limitCacheSize(IMAGE_CACHE, CACHE_LIMITS.images);
    }
    return response;
  } catch (error) {
    // Return transparent pixel for failed images
    return new Response(
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      { headers: { "Content-Type": "image/gif" } },
    );
  }
}

// Static Asset Handler: Stale-While-Revalidate
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        const cache = caches.open(STATIC_CACHE);
        cache.then((c) => c.put(request, response.clone()));
      }
      return response;
    })
    .catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

// Page Request Handler: Network First with offline fallback
async function handlePageRequest(request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
      limitCacheSize(DYNAMIC_CACHE, CACHE_LIMITS.dynamic);
    }

    return response;
  } catch (error) {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fall back to home page for HTML requests
    const accept = request.headers.get("accept") || "";
    if (accept.includes("text/html")) {
      const fallback = await caches.match("/");
      if (fallback) {
        return fallback;
      }
    }

    // Return offline page
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Time Tracker</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f5f5f5; }
            .container { text-align: center; padding: 2rem; }
            h1 { color: #333; }
            p { color: #666; }
            button { margin-top: 1rem; padding: 0.75rem 1.5rem; background: #000; color: #fff; border: none; border-radius: 0.5rem; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>You're Offline</h1>
            <p>Please check your internet connection and try again.</p>
            <button onclick="location.reload()">Retry</button>
          </div>
        </body>
      </html>`,
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      },
    );
  }
}

// Background sync for offline data
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-time-entries") {
    event.waitUntil(syncTimeEntries());
  }
});

// Sync pending time entries when back online
async function syncTimeEntries() {
  try {
    // Get pending entries from IndexedDB (if implemented)
    // This is a placeholder for future offline-first functionality
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({ type: "SYNC_COMPLETE" });
    });
  } catch (error) {
    // Sync failed, will retry
  }
}

// Listen for messages from the client
self.addEventListener("message", (event) => {
  if (event.data) {
    switch (event.data.type) {
      case "SKIP_WAITING":
        self.skipWaiting();
        break;
      case "CLEAR_CACHE":
        event.waitUntil(
          caches
            .keys()
            .then((names) =>
              Promise.all(names.map((name) => caches.delete(name))),
            ),
        );
        break;
      case "GET_CACHE_STATUS":
        event.waitUntil(
          Promise.all([
            caches.open(STATIC_CACHE).then((c) => c.keys()),
            caches.open(DYNAMIC_CACHE).then((c) => c.keys()),
            caches.open(API_CACHE).then((c) => c.keys()),
            caches.open(IMAGE_CACHE).then((c) => c.keys()),
          ]).then(([staticKeys, dynamicKeys, apiKeys, imageKeys]) => {
            event.source.postMessage({
              type: "CACHE_STATUS",
              data: {
                static: staticKeys.length,
                dynamic: dynamicKeys.length,
                api: apiKeys.length,
                images: imageKeys.length,
              },
            });
          }),
        );
        break;
    }
  }
});
