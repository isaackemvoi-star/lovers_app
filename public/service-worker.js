/* ================= SERVICE WORKER ================= */

const CACHE_NAME = "lovers-chat-v1";

const urlsToCache = [

  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/manifest.json"

];

self.addEventListener(

  "install",

  event => {

    event.waitUntil(

      caches.open(CACHE_NAME)

      .then(cache => {

        return cache.addAll(urlsToCache);

      })

    );

  }

);

self.addEventListener(

  "fetch",

  event => {

    event.respondWith(

      caches.match(event.request)

      .then(response => {

        return response || fetch(event.request);

      })

    );

  }

);

/* ================= PUSH NOTIFICATIONS ================= */

self.addEventListener(

  "push",

  event => {

    const data = event.data.json();

    self.registration.showNotification(

      data.title,

      {

        body: data.body,

        icon: "/icon.png",

        badge: "/icon.png"

      }

    );

  }

);

self.addEventListener(

  "notificationclick",

  event => {

    event.notification.close();

    event.waitUntil(

      clients.openWindow("/")

    );

  }