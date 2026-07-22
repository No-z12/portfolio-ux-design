(() => {
  const topbar = document.querySelector('.resume-topbar');
  const navLinks = [...document.querySelectorAll('.resume-nav a[href^="#"]')];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let topbarFrame = 0;

  const syncTopbar = () => {
    topbarFrame = 0;
    topbar?.classList.toggle('is-scrolled', scrollY > 20);
    const marker = (topbar?.offsetHeight || 68) + 46;
    let active = null;
    navLinks.forEach(link => {
      const section = document.querySelector(link.getAttribute('href'));
      const bounds = section?.getBoundingClientRect();
      if (bounds && bounds.top <= marker && bounds.bottom > marker) active = link;
    });
    navLinks.forEach(link => {
      const isActive = link === active;
      link.classList.toggle('is-active', isActive);
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  const scheduleTopbar = () => {
    if (topbarFrame) return;
    topbarFrame = requestAnimationFrame(syncTopbar);
  };

  addEventListener('scroll', scheduleTopbar, { passive: true });
  addEventListener('resize', scheduleTopbar, { passive: true });
  syncTopbar();

  const revealItems = [...document.querySelectorAll('.reveal')];
  revealItems.forEach(item => {
    const delay = Math.max(0, Math.min(220, Number(item.dataset.revealDelay) || 0));
    item.style.setProperty('--reveal-delay', `${delay}ms`);
  });

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach(item => item.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });

  revealItems.forEach(item => observer.observe(item));
  addEventListener('portfolio:release', () => observer.disconnect(), { once: true });
})();
