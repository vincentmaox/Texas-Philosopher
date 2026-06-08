import { PALETTE } from '@/ui/theme/palette';
import { TIMING } from '@/ui/theme/timing';

type ToastType = 'info' | 'success' | 'error' | 'warning';

export function showToast(message: string, type: ToastType = 'info'): void {
  const container = getToastContainer();

  const colorMap: Record<ToastType, string> = {
    info: PALETTE.info,
    success: PALETTE.correct,
    error: PALETTE.bad,
    warning: PALETTE.warning,
  };

  const toast = document.createElement('div');
  toast.style.cssText = `
    padding: 10px 18px;
    border-radius: 8px;
    background: ${PALETTE.bgCard};
    border: 1px solid ${colorMap[type]};
    color: ${colorMap[type]};
    font-size: 13px;
    margin-bottom: 8px;
    opacity: 0;
    transform: translateY(-10px);
    transition: opacity 0.2s, transform 0.2s;
    max-width: 320px;
    word-break: break-word;
  `;
  toast.textContent = message;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), TIMING.toastFade);
  }, TIMING.toastDuration);
}

function getToastContainer(): HTMLElement {
  let el = document.getElementById('toast-container');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast-container';
    el.style.cssText = `
      position: fixed; top: 16px; right: 16px;
      z-index: 2000; display: flex; flex-direction: column; align-items: flex-end;
    `;
    document.body.appendChild(el);
  }
  return el;
}
