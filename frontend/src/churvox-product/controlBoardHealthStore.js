let current = [];
const listeners = new Set();

export function publishControlBoardHealth(failures = []) {
  current = Array.isArray(failures) ? failures : [];
  listeners.forEach((listener) => listener());
}

export function subscribeControlBoardHealth(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getControlBoardHealth() {
  return current;
}
