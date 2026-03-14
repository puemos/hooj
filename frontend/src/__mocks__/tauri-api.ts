export function invoke(_cmd: string, _args?: Record<string, unknown>) {
  return Promise.resolve(null);
}

export function convertFileSrc(path: string) {
  return `asset://localhost/${encodeURIComponent(path)}`;
}

export class Channel<T> {
  onmessage: ((event: T) => void) | null = null;
  send(event: T) {
    this.onmessage?.(event);
  }
}
