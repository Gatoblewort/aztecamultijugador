const CACHE='aztec-war-v1';
const ASSETS=['/','index.html','/css/lobby.css','/js/lobby.js'];
self.addEventListener('install',e=>{
    e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{}));
});
self.addEventListener('fetch',e=>{
    // No cachear el juego ni las APIs
    if(e.request.url.includes('/game')||e.request.url.includes('/api')||
       e.request.url.includes('/socket.io')) return;
    e.respondWith(
        caches.match(e.request).then(r=>r||fetch(e.request))
    );
});
