type Status = 'saving' | 'ready' | 'error' | 'unavailable';

let status: Status = 'saving';
let registration: ServiceWorkerRegistration | undefined;
let checkId = 0;
let deadline: ReturnType<typeof setTimeout> | undefined;
const watched = new WeakSet<ServiceWorker>();

function render() {
  const box = document.querySelector<HTMLElement>('.offline-status');
  if (!box) return;
  box.dataset.state = status;
  box.querySelector('[role="status"]')!.textContent = {
    saving: 'Saving for offline play…',
    ready: 'Ready to play offline ✓',
    error: 'Offline setup incomplete. Connect to the internet and retry.',
    unavailable: import.meta.env.PROD
      ? 'Offline play is unavailable in this browser.'
      : 'Offline play is available in the published game.',
  }[status];
  box.querySelector<HTMLButtonElement>('button')!.hidden = status !== 'error';
}

function setStatus(next: Status) {
  status = next;
  if (next !== 'saving') clearTimeout(deadline);
  render();
}

function saving() {
  setStatus('saving');
  clearTimeout(deadline);
  deadline = setTimeout(() => {
    ++checkId;
    setStatus('error');
  }, 45_000);
}

/** Ask the worker serving this page to check its complete build cache. */
function checkCache(worker: ServiceWorker, retry: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const finish = (ready: boolean) => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(ready);
    };
    const timer = setTimeout(() => finish(false), 30_000);
    channel.port1.onmessage = (event) => finish(event.data?.ready === true);
    try {
      worker.postMessage({ type: retry ? 'OFFLINE_RETRY' : 'OFFLINE_STATUS' }, [channel.port2]);
    } catch {
      finish(false);
    }
  });
}

async function refresh(retry = false) {
  const id = ++checkId;
  const worker = registration?.installing ?? registration?.waiting ?? navigator.serviceWorker.controller;
  if (!worker) return;
  if (!watched.has(worker)) {
    watched.add(worker);
    worker.addEventListener('statechange', () => {
      if (worker.state === 'redundant') {
        ++checkId;
        setStatus('error');
      } else void refresh();
    });
  }
  if (worker.state === 'redundant') {
    setStatus('error');
    return;
  }
  if (worker.state !== 'activated' || navigator.serviceWorker.controller !== worker) {
    saving();
    return;
  }
  const ready = await checkCache(worker, retry);
  // Ignore replies from a worker that has since been replaced or a superseded check.
  if (id === checkId && worker === navigator.serviceWorker.controller) setStatus(ready ? 'ready' : 'error');
}

async function setup(retry = false) {
  ++checkId;
  saving();
  try {
    const next = await navigator.serviceWorker.register('./sw.js');
    if (registration !== next) {
      registration = next;
      next.addEventListener('updatefound', () => {
        saving();
        void refresh();
      });
    }
    if (retry) await next.update();
    await refresh(retry);
  } catch {
    setStatus('error');
  }
}

export function startOfflineSupport() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    setStatus('unavailable');
    return;
  }
  navigator.serviceWorker.addEventListener('controllerchange', () => void refresh());
  window.addEventListener('online', () => {
    if (status === 'error') void setup(true);
  });
  if (document.readyState === 'complete') void setup();
  else window.addEventListener('load', () => void setup(), { once: true });
}

/** Reattach when the title panel is rebuilt, keeping the current readiness state. */
export function mountOfflineStatus(panel: HTMLElement) {
  const box = document.createElement('div');
  box.className = 'offline-status';
  box.innerHTML = '<span role="status" aria-live="polite"></span><button class="btn ghost" hidden>Retry</button>';
  box.querySelector('button')!.addEventListener('click', () => void setup(true));
  panel.append(box);
  render();
}
