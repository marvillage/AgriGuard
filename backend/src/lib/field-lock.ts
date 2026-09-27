// Serialises analysis and deletion per field inside this process.
const chains = new Map<number, Promise<unknown>>();
const deleting = new Set<number>();

export async function withFieldLock<T>(fieldId: number, task: () => Promise<T>): Promise<T> {
  const previous = chains.get(fieldId) ?? Promise.resolve();
  const run = previous.then(task, task);
  const tail = run.then(
    () => undefined,
    () => undefined
  );
  chains.set(fieldId, tail);
  void tail.then(() => {
    if (chains.get(fieldId) === tail) chains.delete(fieldId);
  });
  return run;
}

export const isFieldDeleting = (fieldId: number) => deleting.has(fieldId);

export async function whileDeleting<T>(fieldId: number, task: () => Promise<T>): Promise<T> {
  deleting.add(fieldId);
  try {
    return await withFieldLock(fieldId, task);
  } finally {
    deleting.delete(fieldId);
  }
}

export function isForeignKeyError(error: unknown) {
  const cause = error instanceof Error ? (error as { cause?: unknown }).cause : null;
  const text = `${error instanceof Error ? error.message : String(error)} ${cause instanceof Error ? cause.message : ""}`;
  return /foreign key constraint/i.test(text);
}
