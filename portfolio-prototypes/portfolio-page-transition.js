(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const style = document.createElement('style');
  style.textContent = `
    .portfolio-transition-layer{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;pointer-events:none;opacity:0;background:rgba(233,237,243,.88);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}
    .portfolio-transition-skeleton{width:min(420px,72vw);padding:28px;border:1px solid rgba(17,18,20,.09);border-radius:16px;background:rgba(255,255,255,.52)}
    .portfolio-transition-line{position:relative;height:10px;margin-top:12px;overflow:hidden;border-radius:999px;background:rgba(17,18,20,.075)}
    .portfolio-transition-line:first-child{width:34%;height:8px;margin-top:0}.portfolio-transition-line:nth-child(2){width:78%;height:17px;margin-top:22px}.portfolio-transition-line:nth-child(3){width:56%}
    .portfolio-transition-line::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.7),transparent);transform:translateX(-110%);animation:portfolio-skeleton-shimmer 1.1s ease-in-out infinite}
    @keyframes portfolio-skeleton-shimmer{to{transform:translateX(110%)}}
  `;
  document.head.appendChild(style);

  const layer = document.createElement('div');
  layer.className = 'portfolio-transition-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = '<div class="portfolio-transition-skeleton"><div class="portfolio-transition-line"></div><div class="portfolio-transition-line"></div><div class="portfolio-transition-line"></div></div>';
  document.body.appendChild(layer);

  document.body.animate([
    { opacity: .82 },
    { opacity: 1 }
  ], { duration: 340, easing: 'ease-out', fill: 'both' });

  let leaving = false;
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || leaving || event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    const destination = new URL(link.href, location.href);
    if (destination.origin !== location.origin || !destination.pathname.toLowerCase().endsWith('.html')) return;

    event.preventDefault();
    leaving = true;
    document.documentElement.style.pointerEvents = 'none';
    layer.animate([
      { opacity: 0 },
      { opacity: 1 }
    ], { duration: 280, easing: 'ease-out', fill: 'forwards' });
    layer.firstElementChild.animate([
      { opacity: 0, transform: 'translateY(5px) scale(.99)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' }
    ], { duration: 320, easing: 'cubic-bezier(.2,.72,.2,1)', fill: 'forwards' });
    setTimeout(() => location.href = destination.href, 440);
  });
})();
