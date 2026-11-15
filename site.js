// QWERTY Club — light/dark toggle (remembers the visitor's choice)
(function () {
  const KEY = 'qwerty_theme';
  const body = document.body;
  const light = document.getElementById('btn-light');
  const dark = document.getElementById('btn-dark');

  function apply(theme) {
    body.setAttribute('data-theme', theme);
    if (light && dark) {
      light.classList.toggle('active', theme === 'light');
      dark.classList.toggle('active', theme === 'dark');
    }
  }

  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  if (saved === 'light' || saved === 'dark') apply(saved);

  function set(theme) {
    apply(theme);
    try { localStorage.setItem(KEY, theme); } catch (e) {}
  }

  if (light) light.addEventListener('click', () => set('light'));
  if (dark) dark.addEventListener('click', () => set('dark'));
})();
