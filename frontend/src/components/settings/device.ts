export function isAppleMobile() {
  const agent = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(agent) || (agent.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
