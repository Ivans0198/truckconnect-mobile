// Hermes no trae MessageEvent y el núcleo de msw lo extiende al cargarse
// (rettime, vía @mswjs/interceptors). Los mocks no usan WebSocket ni SSE, así
// que basta una clase mínima. Este módulo se importa antes que msw.
type EventInitWithData = { data?: unknown };

if (typeof globalThis.MessageEvent === "undefined") {
  const Base: typeof Event =
    typeof globalThis.Event === "function"
      ? globalThis.Event
      : (class {
          type: string;
          constructor(type: string) {
            this.type = type;
          }
        } as unknown as typeof Event);

  class MessageEventPolyfill extends Base {
    readonly data: unknown;
    constructor(type: string, init?: EventInitWithData) {
      super(type, init as EventInit);
      this.data = init?.data;
    }
  }

  Object.defineProperty(globalThis, "MessageEvent", {
    value: MessageEventPolyfill,
    writable: true,
    configurable: true,
  });
}
