import { useEffect, useState } from 'react';

const STORAGE_KEY = 'ecobin.theme';

function readStored() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}
function systemPref() {
  try { return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; } catch { return 'dark'; }
}
function apply(theme) {
  document.documentElement.classList.toggle('light', theme === 'light');
  document.body.classList.toggle('light', theme === 'light');
}
const initial = (() => {
  const t = readStored() || systemPref();
  apply(t);
  return t;
})();

let current = initial;
const listeners = new Set();

function notify() { listeners.forEach((l) => l(current)); }

export function getTheme() { return current; }
export function setTheme(next) {
  current = next;
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  apply(next);
  notify();
}
export function toggleTheme() { setTheme(current === 'light' ? 'dark' : 'light'); }

export default function useTheme() {
  const [theme, setT] = useState(current);
  useEffect(() => {
    const l = (t) => setT(t);
    listeners.add(l);
    setT(current);
    return () => listeners.delete(l);
  }, []);
  return [theme, toggleTheme];
}
