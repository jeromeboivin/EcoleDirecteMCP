// Reads, writes and auth transitions share a mutable account and token jar.
let pending: Promise<unknown> = Promise.resolve();

export function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const next = pending.then(fn);
  pending = next.then(() => {}, () => {});
  return next;
}
