// Kept only on this phone: the device key for each field it controls, its settings and the last field used.
const nodesKey = "agriguard_phone_nodes";
const prefsKey = "agriguard_phone_prefs";
const fieldKey = "agriguard_phone_field";

export interface PhoneNode {
  deviceId: number;
  deviceKey: string;
  fieldId: number;
}

export interface PhonePrefs {
  practice: boolean;
  alerts: boolean;
}

function read<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? { ...fallback, ...JSON.parse(value) } : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // private mode or full storage: the setting lasts for this visit only
  }
}

export function phoneNodeFor(fieldId: number): PhoneNode | null {
  return read<Record<string, PhoneNode>>(nodesKey, {})[String(fieldId)] ?? null;
}

export function savePhoneNode(node: PhoneNode) {
  write(nodesKey, { ...read<Record<string, PhoneNode>>(nodesKey, {}), [String(node.fieldId)]: node });
}

export function forgetPhoneNode(fieldId: number) {
  const nodes = read<Record<string, PhoneNode>>(nodesKey, {});
  delete nodes[String(fieldId)];
  write(nodesKey, nodes);
}

export function readPrefs(): PhonePrefs {
  return read<PhonePrefs>(prefsKey, { practice: false, alerts: true });
}

export function savePrefs(prefs: PhonePrefs) {
  write(prefsKey, prefs);
}

export function lastToolField(): number | null {
  try {
    const value = Number(window.localStorage.getItem(fieldKey));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function rememberToolField(fieldId: number) {
  try {
    window.localStorage.setItem(fieldKey, String(fieldId));
  } catch {
    // not remembered in private mode
  }
}
