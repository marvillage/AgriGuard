export const themeKey = "agriguard_theme";

// Runs in <head> before the first paint, so a dark page never flashes white.
export const themeScript = `(function(){try{var t=localStorage.getItem('${themeKey}');var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`;
