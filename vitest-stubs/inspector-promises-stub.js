// Vitest stub for 'node:inspector/promises'
// This built-in module is not present in older Node runtimes.
// Some dev tools import it during tests causing the runner to crash.
// We provide a minimal no-op API surface so imports succeed.

export async function open() {
  // no-op
}

export async function close() {
  // no-op
}

export default {
  open,
  close
}
