(() => {
  const frames = [...document.querySelectorAll('.frame')].filter(frame => {
    if (frame.classList.contains('is-long')) return false;
    if (frame.closest('.interactive, .prototype-demo') && frame.dataset.lightboxNavigable !== 'true') return false;
    return Boolean(
      frame.querySelector(':scope > img') &&
      frame.querySelector('.frame-expand')
    );
  });

  if (frames.length < 2) return;

  const arrow = direction => `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="${direction === 'prev' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}" />
    </svg>`;

  const makeButton = (direction, label) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `portfolio-lightbox-nav portfolio-lightbox-nav--${direction}`;
    button.setAttribute('aria-label', label);
    button.title = `${label}（方向键）`;
    button.innerHTML = arrow(direction);
    document.body.appendChild(button);
    return button;
  };

  const previous = makeButton('prev', '查看上一张');
  const next = makeButton('next', '查看下一张');

  const navigate = step => {
    if (!document.body.classList.contains('lightbox-open')) return;
    const currentIndex = frames.findIndex(frame => frame.classList.contains('is-expanded'));
    if (currentIndex < 0) return;
    const target = frames[(currentIndex + step + frames.length) % frames.length];
    const control = target.querySelector('.frame-expand');
    if (control) {
      window.__PORTFOLIO_LIGHTBOX_NAVIGATION__ = true;
      try {
        control.click();
      } finally {
        window.__PORTFOLIO_LIGHTBOX_NAVIGATION__ = false;
      }
    }
  };

  previous.addEventListener('click', event => {
    event.stopPropagation();
    navigate(-1);
  });
  next.addEventListener('click', event => {
    event.stopPropagation();
    navigate(1);
  });

  document.addEventListener('keydown', event => {
    if (!document.body.classList.contains('lightbox-open')) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      navigate(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      navigate(1);
    }
  });
})();
