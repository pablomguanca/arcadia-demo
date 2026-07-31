function updateButtons(track, prevButton, nextButton) {
  const maxScroll = track.scrollWidth - track.clientWidth;
  prevButton.disabled = track.scrollLeft <= 0;
  nextButton.disabled = track.scrollLeft >= maxScroll - 1;
}

function closestSlideIndex(track, slides) {
  let closest = 0;
  let smallestDiff = Infinity;

  slides.forEach((slide, index) => {
    const diff = Math.abs(slide.offsetLeft - track.scrollLeft);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closest = index;
    }
  });

  return closest;
}

function buildDots(carousel, track, slides) {
  const dotsContainer = carousel.querySelector('[data-carousel-dots]');
  if (!dotsContainer || slides.length === 0) return null;

  const dots = slides.map((slide, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'carousel__dot';
    dot.setAttribute('aria-label', `Ir a la imagen ${index + 1} de ${slides.length}`);
    dot.setAttribute('aria-current', index === 0 ? 'true' : 'false');
    dot.addEventListener('click', () => {
      track.scrollTo({ left: slide.offsetLeft, behavior: 'smooth' });
    });
    dotsContainer.appendChild(dot);
    return dot;
  });

  return dots;
}

function updateDots(dots, activeIndex) {
  if (!dots) return;
  dots.forEach((dot, index) => {
    dot.setAttribute('aria-current', String(index === activeIndex));
  });
}

function initCarouselInstance(carousel) {
  const track = carousel.querySelector('[data-carousel-track]');
  const prevButton = carousel.querySelector('[data-carousel-prev]');
  const nextButton = carousel.querySelector('[data-carousel-next]');

  if (!track || !prevButton || !nextButton) return;

  const slides = Array.from(track.querySelectorAll('.carousel__slide'));
  const dots = buildDots(carousel, track, slides);

  const scrollByStep = (direction) => {
    const slide = slides[0];
    const step = slide ? slide.getBoundingClientRect().width + 24 : track.clientWidth;
    track.scrollBy({ left: step * direction, behavior: 'smooth' });
  };

  prevButton.addEventListener('click', () => scrollByStep(-1));
  nextButton.addEventListener('click', () => scrollByStep(1));

  track.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollByStep(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollByStep(-1);
    }
  });

  track.addEventListener('scroll', () => {
    updateButtons(track, prevButton, nextButton);
    updateDots(dots, closestSlideIndex(track, slides));
  }, { passive: true });

  window.addEventListener('resize', () => updateButtons(track, prevButton, nextButton));

  updateButtons(track, prevButton, nextButton);
}

export function initCarousel() {
  document.querySelectorAll('[data-carousel]').forEach(initCarouselInstance);
}
