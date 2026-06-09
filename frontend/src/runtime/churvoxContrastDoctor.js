/* CHURVOX CONTRAST DOCTOR 2026-06-10
   Runtime-only safety net for mixed dark/light Command Desk pages.
   It fixes only leaf text/control elements that are sitting on obvious dark or light surfaces. */
(function () {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__CHURVOX_CONTRAST_DOCTOR__) return;
  window.__CHURVOX_CONTRAST_DOCTOR__ = true;

  const DARK_TEXT = '#f8fafc';
  const DARK_SOFT = '#