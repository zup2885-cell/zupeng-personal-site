'use strict';

// Brand content table → timeline with like bars and content-type tags. The table stays in the
// page (visually hidden) so screen readers still get the full data.
(() => {
  const wrap = document.querySelector('.brand-table-wrap');
  const table = wrap?.querySelector('.brand-table');
  if (!table) return;
  const parseLikes = text => {
    const value = parseFloat(text.replace(/,/g, ''));
    return text.includes('万') ? value * 10000 : value;
  };
  const types = [
    {key: 'assist', label: '辅助驾驶', test: text => text.includes('辅助驾驶')},
    {key: 'family', label: '家用体验', test: text => text.includes('家')},
    {key: 'trip', label: '出行体验', test: text => text.includes('出行') || text.includes('出游')},
    {key: 'product', label: '产品与新车', test: () => true}
  ];
  const rows = [...table.tBodies[0].rows].map(row => {
    const [date, brand, focus, likes] = row.cells;
    const focusText = focus.textContent.trim();
    return {
      date: date.textContent.trim(),
      brand: brand.querySelector('strong')?.textContent.trim() || brand.textContent.trim(),
      model: brand.querySelector('span')?.textContent.trim() || '',
      focus: focusText,
      likesText: likes.textContent.trim(),
      likes: parseLikes(likes.textContent.trim()),
      type: types.find(type => type.test(focusText))
    };
  });
  const max = Math.max(...rows.map(row => row.likes));
  const total = rows.reduce((sum, row) => sum + row.likes, 0);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const viz = el('div', 'brand-viz');
  viz.setAttribute('aria-hidden', 'true');
  const head = el('div', 'brand-viz-head');
  head.append(el('h3', '', table.caption?.textContent.trim() || '品牌作品'));
  const note = el('p', 'brand-viz-total', '按发布时间排列 · 条形长度代表点赞数');
  head.append(note);
  viz.append(head);

  // Content mix: one stacked bar with a legend.
  const mix = el('div', 'brand-mix');
  const bar = el('div', 'brand-mix-bar');
  const legend = el('div', 'brand-mix-legend');
  types.forEach(type => {
    const count = rows.filter(row => row.type === type).length;
    if (!count) return;
    const part = el('span', `mix-${type.key}`);
    part.style.flexGrow = count;
    bar.append(part);
    const item = el('span', `legend-item mix-${type.key}`);
    item.append(el('i'), document.createTextNode(`${type.label} `), el('b', '', `${count}条`));
    legend.append(item);
  });
  mix.append(bar, legend);
  viz.append(mix);

  // Timeline grouped by month.
  const list = el('ol', 'brand-timeline');
  let month = '';
  rows.forEach((row, index) => {
    const [mm, dd] = row.date.split('.');
    if (mm !== month) {
      month = mm;
      list.append(el('li', 'brand-month', `${Number(mm)}月`));
    }
    const item = el('li', `brand-row mix-${row.type.key}`);
    item.style.setProperty('--share', (row.likes / max).toFixed(4));
    item.style.setProperty('--delay', `${index * 70}ms`);
    const date = el('span', 'brand-date');
    date.append(el('b', '', dd), el('small', '', `${mm}月`));
    const name = el('span', 'brand-name');
    name.append(el('strong', '', row.brand), el('small', '', row.model));
    const track = el('span', 'brand-track');
    const fill = el('span', 'brand-fill');
    track.append(fill);
    const value = el('span', 'brand-value', row.likesText);
    if (row.likes === max) {
      item.classList.add('brand-top');
      value.append(el('em', '', '爆款'));
    }
    const tag = el('span', 'brand-tag', row.focus);
    item.append(date, name, track, value, tag);
    list.append(item);
  });
  viz.append(list);
  table.classList.add('brand-table-hidden');
  wrap.classList.add('has-brand-viz');
  wrap.append(viz);

  // Overview above the chart: rate card as a ticket, stat tiles with mini graphics.
  const overview = document.querySelector('.business-overview');
  const counters = [];
  const countUp = strong => {
    const text = [...strong.childNodes].find(node => node.nodeType === 3 && /\d/.test(node.textContent));
    if (!text) return;
    const match = text.textContent.match(/^([\d.]+)(.*)$/);
    if (!match) return;
    counters.push({text, value: parseFloat(match[1]), decimals: (match[1].split('.')[1] || '').length, suffix: match[2]});
  };
  if (overview) {
    const card = overview.querySelector('.quote-prices');
    if (card) {
      card.classList.add('quote-ticket');
      card.querySelector('h3')?.insertAdjacentElement('beforebegin', el('span', 'quote-eyebrow', 'RATE CARD'));
      const prices = [...card.querySelectorAll(':scope>div')];
      const values = prices.map(div => parseFloat(div.querySelector('strong')?.textContent) || 0);
      const top = Math.max(...values);
      prices.forEach((div, index) => {
        div.classList.add('quote-row');
        const track = el('i', 'quote-bar');
        track.append(el('b'));
        track.style.setProperty('--v', (values[index] / top).toFixed(3));
        div.append(track);
        countUp(div.querySelector('strong'));
      });
    }
    const tiles = [...overview.querySelectorAll('.business-mini>div')];
    if (tiles.length >= 3) {
      overview.querySelector('.business-mini').classList.add('mini-tiles');
      const dots = el('span', 'mini-dots');
      rows.forEach(row => dots.append(el('i', `mix-${row.type.key}`)));
      tiles[0].append(dots);
      // Each brand name wraps as a whole, never split across lines.
      const brands = el('span', 'mini-brands');
      rows.forEach(row => brands.append(el('span', '', row.brand)));
      tiles[1].append(brands);
      // Likes in publishing order (oldest first), as a small area sparkline.
      const series = rows.map(row => row.likes).reverse();
      const W = 150, H = 40, step = W / (series.length - 1);
      const y = v => (H - 4 - (v / max) * (H - 10)).toFixed(1);
      const pts = series.map((v, i) => `${(i * step).toFixed(1)},${y(v)}`).join(' ');
      const peak = series.indexOf(max);
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.setAttribute('class', 'mini-spark');
      svg.innerHTML = `<polygon points="0,${H} ${pts} ${W},${H}"/><polyline points="${pts}"/><circle cx="${(peak * step).toFixed(1)}" cy="${y(max)}" r="3.2"/>`;
      const caption = el('small', 'mini-spark-caption', '7月 → 9月');
      tiles[2].append(svg, caption);
      tiles.forEach(tile => countUp(tile.querySelector('strong')));
    }
  }
  const runCounters = () => counters.forEach(counter => {
    const startAt = performance.now(), duration = 1100;
    const step = now => {
      const t = Math.min(1, (now - startAt) / duration), eased = 1 - (1 - t) ** 3;
      counter.text.textContent = (counter.value * eased).toFixed(counter.decimals) + counter.suffix;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) { viz.classList.add('brand-viz-in'); overview?.classList.add('overview-in'); return; }
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { viz.classList.add('brand-viz-in'); observer.disconnect(); }
  }, {threshold: .2});
  observer.observe(viz);
  if (overview) {
    counters.forEach(c => { c.text.textContent = (0).toFixed(c.decimals) + c.suffix; });
    const overviewObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { overview.classList.add('overview-in'); runCounters(); overviewObserver.disconnect(); }
    }, {threshold: .3});
    overviewObserver.observe(overview);
  }
})();
