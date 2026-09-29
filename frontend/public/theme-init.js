// Applies the saved (or system) theme before first paint to avoid a light flash.
try {
  var saved = localStorage.getItem('pp_theme')
  var dark = saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches
  if (dark) document.documentElement.classList.add('dark')
} catch (e) {}
