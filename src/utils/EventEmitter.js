// Minimal publish/subscribe event bus — avoids tight coupling between systems
export class EventEmitter {
  constructor() {
    this._listeners = {};
  }

  on(event, listener) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(listener);
  }

  off(event, listener) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(l => l !== listener);
  }

  emit(event, ...args) {
    if (!this._listeners[event]) return;
    for (const listener of this._listeners[event]) {
      listener(...args);
    }
  }
}
