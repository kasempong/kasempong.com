// Apply the saved light/dark theme before the welcome page paints.
// External file because the site's security policy blocks inline scripts.
try { document.documentElement.setAttribute('data-theme', localStorage.getItem('theme') || 'light'); } catch (e) {}
