import type { Response } from "express";

// In-process pub/sub for Server-Sent Events, keyed by user id.
const clients = new Map<number, Set<Response>>();

export function addClient(userId: number, res: Response) {
  const set = clients.get(userId) ?? new Set<Response>();
  set.add(res);
  clients.set(userId, set);
  return () => {
    set.delete(res);
    if (set.size === 0) clients.delete(userId);
  };
}

export function publish(userIds: number[], event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const userId of new Set(userIds)) {
    for (const res of clients.get(userId) ?? []) {
      res.write(payload);
    }
  }
}

export function connectedUsers() {
  return clients.size;
}
