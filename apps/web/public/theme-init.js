// Runs before first paint: apply saved theme and language so there is no flash.
(function () {
  var root = document.documentElement;
  var theme = 'system';
  var lang = null;
  try {
    var saved = JSON.parse(localStorage.getItem('ferry:settings:v1') || 'null');
    if (saved && saved.state) {
      theme = saved.state.theme || 'system';
      lang = saved.state.language || null;
    }
  } catch (e) {
    /* storage blocked: use defaults */
  }
  var dark = theme === 'dark' || (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  if (!lang) {
    var nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    lang = nav === 'ar' || nav === 'es' ? nav : 'en';
  }
  root.setAttribute('lang', lang);
  root.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
})();
