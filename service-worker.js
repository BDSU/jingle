const version = 1;

const cache_name = `v${version}`;
// list of assets we want to prefetch
const assets = [
	// servers may redirect the path to index.html but for the service worker
	// these are two distinct urls and must be prefetched separately
	'./',
	'index.html',
	'jingle.js',
	'jingle.css',
	'jingle.m4a',
	'bdsu-logo.png',
];

self.addEventListener('install', event => {
	// prefetch all our assets
	const promise = caches.open(cache_name).then(
		cache => cache.addAll(assets)
	);

	event.waitUntil(promise);

	// become active immediately
	self.skipWaiting();
});

self.addEventListener('activate', event => {
	const promise = caches.keys().then(keys => {
		return Promise.all(keys.map(key => {
			// delete all caches of previous versions of this service worker
			if (key !== cache_name) {
				return caches.delete(key);
			}
		}));
	});

	event.waitUntil(promise);
});

self.addEventListener('fetch', event => {
	const response = fetch(event.request)
		.then(response => caches.open(cache_name).then(cache => {
				// add all successful requests to the cache
				cache.put(event.request, response.clone());
				return response;
			});
		)
		// if fetch from server fails try to respond with a cached version
		.catch(error => caches.match(event.request));

	event.respondWith(response);
});
