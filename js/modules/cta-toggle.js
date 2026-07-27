function scrollToContact() {
  const contacto = document.getElementById('contacto');
  if (contacto) {
    contacto.scrollIntoView({ behavior: 'smooth' });
  }
}

export function initCtaToggle() {
  const perfilRadios = document.querySelectorAll('input[name="perfil"]');

  document.querySelectorAll('[data-perfil]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const perfil = link.getAttribute('data-perfil');

      perfilRadios.forEach((radio) => {
        radio.checked = radio.value === perfil;
      });

      scrollToContact();
    });
  });
}
