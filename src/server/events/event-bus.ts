type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

type UnknownEventHandler = EventHandler<unknown>;

const handlers = new Map<string, Set<UnknownEventHandler>>();

export function subscribe<T>(eventName: string, handler: EventHandler<T>) {
  const eventHandlers = handlers.get(eventName) || new Set<UnknownEventHandler>();
  eventHandlers.add(handler as UnknownEventHandler);
  handlers.set(eventName, eventHandlers);

  return () => eventHandlers.delete(handler as UnknownEventHandler);
}

export async function publish<T>(eventName: string, payload: T) {
  const eventHandlers = handlers.get(eventName);
  if (!eventHandlers) return;

  await Promise.all(Array.from(eventHandlers).map((handler) => handler(payload)));
}
