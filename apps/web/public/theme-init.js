// Runs before first paint: apply the saved theme so there is no flash.
(function () {
  var root = document.documentElement;
  var theme = 'system';
  try {
    var saved = JSON.parse(localStorage.getItem('ferry:settings:v1') || 'null');
    if (saved && saved.state && saved.state.theme) theme = saved.state.theme;
  } catch (e) {
    /* storage blocked: use the device setting */
  }
  var dark = theme === 'dark' || (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#16171B' : '#FFD43B');
})();
