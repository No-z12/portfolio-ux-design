/* PORTFOLIO INTERVIEW REHEARSAL UI
 * Generic removable shell shared by projects 1 and 3. Each project provides
 * only window.PORTFOLIO_SPEAKER_NOTES_CONFIG in its own data file.
 */
(() => {
  const config = window.PORTFOLIO_SPEAKER_NOTES_CONFIG;
  const pages = [...document.querySelectorAll('.page[id^="p"]')];
  if (!config || !pages.length) return;

  const data = config.data || {};
  const titles = config.titles || [];
  const total = Number(config.total) || pages.length;
  const sourceOffset = Number(config.sourceOffset) || 0;
  const panel = document.createElement('aside');
  const toggle = document.createElement('button');

  panel.className = 'speaker-notes';
  panel.setAttribute('aria-hidden', 'true');
  panel.setAttribute('aria-label', '当前页面面试演讲稿');
  panel.innerHTML = `
    <header class="speaker-notes__head">
      <span class="speaker-notes__label">INTERVIEW REHEARSAL</span>
      <span class="speaker-notes__page">P01 / ${String(total).padStart(2, '0')}</span>
    </header>
    <div class="speaker-notes__body">
      <h3 class="speaker-notes__title"></h3>
      <p class="speaker-notes__text"></p>
    </div>
    <p class="speaker-notes__hint">练习辅助层 · 不属于对外作品内容</p>`;

  toggle.type = 'button';
  toggle.className = 'speaker-notes-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', '显示面试演讲稿');
  toggle.innerHTML = '<i></i><span>讲稿</span>';
  document.body.append(panel, toggle);

  const update = page => {
    const safePage = Math.min(total, Math.max(1, Number(page) || 1));
    const pad = String(safePage).padStart(2, '0');
    const sourcePage = safePage + sourceOffset;
    const note = Object.prototype.hasOwnProperty.call(data, sourcePage) ? data[sourcePage] : '';
    panel.querySelector('.speaker-notes__page').textContent = `P${pad} / ${String(total).padStart(2, '0')}`;
    panel.querySelector('.speaker-notes__title').textContent = titles[safePage - 1] || `P${pad}`;
    panel.querySelector('.speaker-notes__text').textContent = note || '该页在 Figma 中没有配置 Frame 旁侧讲稿。';
  };

  const setOpen = open => {
    panel.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', String(!open));
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? '隐藏面试演讲稿' : '显示面试演讲稿');
    toggle.querySelector('span').textContent = open ? '收起讲稿' : '讲稿';
    document.body.classList.toggle('speaker-notes-open', open);
  };

  toggle.addEventListener('click', () => setOpen(!panel.classList.contains('open')));
  const hashPage = Number(location.hash.match(/^#p(\d+)/)?.[1]) || 1;
  update(hashPage);

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) update(Number(entry.target.id.slice(1)));
    });
  }, { rootMargin: '-38% 0px -54%', threshold: 0 });
  pages.forEach(page => observer.observe(page));
})();
