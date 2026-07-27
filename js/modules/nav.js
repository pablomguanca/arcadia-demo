export function initNav() {
  const toggle = document.querySelector('.site-header__toggle');
  const nav = document.querySelector('.site-header__nav');
  const overlay = document.querySelector('.site-header__overlay');

  if (!toggle || !nav) return;

  const setOpen = (open) => {
    nav.setAttribute('data-open', String(open));
    nav.toggleAttribute('inert', !open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute(
      'aria-label',
      open ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'
    );
    overlay?.setAttribute('data-open', String(open));
    document.body.classList.toggle('has-nav-open', open);
  };

  toggle.addEventListener('click', () => {
    const isOpen = nav.getAttribute('data-open') === 'true';
    setOpen(!isOpen);
  });

  overlay?.addEventListener('click', () => setOpen(false));

  nav.querySelectorAll('.site-header__nav-link').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.getAttribute('data-open') === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });
}