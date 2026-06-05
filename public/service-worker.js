const WARNING_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23ffcc00' d='M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z'/%3E%3C/svg%3E";
let alertApiUrl = null;
let pollingInterval = null;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      if (self.registration.periodicSync) {
        try {
          await self.registration.periodicSync.register("air-alert-fetch", {
            minInterval: 30 * 1000,
          });
        } catch (error) {
          // periodic sync not available or denied
        }
      }
      if (alertApiUrl && !pollingInterval) {
        pollingInterval = setInterval(() => {
          fetchAlertData();
        }, 30000);
      }
    })()
  );
});

self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.type === "CONFIG" && event.data.alertApiUrl) {
    alertApiUrl = event.data.alertApiUrl;
    if (!pollingInterval) {
      pollingInterval = setInterval(() => {
        fetchAlertData();
      }, 30000);
    }
  }
});

self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || " ПОВІТРЯНА ТРИВОГА!";
  const body = payload.body || "Одеська область - Ракетна небезпека";
  const icon = payload.icon || WARNING_ICON;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      requireInteraction: true,
    })
  );
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "air-alert-fetch") {
    event.waitUntil(fetchAlertData());
  }
});

async function fetchAlertData() {
  if (!alertApiUrl) return;
  try {
    const response = await fetch(alertApiUrl, { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    const active = parseAlertData(data);
    if (active) {
      self.registration.showNotification(" ПОВІТРЯНА ТРИВОГА!", {
        body: "Одеська область - Ракетна небезпека",
        icon: WARNING_ICON,
        requireInteraction: true,
      });
    }
  } catch (error) {
    // polling failed silently
  }
}

function parseAlertData(data) {
  if (!data) return false;
  if (typeof data === "boolean") return data;
  if (data.active === true || data.isAlert === true || data.alarm === true) return true;
  if (typeof data.status === "string" && /alert|alarm|trivoga|raid|повітряна|air/i.test(data.status)) return true;
  if (data.odessa || data.odessa_region || data.Odesa) return parseAlertData(data.odessa || data.odessa_region || data.Odesa);
  if (Array.isArray(data)) return data.some((item) => parseAlertData(item));
  return false;
}
