'use strict';

// Practice plans open right under their own video card: one panel with an arrow pointing at the
// card, and tabs for the three documents. Replaces the separate accordion rows below the grid.
(() => {
  const grid = document.querySelector('#works .work-grid');
  const plans = [...document.querySelectorAll('#works .practice-plan')];
  if (!grid || !plans.length) return;
  const cards = [...grid.querySelectorAll('.work-card')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const icons = ['target', 'script', 'film'];
  const shortNames = ['选题卡', '口播提纲', '素材清单'];

  // Read each plan's three documents (heading + table) and its reference link.
  const data = plans.map(plan => {
    const body = plan.querySelector('.practice-plan-body');
    const docs = [...body.querySelectorAll('h3')].map((heading, index) => ({
      title: shortNames[index] || heading.textContent.trim(),
      table: heading.nextElementSibling
    }));
    return {id: plan.id, title: plan.querySelector('summary span')?.textContent.trim() || '', docs, link: body.querySelector('a.text-link')?.href};
  });
  plans[0].closest('.practice-plans')?.remove();

  const panel = el('section', 'practice-panel');
  panel.setAttribute('aria-live', 'polite');
  panel.hidden = true;
  const inner = el('div', 'practice-panel-inner');
  panel.append(inner);

  let openIndex = -1;
  const place = index => {
    // Desktop: the panel sits under the whole row, its arrow pointing at the card.
    // Single-column layouts: directly under the card itself.
    const stacked = getComputedStyle(grid).gridTemplateColumns.split(' ').length < 2;
    if (stacked) cards[index].after(panel);
    else grid.after(panel);
    const cardBox = cards[index].getBoundingClientRect();
    const parentBox = panel.parentElement.getBoundingClientRect();
    panel.style.setProperty('--arrow-x', `${(cardBox.left + cardBox.width / 2 - parentBox.left).toFixed(0)}px`);
  };
  const render = (index, tab) => {
    const plan = data[index];
    inner.replaceChildren();
    const head = el('div', 'pp-head');
    const title = el('div', 'pp-title');
    title.append(el('span', 'pp-eyebrow', '实训方案'), el('h3', '', plan.title));
    const close = el('button', 'pp-close');
    close.type = 'button';
    close.setAttribute('aria-label', '收起方案');
    close.textContent = '×';
    close.addEventListener('click', () => toggle(index));
    head.append(title, close);
    const tabs = el('div', 'pp-tabs');
    tabs.setAttribute('role', 'tablist');
    const views = el('div', 'pp-views');
    plan.docs.forEach((doc, docIndex) => {
      const button = el('button', 'pp-tab');
      button.type = 'button';
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-selected', String(docIndex === tab));
      const badge = el('span', 'ico-badge');
      badge.append(el('i', `ico ico-${icons[docIndex]}`));
      button.append(badge, el('span', '', doc.title));
      button.addEventListener('click', () => select(docIndex));
      tabs.append(button);
      const view = el('div', 'pp-view');
      view.setAttribute('role', 'tabpanel');
      view.hidden = docIndex !== tab;
      view.append(doc.table.cloneNode(true));
      views.append(view);
    });
    const select = docIndex => {
      [...tabs.children].forEach((button, i) => button.setAttribute('aria-selected', String(i === docIndex)));
      [...views.children].forEach((view, i) => { view.hidden = i !== docIndex; });
    };
    const foot = el('div', 'pp-foot');
    if (plan.link) {
      const watch = el('a', 'pp-watch', '观看参考作品 ↗');
      watch.href = plan.link; watch.target = '_blank'; watch.rel = 'noopener noreferrer';
      foot.append(watch);
    }
    inner.append(head, tabs, views, foot);
  };
  const setButtons = () => cards.forEach((card, index) => {
    card.classList.toggle('plan-open', index === openIndex);
    const button = card.querySelector('.practice-open');
    button?.setAttribute('aria-expanded', String(index === openIndex));
  });
  const toggle = (index, tab = 0) => {
    if (openIndex === index && tab === -1) return;
    if (openIndex === index) {
      openIndex = -1;
      panel.classList.remove('pp-open');
      setTimeout(() => { if (openIndex === -1) panel.hidden = true; }, reduced.matches ? 0 : 320);
      setButtons();
      return;
    }
    const wasOpen = openIndex !== -1;
    openIndex = index;
    render(index, Math.max(0, tab));
    place(index);
    panel.hidden = false;
    requestAnimationFrame(() => panel.classList.add('pp-open'));
    setButtons();
    window.ChartSound?.paper?.(index);
    if (!wasOpen) {
      const top = panel.getBoundingClientRect().top;
      if (top > innerHeight * .75) panel.scrollIntoView({block: 'nearest', behavior: reduced.matches ? 'auto' : 'smooth'});
    }
  };

  cards.forEach((card, index) => {
    const button = card.querySelector('.practice-open');
    if (button) {
      button.innerHTML = '<span class="ico-badge"><i class="ico ico-script"></i></span><span>实训方案</span><em>3份</em><span class="po-arrow" aria-hidden="true">↓</span>';
      button.addEventListener('click', event => { event.preventDefault(); toggle(index); });
    }
    // Each step row opens the matching document directly.
    card.querySelectorAll('.work-steps li').forEach((step, stepIndex) => {
      step.tabIndex = 0;
      step.setAttribute('role', 'button');
      step.setAttribute('aria-label', `查看${shortNames[stepIndex]}`);
      const open = () => {
        if (openIndex === index) { [...panel.querySelectorAll('.pp-tab')][stepIndex]?.click(); return; }
        toggle(index, stepIndex);
      };
      step.addEventListener('click', open);
      step.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); open(); } });
    });
  });
  addEventListener('resize', () => { if (openIndex !== -1) place(openIndex); }, {passive: true});
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && openIndex !== -1) toggle(openIndex); });
})();
