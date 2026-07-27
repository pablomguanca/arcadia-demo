import { initNav } from './modules/nav.js';
import { initCtaToggle } from './modules/cta-toggle.js';
import { initGallery } from './modules/gallery.js';
import { initFormValidation } from './modules/form-validation.js';

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initCtaToggle();
  initGallery();
  initFormValidation();
});
