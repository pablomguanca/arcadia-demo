export function initGallery() {
  const images = document.querySelectorAll('.vistazo__gallery-img');
  if (!images.length) return;

  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.setAttribute('aria-label', 'Vista ampliada de la galería de Arcadia');
  dialog.innerHTML = `
    <button class="lightbox__close" type="button" aria-label="Cerrar vista ampliada">&times;</button>
    <img class="lightbox__image" alt="">
  `;
  document.body.appendChild(dialog);

  const lightboxImage = dialog.querySelector('.lightbox__image');
  const closeButton = dialog.querySelector('.lightbox__close');

  images.forEach((img) => {
    img.setAttribute('tabindex', '0');
    img.setAttribute('role', 'button');
    img.setAttribute('aria-label', `Ampliar imagen: ${img.alt}`);

    const open = () => {
      lightboxImage.src = img.src;
      lightboxImage.alt = img.alt;
      dialog.showModal();
    };

    img.addEventListener('click', open);
    img.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
  });

  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}
