export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const listeners = new Set<() => void>();
let promptEvent: InstallPromptEvent | null = null;
let installed = false;

function emit() {
  listeners.forEach((listener) => listener());
}

// Imported by the app shell so the prompt is caught on whichever page the browser fires it.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    promptEvent = event as InstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    promptEvent = null;
    installed = true;
    emit();
  });
}

export function subscribeInstall(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const canPromptInstall = () => promptEvent !== null;

export const wasJustInstalled = () => installed;

export async function promptInstall() {
  if (!promptEvent) return false;
  await promptEvent.prompt();
  const { outcome } = await promptEvent.userChoice;
  if (outcome === "accepted") {
    promptEvent = null;
    installed = true;
  }
  emit();
  return outcome === "accepted";
}
