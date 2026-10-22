/**
 * 通告本 · 双入口本地应用
 */
(function () {
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  let mode = null; // 'assistant' | 'actor'
  let route = '';
  let pendingImport = null;

  function toast(msg) {
    let t = $('#toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast';
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast('已复制');
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      toast('已复制');
    }
  }

  function downloadJSON(obj, filename) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function parseHash() {
    const h = (location.hash || '#/').replace(/^#/, '');
    const parts = h.split('/').filter(Boolean);
    if (!parts.length) return { mode: null, page: 'entry' };
    if (parts[0] === 'assistant') return { mode: 'assistant', page: parts[1] || 'call' };
    if (parts[0] === 'actor') return { mode: 'actor', page: parts[1] || 'today' };
    return { mode: null, page: 'entry' };
  }

  function go(path) {
    location.hash = path;
  }

  /* ---------- Entry: horizontal editorial ---------- */
  let edTrack = null;
  let edPanelCount = 6;
  let edIndex = 0;
  let edBound = false;

  function edPanelWidth() {
    return edTrack ? edTrack.clientWidth : window.innerWidth;
  }

  function edGoTo(i, smooth = true) {
    if (!edTrack) return;
    edIndex = Math.max(0, Math.min(edPanelCount - 1, i));
    const left = edIndex * edPanelWidth();
    try { edTrack.focus({ preventScroll: true }); } catch (e) { edTrack.focus(); }
    if (typeof edTrack.scrollTo === 'function') {
      edTrack.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
    }
    // some engines ignore scrollTo until scrollLeft is set
    if (!smooth || Math.abs(edTrack.scrollLeft - left) > edPanelWidth() * 0.4) {
      edTrack.scrollLeft = left;
    }
    edUpdateChrome();
    edApplyParallax();
  }

  function edUpdateChrome() {
    const num = $('#ed-index-num');
    if (num) num.textContent = '*' + String(edIndex + 1).padStart(2, '0');
    const prev = $('#ed-prev');
    const next = $('#ed-next');
    if (prev) prev.disabled = edIndex <= 0;
    if (next) next.disabled = edIndex >= edPanelCount - 1;
    $$('.ed-nav a[data-jump]').forEach((a) => {
      a.classList.toggle('is-active', Number(a.dataset.jump) === edIndex);
    });
    const bar = $('#ed-progress-bar');
    if (bar && edTrack) {
      const max = edTrack.scrollWidth - edTrack.clientWidth;
      const pct = max > 0 ? (edTrack.scrollLeft / max) * 100 : 0;
      bar.style.width = Math.max(8, pct) + '%';
    }
  }

  function edApplyParallax() {
    if (!edTrack) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      $$('.plx', edTrack).forEach((el) => { el.style.transform = ''; });
      return;
    }
    const scrollX = edTrack.scrollLeft;
    const vw = edPanelWidth() || 1;
    $$('.ed-panel', edTrack).forEach((panel) => {
      const i = Number(panel.dataset.i) - 1;
      const panelLeft = i * vw;
      const offset = scrollX - panelLeft; // 0 when panel centered at start
      $$('.plx', panel).forEach((el) => {
        const speed = parseFloat(el.dataset.speed || '0.2');
        // layers lag / lead relative to panel scroll
        const dx = -offset * speed;
        el.style.transform = `translate3d(${dx}px, 0, 0)`;
      });
    });
  }

  function edOnScroll() {
    if (!edTrack) return;
    const vw = edPanelWidth() || 1;
    edIndex = Math.round(edTrack.scrollLeft / vw);
    edIndex = Math.max(0, Math.min(edPanelCount - 1, edIndex));
    edUpdateChrome();
    edApplyParallax();
  }

  function initEditorial() {
    edTrack = $('#ed-track');
    if (!edTrack || edBound) {
      edUpdateChrome();
      return;
    }
    edBound = true;
    edPanelCount = $$('.ed-panel', edTrack).length || 6;

    edTrack.addEventListener('scroll', edOnScroll, { passive: true });
    window.addEventListener('resize', () => {
      edGoTo(edIndex, false);
      edApplyParallax();
    });

    $('#ed-prev')?.addEventListener('click', () => edGoTo(edIndex - 1));
    $('#ed-next')?.addEventListener('click', () => edGoTo(edIndex + 1));

    // header / burger jumps
    document.addEventListener('click', (e) => {
      const jump = e.target.closest('[data-jump]');
      if (jump && $('#view-entry') && !$('#view-entry').classList.contains('hidden')) {
        e.preventDefault();
        edGoTo(Number(jump.dataset.jump));
        const panel = $('#ed-burger-panel');
        if (panel) panel.hidden = true;
        const burger = $('#ed-burger');
        if (burger) burger.setAttribute('aria-expanded', 'false');
      }
    });

    const burger = $('#ed-burger');
    const burgerPanel = $('#ed-burger-panel');
    burger?.addEventListener('click', () => {
      if (!burgerPanel) return;
      const open = burgerPanel.hidden;
      burgerPanel.hidden = !open;
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    // keyboard
    edTrack.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        edGoTo(edIndex + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        edGoTo(edIndex - 1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        edGoTo(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        edGoTo(edPanelCount - 1);
      }
    });

    // wheel → horizontal (desktop)
    edTrack.addEventListener(
      'wheel',
      (e) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          edTrack.scrollLeft += e.deltaY;
          e.preventDefault();
        }
      },
      { passive: false }
    );

    edUpdateChrome();
    edApplyParallax();
  }

  function renderEntry() {
    $('#view-entry').classList.remove('hidden');
    $('#view-app').classList.add('hidden');
    document.body.classList.remove('in-app');
    const data = TG.load();
    const empty = !data.callSheets.length && !data.projects.length;
    const hint = $('#entry-sample-hint');
    if (hint) hint.classList.toggle('hidden', !empty);
    // re-sync chrome after showing
    requestAnimationFrame(() => {
      initEditorial();
      edUpdateChrome();
      edApplyParallax();
    });
  }

  /* ---------- Shell ---------- */
  const ASSISTANT_TABS = [
    { id: 'call', label: '通告', ico: '◎' },
    { id: 'schedule', label: '档期', ico: '▦' },
    { id: 'handoff', label: '交接', ico: '⇄' },
    { id: 'me', label: '我的', ico: '◦' },
  ];
  const ACTOR_TABS = [
    { id: 'today', label: '今天', ico: '◎' },
    { id: 'lines', label: '台词', ico: '文' },
    { id: 'schedule', label: '档期', ico: '▦' },
    { id: 'biz', label: '商务', ico: '◇' },
    { id: 'me', label: '我的', ico: '◦' },
  ];

  function renderShell() {
    $('#view-entry').classList.add('hidden');
    $('#view-app').classList.remove('hidden');
    document.body.classList.add('in-app');

    const brandSub = mode === 'assistant' ? '助理' : '本人';
    $('#app-brand-sub').textContent = brandSub;

    const tabs = mode === 'assistant' ? ASSISTANT_TABS : ACTOR_TABS;
    const tabbar = $('#app-tabbar');
    tabbar.innerHTML = tabs
      .map(
        (t) =>
          `<a href="#/${mode}/${t.id}" class="${route === t.id ? 'active' : ''}" data-page="${t.id}"><span class="ico">${t.ico}</span>${t.label}</a>`
      )
      .join('');

    const main = $('#app-main');
    if (mode === 'assistant') {
      if (route === 'call') main.innerHTML = viewAssistantCall();
      else if (route === 'schedule') main.innerHTML = viewSchedule('assistant');
      else if (route === 'handoff') main.innerHTML = viewHandoff('assistant');
      else main.innerHTML = viewMe('assistant');
    } else {
      if (route === 'today') main.innerHTML = viewActorToday();
      else if (route === 'lines') main.innerHTML = viewActorLines();
      else if (route === 'schedule') main.innerHTML = viewSchedule('actor');
      else if (route === 'biz') main.innerHTML = viewBiz();
      else main.innerHTML = viewMe('actor');
    }
    bindMainEvents(main);
  }

  /* ---------- Assistant: 通告 ---------- */
  let selectedDate = null;

  function getSheetsByDate(data, date) {
    return (data.callSheets || []).filter((s) => s.date === date);
  }

  function shiftDate(dateStr, delta) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function viewAssistantCall() {
    const data = TG.load();
    if (!selectedDate) selectedDate = TG.todayStr();
    const sheets = getSheetsByDate(data, selectedDate);
    const sheet = sheets[0];

    let body = '';
    if (!sheet) {
      body = `
        <div class="card empty">本日暂无通告。可新建，或到「我的」载入虚构示例。</div>
        <div class="row" style="justify-content:center">
          <button class="btn btn-primary" data-action="new-sheet">＋ 新建通告</button>
        </div>`;
    } else {
      const sessions = sheet.sessions || [];
      const cleared = sessions.filter((s) => s.cleared).length;
      body = `
        <div class="card">
          <div class="row-between">
            <div>
              <div class="sub">${sheet.projectCode}</div>
              <h2 style="color:var(--text);font-family:var(--font-display);font-size:1.35rem;letter-spacing:0.1em;margin:0.2rem 0 0">${sheet.date}</h2>
            </div>
            <span class="badge badge-muted">消场 ${cleared}/${sessions.length}</span>
          </div>
          <div class="timeline" style="margin-top:1rem">
            <div class="tl-item"><div class="t">妆造</div><div class="b">${sheet.makeupTime || '—'}</div></div>
            <div class="tl-item"><div class="t">交妆</div><div class="b">${sheet.handoffTime || '—'}</div></div>
            <div class="tl-item"><div class="t">到场</div><div class="b">${sheet.arrivalTime || '—'}</div></div>
          </div>
          ${sheet.notes ? `<p style="margin:0.75rem 0 0;color:var(--muted);font-size:0.9rem">${esc(sheet.notes)}</p>` : ''}
        </div>

        <div class="card">
          <h3>场次 · 消场</h3>
          <div class="table-wrap">
            <table class="data">
              <thead><tr><th>场</th><th>日夜内外</th><th>摘要</th><th>消场</th></tr></thead>
              <tbody>
                ${sessions
                  .map(
                    (s) => `<tr>
                    <td>${esc(s.number)}</td>
                    <td>${esc(s.dayNight)}${esc(s.inout)}</td>
                    <td>${esc(s.summary)}${s.makeupNote ? `<div style="font-size:0.75rem;color:var(--faint)">${esc(s.makeupNote)}</div>` : ''}</td>
                    <td><label class="toggle"><input type="checkbox" data-action="toggle-clear" data-sheet="${sheet.id}" data-sess="${s.id}" ${s.cleared ? 'checked' : ''}/></label></td>
                  </tr>`
                  )
                  .join('') || '<tr><td colspan="4" class="empty">无场次</td></tr>'}
              </tbody>
            </table>
          </div>
          <div class="row" style="margin-top:0.75rem">
            <button class="btn btn-sm" data-action="add-session" data-sheet="${sheet.id}">＋ 加场</button>
          </div>
        </div>

        <div class="card">
          <h3>七步 Checklist</h3>
          <div class="check-list">
            ${TG.CHECKLIST_STEPS.map((step, i) => {
              const done = !!(sheet.checklist && sheet.checklist[step.key]);
              return `<label class="check-item ${done ? 'done' : ''}">
                <span class="step-n">${i + 1}</span>
                <input type="checkbox" data-action="toggle-check" data-sheet="${sheet.id}" data-key="${step.key}" ${done ? 'checked' : ''}/>
                <span>${step.label}</span>
              </label>`;
            }).join('')}
          </div>
        </div>

        <div class="card">
          <h3>转发文案</h3>
          <pre style="white-space:pre-wrap;font-size:0.88rem;color:var(--muted);margin:0 0 0.75rem;font-family:var(--font-ui)">${esc(TG.forwardCopy(sheet))}</pre>
          <button class="btn btn-primary" data-action="copy-forward" data-sheet="${sheet.id}">复制给司机 / 副导</button>
        </div>

        <div class="row" style="margin-top:0.5rem">
          <button class="btn btn-sm" data-action="new-sheet">＋ 另建通告日</button>
        </div>`;
    }

    return `
      <div class="page-head">
        <div>
          <h1>通告</h1>
          <div class="sub">执行台 · 时间轴 / 消场 / 七步</div>
        </div>
        <div class="date-nav">
          <button class="btn btn-sm btn-ghost" data-action="date-prev" aria-label="前一天">‹</button>
          <span class="date-label">${selectedDate}</span>
          <button class="btn btn-sm btn-ghost" data-action="date-next" aria-label="后一天">›</button>
          <button class="btn btn-sm" data-action="date-today">今天</button>
        </div>
      </div>
      ${body}`;
  }

  /* ---------- Schedule (both) ---------- */
  function viewSchedule(forMode) {
    const data = TG.load();
    const conflicts = TG.computeConflicts(data);
    const projects = [...(data.projects || [])].sort((a, b) => (a.startDate < b.startDate ? 1 : -1));

    const cards = projects
      .map((p) => {
        const c = conflicts.projects[p.id] || {};
        const badge =
          c.level === 'red'
            ? `<span class="badge badge-red">冲突红</span>`
            : c.level === 'yellow'
              ? `<span class="badge badge-yellow">冲突黄</span>`
              : `<span class="badge badge-muted">${esc(p.status)}</span>`;
        const energy =
          forMode === 'actor'
            ? `<span class="energy" title="精力">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= (p.energy || 0) ? 'on' : ''}"></i>`).join('')}</span>`
            : '';
        const actorActions =
          forMode === 'actor'
            ? `<div class="row" style="margin-top:0.65rem">
                <button class="btn btn-sm btn-primary" data-action="respond" data-id="${p.id}" data-r="accept">接</button>
                <button class="btn btn-sm" data-action="respond" data-id="${p.id}" data-r="defer">缓</button>
                <button class="btn btn-sm btn-danger" data-action="respond" data-id="${p.id}" data-r="reject">拒</button>
              </div>
              ${p.response ? `<div style="margin-top:0.4rem;font-size:0.8rem;color:var(--muted)">已响应：${esc({ accept: '接', defer: '缓', reject: '拒' }[p.response] || p.response)}${p.privateReason ? ' · 有私密理由' : ''}</div>` : ''}
              ${p.privateReason && forMode === 'actor' ? `<div class="mood">私密理由：${esc(p.privateReason)}</div>` : ''}`
            : `<div class="row" style="margin-top:0.65rem">
                <select data-action="change-status" data-id="${p.id}" class="btn btn-sm" style="border-radius:999px">
                  ${TG.STATUS_ORDER.map((s) => `<option value="${s}" ${s === p.status ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
              </div>`;

        return `<div class="card">
          <div class="row-between">
            <div>
              <strong style="letter-spacing:0.06em">${esc(p.code)}</strong>
              <div style="color:var(--muted);font-size:0.88rem">${esc(p.title)}</div>
            </div>
            <div class="row">${badge}${energy}</div>
          </div>
          <div style="margin-top:0.55rem;font-size:0.85rem;color:var(--muted)">${esc(p.startDate)} → ${esc(p.endDate)}</div>
          ${c.reasons && c.reasons.length ? `<div style="margin-top:0.4rem;font-size:0.8rem;color:${c.level === 'red' ? 'var(--red)' : 'var(--yellow)'}">${c.reasons.map(esc).join(' · ')}</div>` : ''}
          ${actorActions}
        </div>`;
      })
      .join('');

    return `
      <div class="page-head">
        <div>
          <h1>档期</h1>
          <div class="sub">${forMode === 'assistant' ? '建项目 · 改状态 · 红黄冲突' : '接 / 缓 / 拒 · 精力 · 私密理由'}</div>
        </div>
        ${forMode === 'assistant' ? `<button class="btn btn-primary" data-action="new-project">＋ 建项目</button>` : ''}
      </div>
      ${cards || '<div class="card empty">暂无档期。助理可新建，或载入示例。</div>'}
      <p style="font-size:0.78rem;color:var(--faint)">规则：双硬档（锁档/在组/宣发）重叠→红；一方待定→黄；同日在组+商务→黄。</p>`;
  }

  /* ---------- Handoff ---------- */
  function viewHandoff(forMode) {
    return `
      <div class="page-head">
        <div><h1>交接</h1><div class="sub">本机 JSON · 无云账号</div></div>
      </div>
      <div class="card">
        <h3>导出</h3>
        <p style="color:var(--muted);font-size:0.9rem;margin:0 0 0.85rem">完整备份含私密理由；脱敏稿去掉私密理由与路透勾选。</p>
        <div class="row">
          <button class="btn btn-primary" data-action="export-full">导出完整备份</button>
          <button class="btn" data-action="export-sanitized">导出脱敏稿</button>
        </div>
      </div>
      <div class="card">
        <h3>导入</h3>
        <p style="color:var(--muted);font-size:0.9rem;margin:0 0 0.85rem">导入前预览新增/覆盖条数；确认后写入；后导入覆盖同 id。</p>
        <input type="file" accept="application/json,.json" id="import-file" class="sr-only"/>
        <button class="btn" data-action="pick-import">选择 JSON 文件</button>
        <div id="import-preview" class="hidden" style="margin-top:1rem"></div>
      </div>
      ${forMode === 'assistant' ? `<p style="font-size:0.8rem;color:var(--faint)">可将脱敏稿交给工作室；完整备份仅本地保管。</p>` : ''}`;
  }

  /* ---------- Actor today ---------- */
  function viewActorToday() {
    const data = TG.load();
    const today = TG.todayStr();
    const sheets = getSheetsByDate(data, today);
    const sheet = sheets[0];
    const sessions = sheet ? sheet.sessions || [] : [];
    const uncleared = sessions.filter((s) => !s.cleared).length;
    const next = sessions.find((s) => !s.cleared);
    const linesToday = (data.lines || []).filter((l) => l.callSheetDate === today);
    const toStudy = linesToday.filter((l) => !l.revealed).length;

    let nextBlock = '<div class="card empty">今日无通告场次</div>';
    if (next && sheet) {
      const arrival = sheet.arrivalTime || '07:00';
      nextBlock = `
        <div class="card">
          <h3>下一场</h3>
          <div class="countdown" id="countdown" data-arrival="${today}T${arrival}:00">--:--:--</div>
          <div style="color:var(--muted);font-size:0.9rem">相对到场 ${esc(arrival)} · ${esc(sheet.projectCode)} · 场${esc(next.number)} ${esc(next.summary)}</div>
          <div class="stat-grid" style="margin-top:1rem">
            <div class="stat"><span class="n">${uncleared}</span><span class="l">未消场</span></div>
            <div class="stat"><span class="n">${toStudy}</span><span class="l">待背场</span></div>
            <div class="stat"><span class="n">${sessions.length}</span><span class="l">今日场</span></div>
          </div>
        </div>`;
    } else if (sheet) {
      nextBlock = `
        <div class="card">
          <h3>今日通告</h3>
          <p style="margin:0;color:var(--green)">场次已全部消场 ✓</p>
          <div class="stat-grid" style="margin-top:1rem">
            <div class="stat"><span class="n">0</span><span class="l">未消场</span></div>
            <div class="stat"><span class="n">${toStudy}</span><span class="l">待背场</span></div>
            <div class="stat"><span class="n">${sessions.length}</span><span class="l">今日场</span></div>
          </div>
        </div>`;
    }

    const health = data.settings?.healthRedline
      ? `<div class="warn-bar">健康红线：今日需要压缩通告（团队备忘）— 不含病历/用药</div>`
      : '';

    const timeline =
      sheet
        ? `<div class="card"><h3>今日时间轴（只读）</h3>
            <div class="timeline">
              <div class="tl-item"><div class="t">妆造</div><div class="b">${esc(sheet.makeupTime || '—')}</div></div>
              <div class="tl-item"><div class="t">到场</div><div class="b">${esc(sheet.arrivalTime || '—')}</div></div>
              ${sessions.map((s) => `<div class="tl-item"><div class="t">场${esc(s.number)} · ${s.cleared ? '已消' : '待拍'}</div><div class="b">${esc(s.summary)}</div></div>`).join('')}
            </div></div>`
        : '';

    return `
      <div class="page-head">
        <div><h1>今天</h1><div class="sub">${today} · 一眼摘要</div></div>
      </div>
      ${health}
      ${nextBlock}
      ${timeline}`;
  }

  /* ---------- Actor lines ---------- */
  function viewActorLines() {
    const data = TG.load();
    const today = TG.todayStr();
    const filter = window._lineFilter || 'today';
    let lines = data.lines || [];
    if (filter === 'today') lines = lines.filter((l) => l.callSheetDate === today);
    const roles = [...new Set(lines.map((l) => l.role))];

    const list = lines
      .map((l) => {
        const hidden = !l.revealed;
        return `<div class="line-card" data-line="${l.id}">
          <div class="meta">
            <span class="badge badge-muted">${esc(l.role)}</span>
            <span>${esc(l.projectCode)} · 场${esc(l.sessionNumber)}</span>
            <span>${esc(l.callSheetDate)}</span>
            ${l.rewritten ? '<span class="badge badge-yellow">改词</span>' : ''}
          </div>
          <div class="line-mask ${hidden ? 'hidden-text' : ''}" data-action="reveal-line" data-id="${l.id}">${esc(l.text)}</div>
          ${l.moodNote ? `<div class="mood">情绪：${esc(l.moodNote)}</div>` : ''}
          <div class="line-actions">
            <button class="btn btn-sm" data-action="reveal-line" data-id="${l.id}">${hidden ? '揭词' : '再遮'}</button>
            <button class="btn btn-sm" data-action="toggle-rewrite" data-id="${l.id}">${l.rewritten ? '取消改词' : '标改词'}</button>
            <button class="btn btn-sm" data-action="edit-mood" data-id="${l.id}">情绪笔记</button>
          </div>
        </div>`;
      })
      .join('');

    return `
      <div class="page-head">
        <div><h1>台词</h1><div class="sub">遮词练习 · 情绪 · 改词</div></div>
        <div class="seg">
          <button class="${filter === 'today' ? 'active' : ''}" data-action="line-filter" data-f="today">今日场</button>
          <button class="${filter === 'all' ? 'active' : ''}" data-action="line-filter" data-f="all">全部</button>
        </div>
      </div>
      ${roles.length ? `<p style="font-size:0.85rem;color:var(--muted);margin:0 0 0.75rem">角色：${roles.map(esc).join(' · ')}</p>` : ''}
      ${list || '<div class="card empty">暂无台词。载入示例或从助理导入。</div>'}`;
  }

  /* ---------- Business ---------- */
  function viewBiz() {
    const data = TG.load();
    const conflicts = TG.computeConflicts(data);
    const today = TG.todayStr();
    const items = [...(data.business || [])].sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1));

    const list = items
      .map((b) => {
        const c = conflicts.business[b.id] || {};
        const overdue = !b.done && b.dueDate < today;
        const badges = [
          overdue ? '<span class="badge badge-red">逾期</span>' : '',
          c.level === 'yellow' ? '<span class="badge badge-yellow">撞在组</span>' : '',
          b.done ? '<span class="badge badge-green">完成</span>' : '',
        ].join('');
        return `<div class="card">
          <div class="row-between">
            <strong>${esc(b.title)}</strong>
            <div class="row">${badges}</div>
          </div>
          <div style="margin-top:0.4rem;font-size:0.85rem;color:var(--muted)">节点日 ${esc(b.dueDate)}${b.note ? ' · ' + esc(b.note) : ''}</div>
          <div class="row" style="margin-top:0.65rem">
            <label class="toggle"><input type="checkbox" data-action="toggle-biz" data-id="${b.id}" ${b.done ? 'checked' : ''}/> 完成</label>
          </div>
        </div>`;
      })
      .join('');

    return `
      <div class="page-head">
        <div><h1>商务</h1><div class="sub">节点 · 逾期 · 撞在组黄提醒</div></div>
      </div>
      ${list || '<div class="card empty">暂无商务节点</div>'}`;
  }

  /* ---------- Me ---------- */
  function viewMe(forMode) {
    const data = TG.load();
    const s = data.settings || {};
    const pap = s.paparazzi || {};

    const papBlock =
      forMode === 'actor'
        ? `<div class="card">
            <h3>路透自检</h3>
            <div class="stack">
              ${[
                ['phoneLock', '手机锁屏 / 勿亮屏剧本'],
                ['locationOff', '定位与实时分享已关'],
                ['noLive', '不直播、不发即时定位'],
                ['wardrobeCheck', '出场造型再确认'],
                ['exitPlan', '离场路线已对齐助理'],
              ]
                .map(
                  ([k, label]) =>
                    `<label class="toggle"><input type="checkbox" data-action="pap" data-key="${k}" ${pap[k] ? 'checked' : ''}/> ${label}</label>`
                )
                .join('')}
            </div>
          </div>`
        : '';

    const healthBlock =
      forMode === 'actor'
        ? `<div class="card">
            <h3>健康红线</h3>
            <label class="toggle">
              <input type="checkbox" data-action="health" ${s.healthRedline ? 'checked' : ''}/>
              今日需要压缩通告（团队备忘）
            </label>
            <p style="margin:0.6rem 0 0;font-size:0.8rem;color:var(--faint)">仅黄条提醒团队；禁止上传病历、诊断、用药。</p>
          </div>`
        : '';

    return `
      <div class="page-head">
        <div><h1>我的</h1><div class="sub">数据 · 声明</div></div>
      </div>
      ${healthBlock}
      ${papBlock}
      <div class="card">
        <h3>本机数据</h3>
        <p style="color:var(--muted);font-size:0.88rem;margin:0 0 0.85rem">更新于 ${esc(data.updatedAt || '—')} · 通告 ${data.callSheets.length} · 档期 ${data.projects.length}</p>
        <div class="row">
          <button class="btn btn-primary" data-action="load-sample">载入虚构示例</button>
          <button class="btn" data-action="export-full">导出</button>
          ${forMode === 'actor' ? `<button class="btn" data-action="pick-import">导入助理文件</button>` : ''}
          <button class="btn btn-danger" data-action="clear-data">清空数据</button>
        </div>
        <input type="file" accept="application/json,.json" id="import-file" class="sr-only"/>
        <div id="import-preview" class="hidden" style="margin-top:1rem"></div>
        ${forMode === 'actor' ? `<label class="toggle" style="margin-top:1rem"><input type="checkbox" data-action="sanitize-default" ${s.sanitizeDefault ? 'checked' : ''}/> 导出默认脱敏</label>` : ''}
      </div>
      <div class="disclaimer">
        <strong>声明</strong><br/>
        「通告本」为通用一线女演员本地工作台演示；示例全部虚构（如 PROJECT-A），不代表任何真实艺人、剧组或地点。
        不做云同步账号；双机靠导出 JSON → 传输 → 导入。非医疗、非合同、非安保工具。
        地点/酒店字段默认关闭。本页数据仅存于本机浏览器 localStorage。
      </div>`;
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------- Modals ---------- */
  function showModal(html) {
    closeModal();
    const bd = document.createElement('div');
    bd.className = 'modal-backdrop';
    bd.id = 'modal-bd';
    bd.innerHTML = `<div class="modal" role="dialog">${html}</div>`;
    bd.addEventListener('click', (e) => {
      if (e.target === bd) closeModal();
    });
    document.body.appendChild(bd);
    return bd;
  }
  function closeModal() {
    const bd = $('#modal-bd');
    if (bd) bd.remove();
  }

  function modalNewSheet() {
    const today = selectedDate || TG.todayStr();
    showModal(`
      <h3>新建通告</h3>
      <div class="stack">
        <div class="field"><label>日期</label><input type="date" id="m-date" value="${today}"/></div>
        <div class="field"><label>项目代号</label><input type="text" id="m-code" value="PROJECT-A" placeholder="PROJECT-A"/></div>
        <div class="grid-2">
          <div class="field"><label>妆造</label><input type="time" id="m-makeup" value="05:30"/></div>
          <div class="field"><label>交妆</label><input type="time" id="m-handoff" value="06:15"/></div>
        </div>
        <div class="field"><label>到场</label><input type="time" id="m-arrival" value="07:00"/></div>
        <div class="field"><label>备注</label><textarea id="m-notes" placeholder="可选"></textarea></div>
      </div>
      <div class="actions">
        <button class="btn btn-ghost" data-action="close-modal">取消</button>
        <button class="btn btn-primary" data-action="save-sheet">保存</button>
      </div>`);
  }

  function modalNewProject() {
    const t = TG.todayStr();
    showModal(`
      <h3>建项目</h3>
      <div class="stack">
        <div class="field"><label>代号</label><input id="m-code" placeholder="PROJECT-D"/></div>
        <div class="field"><label>名称</label><input id="m-title" placeholder="剧集·虚构"/></div>
        <div class="field"><label>状态</label>
          <select id="m-status">${TG.STATUS_ORDER.map((s) => `<option ${s === '待定' ? 'selected' : ''}>${s}</option>`).join('')}</select>
        </div>
        <div class="grid-2">
          <div class="field"><label>开始</label><input type="date" id="m-start" value="${t}"/></div>
          <div class="field"><label>结束</label><input type="date" id="m-end" value="${t}"/></div>
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-ghost" data-action="close-modal">取消</button>
        <button class="btn btn-primary" data-action="save-project">保存</button>
      </div>`);
  }

  function modalRespond(id, kind) {
    const labels = { accept: '接', defer: '缓', reject: '拒' };
    showModal(`
      <h3>${labels[kind]} · 邀约响应</h3>
      <div class="stack">
        <div class="field"><label>私密理由（脱敏导出时去掉）</label>
          <textarea id="m-reason" placeholder="仅本人可见"></textarea>
        </div>
        <div class="field"><label>精力分 1–5</label>
          <input type="number" id="m-energy" min="1" max="5" value="3"/>
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-ghost" data-action="close-modal">取消</button>
        <button class="btn btn-primary" data-action="save-respond" data-id="${id}" data-r="${kind}">确认</button>
      </div>`);
  }

  function modalStatusReason(id, toStatus) {
    showModal(`
      <h3>改期原因</h3>
      <p style="color:var(--muted);font-size:0.9rem">锁档 → 待定 须填写改期原因</p>
      <div class="field"><label>原因</label><textarea id="m-reason" required></textarea></div>
      <div class="actions">
        <button class="btn btn-ghost" data-action="close-modal">取消</button>
        <button class="btn btn-primary" data-action="confirm-status" data-id="${id}" data-to="${toStatus}">确认</button>
      </div>`);
  }

  /* ---------- Import preview ---------- */
  function showImportPreview(counts) {
    const box = $('#import-preview');
    if (!box) return;
    box.classList.remove('hidden');
    box.innerHTML = `
      <div style="background:var(--bg);border-radius:10px;padding:0.85rem;border:1px solid var(--line)">
        <strong>导入预览</strong>
        <p style="margin:0.4rem 0;color:var(--muted);font-size:0.9rem">新增 <b style="color:var(--green)">${counts.add}</b> · 覆盖 <b style="color:var(--yellow)">${counts.overwrite}</b></p>
        <div style="max-height:120px;overflow:auto;font-size:0.75rem;color:var(--faint)">${counts.detail.slice(0, 40).map(esc).join('<br/>')}</div>
        <div class="row" style="margin-top:0.75rem">
          <button class="btn btn-primary" data-action="confirm-import">确认写入</button>
          <button class="btn btn-ghost" data-action="cancel-import">取消</button>
        </div>
      </div>`;
  }

  /* ---------- Events ---------- */
  function bindMainEvents(root) {
    // countdown
    const cd = $('#countdown', root);
    if (cd) {
      const target = new Date(cd.dataset.arrival).getTime();
      const tick = () => {
        const now = Date.now();
        let diff = target - now;
        const past = diff < 0;
        diff = Math.abs(diff);
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        cd.textContent = `${past ? '+' : ''}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        cd.style.color = past ? 'var(--muted)' : 'var(--text)';
      };
      tick();
      clearInterval(window._cdTimer);
      window._cdTimer = setInterval(tick, 1000);
    }
  }

  function onClick(e) {
    const el = e.target.closest('[data-action]');
    if (!el) {
      // checkbox without being inside data-action handled separately
      return;
    }
    const action = el.dataset.action;

    if (action === 'close-modal') {
      closeModal();
      return;
    }
    if (action === 'date-prev') {
      selectedDate = shiftDate(selectedDate || TG.todayStr(), -1);
      renderShell();
      return;
    }
    if (action === 'date-next') {
      selectedDate = shiftDate(selectedDate || TG.todayStr(), 1);
      renderShell();
      return;
    }
    if (action === 'date-today') {
      selectedDate = TG.todayStr();
      renderShell();
      return;
    }
    if (action === 'new-sheet') {
      modalNewSheet();
      return;
    }
    if (action === 'save-sheet') {
      const date = $('#m-date').value;
      const code = $('#m-code').value.trim() || 'PROJECT-X';
      const data = TG.load();
      data.callSheets.push({
        id: TG.uid('cs'),
        date,
        projectCode: code,
        makeupTime: $('#m-makeup').value,
        handoffTime: $('#m-handoff').value,
        arrivalTime: $('#m-arrival').value,
        notes: $('#m-notes').value,
        locationNote: '',
        sessions: [
          { id: TG.uid('sess'), number: '1', dayNight: '日', inout: '内', summary: '新建场', makeupNote: '', cleared: false },
        ],
        checklist: { wake: false, kit: false, ad: false, driver: false, meal: false, lines: false, hotel: false },
      });
      TG.save(data);
      selectedDate = date;
      closeModal();
      toast('通告已建');
      renderShell();
      return;
    }
    if (action === 'add-session') {
      const data = TG.load();
      const sheet = data.callSheets.find((s) => s.id === el.dataset.sheet);
      if (!sheet) return;
      const n = String((sheet.sessions || []).length + 1);
      sheet.sessions = sheet.sessions || [];
      sheet.sessions.push({
        id: TG.uid('sess'),
        number: n,
        dayNight: '日',
        inout: '内',
        summary: '新场次',
        makeupNote: '',
        cleared: false,
      });
      TG.save(data);
      toast('已加场');
      renderShell();
      return;
    }
    if (action === 'copy-forward') {
      const data = TG.load();
      const sheet = data.callSheets.find((s) => s.id === el.dataset.sheet);
      if (sheet) copyText(TG.forwardCopy(sheet));
      return;
    }
    if (action === 'new-project') {
      modalNewProject();
      return;
    }
    if (action === 'save-project') {
      const code = $('#m-code').value.trim();
      if (!code) {
        toast('请填写代号');
        return;
      }
      const data = TG.load();
      data.projects.push({
        id: TG.uid('proj'),
        code,
        title: $('#m-title').value.trim() || code,
        status: $('#m-status').value,
        startDate: $('#m-start').value,
        endDate: $('#m-end').value,
        energy: 3,
        response: null,
        privateReason: '',
        rescheduleReason: '',
      });
      TG.save(data);
      closeModal();
      toast('项目已建');
      renderShell();
      return;
    }
    if (action === 'respond') {
      modalRespond(el.dataset.id, el.dataset.r);
      return;
    }
    if (action === 'save-respond') {
      const data = TG.load();
      const p = data.projects.find((x) => x.id === el.dataset.id);
      if (p) {
        p.response = el.dataset.r;
        p.privateReason = $('#m-reason').value.trim();
        p.energy = Math.min(5, Math.max(1, parseInt($('#m-energy').value, 10) || 3));
        if (el.dataset.r === 'accept' && p.status === '待定') p.status = '锁档';
        if (el.dataset.r === 'reject') p.status = '已结束';
        TG.save(data);
        toast('已响应');
      }
      closeModal();
      renderShell();
      return;
    }
    if (action === 'confirm-status') {
      const reason = ($('#m-reason') && $('#m-reason').value.trim()) || '';
      if (!reason) {
        toast('请填写改期原因');
        return;
      }
      const data = TG.load();
      const p = data.projects.find((x) => x.id === el.dataset.id);
      if (p) {
        p.status = el.dataset.to;
        p.rescheduleReason = reason;
        TG.save(data);
        toast('状态已改');
      }
      closeModal();
      renderShell();
      return;
    }
    if (action === 'export-full') {
      downloadJSON(TG.load(), `tonggaoben-full-${TG.todayStr()}.json`);
      toast('已导出完整备份');
      return;
    }
    if (action === 'export-sanitized') {
      downloadJSON(TG.sanitize(TG.load()), `tonggaoben-sanitized-${TG.todayStr()}.json`);
      toast('已导出脱敏稿');
      return;
    }
    if (action === 'pick-import') {
      const input = $('#import-file');
      if (input) input.click();
      return;
    }
    if (action === 'confirm-import') {
      if (pendingImport) {
        TG.applyImport(pendingImport);
        pendingImport = null;
        toast('导入完成');
        const box = $('#import-preview');
        if (box) {
          box.classList.add('hidden');
          box.innerHTML = '';
        }
        renderShell();
      }
      return;
    }
    if (action === 'cancel-import') {
      pendingImport = null;
      const box = $('#import-preview');
      if (box) {
        box.classList.add('hidden');
        box.innerHTML = '';
      }
      return;
    }
    if (action === 'load-sample') {
      if (!confirm('载入虚构示例？将覆盖当前本机数据。')) return;
      TG.loadSample();
      selectedDate = TG.todayStr();
      toast('已载入虚构示例');
      renderShell();
      return;
    }
    if (action === 'clear-data') {
      if (!confirm('确认清空本机全部通告本数据？')) return;
      TG.clear();
      selectedDate = TG.todayStr();
      toast('已清空');
      renderShell();
      return;
    }
    if (action === 'reveal-line') {
      const data = TG.load();
      const line = data.lines.find((l) => l.id === el.dataset.id);
      if (line) {
        line.revealed = !line.revealed;
        TG.save(data);
        renderShell();
      }
      return;
    }
    if (action === 'toggle-rewrite') {
      const data = TG.load();
      const line = data.lines.find((l) => l.id === el.dataset.id);
      if (line) {
        line.rewritten = !line.rewritten;
        TG.save(data);
        renderShell();
      }
      return;
    }
    if (action === 'edit-mood') {
      const data = TG.load();
      const line = data.lines.find((l) => l.id === el.dataset.id);
      if (!line) return;
      const v = prompt('情绪笔记', line.moodNote || '');
      if (v === null) return;
      line.moodNote = v;
      TG.save(data);
      renderShell();
      return;
    }
    if (action === 'line-filter') {
      window._lineFilter = el.dataset.f;
      renderShell();
      return;
    }
  }

  function onChange(e) {
    const el = e.target;
    const action = el.dataset.action;
    if (!action) {
      if (el.id === 'import-file' && el.files && el.files[0]) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const obj = JSON.parse(reader.result);
            pendingImport = obj;
            const counts = TG.previewImport(obj);
            showImportPreview(counts);
          } catch (err) {
            toast('JSON 无效');
          }
        };
        reader.readAsText(el.files[0]);
        el.value = '';
      }
      return;
    }
    if (action === 'toggle-clear') {
      const data = TG.load();
      const sheet = data.callSheets.find((s) => s.id === el.dataset.sheet);
      const sess = sheet && (sheet.sessions || []).find((s) => s.id === el.dataset.sess);
      if (sess) {
        sess.cleared = el.checked;
        TG.save(data);
        toast(el.checked ? '已消场' : '取消消场');
        renderShell();
      }
      return;
    }
    if (action === 'toggle-check') {
      const data = TG.load();
      const sheet = data.callSheets.find((s) => s.id === el.dataset.sheet);
      if (sheet) {
        sheet.checklist = sheet.checklist || {};
        sheet.checklist[el.dataset.key] = el.checked;
        TG.save(data);
        renderShell();
      }
      return;
    }
    if (action === 'change-status') {
      const data = TG.load();
      const p = data.projects.find((x) => x.id === el.dataset.id);
      if (!p) return;
      const to = el.value;
      const check = TG.canTransition(p.status, to);
      if (!check.ok) {
        toast(check.msg || '不可跳转');
        el.value = p.status;
        return;
      }
      if (check.needReason) {
        el.value = p.status;
        modalStatusReason(p.id, to);
        return;
      }
      p.status = to;
      TG.save(data);
      toast('状态已更新');
      renderShell();
      return;
    }
    if (action === 'toggle-biz') {
      const data = TG.load();
      const b = data.business.find((x) => x.id === el.dataset.id);
      if (b) {
        b.done = el.checked;
        TG.save(data);
        renderShell();
      }
      return;
    }
    if (action === 'health') {
      const data = TG.load();
      data.settings.healthRedline = el.checked;
      TG.save(data);
      toast(el.checked ? '健康红线已开' : '健康红线已关');
      return;
    }
    if (action === 'pap') {
      const data = TG.load();
      data.settings.paparazzi = data.settings.paparazzi || {};
      data.settings.paparazzi[el.dataset.key] = el.checked;
      TG.save(data);
      return;
    }
    if (action === 'sanitize-default') {
      const data = TG.load();
      data.settings.sanitizeDefault = el.checked;
      TG.save(data);
      return;
    }
  }

  function routeTo() {
    const p = parseHash();
    mode = p.mode;
    route = p.page;
    if (!mode) {
      renderEntry();
    } else {
      // auto-load sample if empty for demo friendliness
      const data = TG.load();
      if (!data.callSheets.length && !data.projects.length) {
        TG.loadSample();
      }
      renderShell();
      window.scrollTo(0, 0);
    }
  }

  function boot() {
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    window.addEventListener('hashchange', routeTo);
    $('#btn-back-entry')?.addEventListener('click', () => go('#/'));
    initEditorial();
    routeTo();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
