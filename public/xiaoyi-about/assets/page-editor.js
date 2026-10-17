'use strict';

(() => {
  const storageKey = 'xiaoyi-page-content-v1';
  const main = document.querySelector('main');
  const toggle = document.querySelector('#toggle-page-editor');
  const toolbar = document.querySelector('#page-editor-toolbar');
  const status = document.querySelector('#page-editor-status');
  if (!main || !toggle || !toolbar) return;

  const originals = new Map();
  const added = new Map();
  const history = [];
  let editing = false;
  let selected = null;
  let dirty = false;
  let storageAvailable = true;

  const signature = value => {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  };

  function cleanHtml(value) {
    const template = document.createElement('template');
    template.innerHTML = value;
    const allowed = new Set(['SPAN', 'STRONG', 'EM', 'B', 'I', 'A', 'BR']);
    function clean(node) {
      if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent);
      if (node.nodeType !== Node.ELEMENT_NODE) return document.createTextNode('');
      if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'SVG', 'IMG'].includes(node.tagName)) return document.createTextNode('');
      if (!allowed.has(node.tagName)) {
        const fragment = document.createDocumentFragment();
        node.childNodes.forEach(child => fragment.append(clean(child)));
        if (['DIV', 'P'].includes(node.tagName)) fragment.append(document.createElement('br'));
        return fragment;
      }
      const result = document.createElement(node.tagName.toLowerCase());
      if (node.tagName === 'A') {
        const href = node.getAttribute('href') || '';
        if (/^(https?:\/\/|#)/i.test(href)) result.setAttribute('href', href);
        if (node.getAttribute('target') === '_blank') {
          result.target = '_blank';
          result.rel = 'noopener noreferrer';
        }
        if (node.classList.contains('cite')) result.className = 'cite';
      }
      if (node.tagName === 'SPAN') {
        ['--letter-angle', '--letter-y'].forEach(property => {
          const value = node.style.getPropertyValue(property).trim();
          if (/^-?\d+(\.\d+)?(deg|px)$/.test(value)) result.style.setProperty(property, value);
        });
        if (node.getAttribute('aria-hidden') === 'true') result.setAttribute('aria-hidden', 'true');
      }
      node.childNodes.forEach(child => result.append(clean(child)));
      return result;
    }
    const result = document.createElement('div');
    template.content.childNodes.forEach(node => result.append(clean(node)));
    return result.innerHTML;
  }

  const excluded = '.chart-panel,.audience-panel,#gender-ring,#audience-caption';
  main.querySelectorAll(':scope > section').forEach(section => {
    const counters = {};
    section.querySelectorAll('h1,h2,h3,h4,p,dt,dd,caption,th,td').forEach(node => {
      if (node.closest(excluded)) return;
      const tag = node.tagName.toLowerCase();
      counters[tag] = (counters[tag] || 0) + 1;
      const key = `${section.id}:${tag}:${counters[tag]}`;
      node.dataset.contentKey = key;
      originals.set(key, {node, html: node.innerHTML, signature: signature(node.innerHTML)});
    });
  });

  function markEditable(node) {
    node.setAttribute('contenteditable', 'plaintext-only');
    node.setAttribute('spellcheck', 'false');
  }

  function allNodes() {
    return [...originals.values()].map(item => item.node).concat([...added.values()].map(item => item.node));
  }

  function capture() {
    const changes = {};
    originals.forEach(({node, html, signature: base}, key) => {
      const hidden = node.classList.contains('content-removed');
      if (!hidden && node.innerHTML === html) return;
      const next = cleanHtml(node.innerHTML);
      if (hidden || next !== cleanHtml(html)) changes[key] = {html: next, hidden, base};
    });
    const additions = [...added.entries()].map(([key, item]) => ({
      key, tag: item.tag, section: item.section, anchor: item.anchor, html: cleanHtml(item.node.innerHTML)
    }));
    return {version: 1, changes, additions};
  }

  function checkpoint() {
    history.push(capture());
    if (history.length > 30) history.shift();
    refreshControls();
  }

  function setStatus(message) {
    status.textContent = message;
  }

  function refreshControls() {
    toolbar.querySelector('[data-editor-action="delete"]').disabled = !selected;
    toolbar.querySelector('[data-editor-action="undo"]').disabled = history.length === 0;
    toolbar.querySelector('[data-editor-action="save"]').disabled = !dirty;
  }

  function select(node) {
    allNodes().forEach(item => item.classList.toggle('content-selected', item === node));
    selected = node || null;
    refreshControls();
  }

  function changed() {
    dirty = true;
    setStatus('有未保存修改');
    refreshControls();
  }

  function apply(state) {
    added.forEach(item => item.node.remove());
    added.clear();
    originals.forEach(({node, html}) => {
      node.innerHTML = html;
      node.classList.remove('content-removed', 'content-selected');
    });
    let conflicts = 0;
    Object.entries(state.changes || {}).forEach(([key, change]) => {
      const item = originals.get(key);
      if (!item || typeof change.html !== 'string') return;
      if (change.base !== item.signature) { conflicts++; return; }
      item.node.innerHTML = cleanHtml(change.html);
      item.node.classList.toggle('content-removed', change.hidden === true);
    });
    (Array.isArray(state.additions) ? state.additions : []).slice(0, 150).forEach(item => {
      if (!item || !['p', 'h3'].includes(item.tag) || typeof item.key !== 'string' || typeof item.html !== 'string') return;
      const section = document.getElementById(item.section);
      if (!section || section.parentElement !== main || added.has(item.key) || originals.has(item.key)) return;
      const node = document.createElement(item.tag);
      node.dataset.contentKey = item.key;
      node.dataset.editorAdded = 'true';
      node.innerHTML = cleanHtml(item.html);
      node.className = 'user-content-block';
      const anchor = originals.get(item.anchor)?.node || added.get(item.anchor)?.node;
      if (anchor && anchor.closest('section') === section) anchor.after(node);
      else section.append(node);
      added.set(item.key, {...item, node});
    });
    const hero = document.querySelector('#hero-title');
    if (hero) hero.setAttribute('aria-label', hero.textContent.trim());
    if (editing) allNodes().forEach(markEditable);
    select(null);
    return conflicts;
  }

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved?.version === 1) {
      const conflicts = apply(saved);
      if (conflicts) setStatus('网页已更新，部分旧修改需重新核对');
    }
  } catch {
    storageAvailable = false;
  }

  function save() {
    const state = capture();
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      storageAvailable = true;
      dirty = false;
      setStatus('已保存到当前浏览器');
      refreshControls();
      return true;
    } catch {
      storageAvailable = false;
      setStatus('浏览器无法保存，请先复制修改');
      return false;
    }
  }

  function enter() {
    editing = true;
    document.documentElement.classList.add('page-editing');
    allNodes().forEach(markEditable);
    toolbar.hidden = false;
    toggle.textContent = '保存并退出';
    toggle.setAttribute('aria-pressed', 'true');
    setStatus(storageAvailable ? '点击正文文字即可修改 · 仅保存在当前浏览器' : '浏览器保存不可用，可复制修改');
    refreshControls();
  }

  function leave() {
    if (dirty && !save()) return;
    editing = false;
    document.documentElement.classList.remove('page-editing');
    allNodes().forEach(node => {
      node.removeAttribute('contenteditable');
      node.removeAttribute('spellcheck');
    });
    select(null);
    toolbar.hidden = true;
    toggle.textContent = '编辑内容';
    toggle.setAttribute('aria-pressed', 'false');
    const hero = document.querySelector('#hero-title');
    if (hero) hero.setAttribute('aria-label', hero.textContent.trim());
  }

  toggle.addEventListener('click', () => editing ? leave() : enter());

  main.addEventListener('click', event => {
    if (!editing) return;
    const node = event.target.closest('[data-content-key]');
    if (node && !node.classList.contains('content-removed')) {
      if (event.target.closest('a')) event.preventDefault();
      select(node);
    }
  });
  main.addEventListener('focusin', event => {
    if (editing && event.target.matches('[data-content-key]')) select(event.target);
  });
  main.addEventListener('beforeinput', event => {
    if (editing && event.target.closest('[data-content-key]')) checkpoint();
  });
  main.addEventListener('input', event => {
    if (editing && event.target.closest('[data-content-key]')) changed();
  });
  main.addEventListener('paste', event => {
    if (!editing || !event.target.closest('[data-content-key]')) return;
    const text = event.clipboardData?.getData('text/plain');
    if (typeof text !== 'string') return;
    event.preventDefault();
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    checkpoint();
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    changed();
  });

  function addText(tag) {
    checkpoint();
    const section = selected?.closest('section') || document.querySelector('#assistant-projects') || main.querySelector('section');
    const anchor = selected?.dataset.contentKey || null;
    const key = `user:${crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)}`;
    const node = document.createElement(tag);
    node.dataset.contentKey = key;
    node.dataset.editorAdded = 'true';
    node.className = 'user-content-block';
    node.textContent = tag === 'h3' ? '点击填写新标题' : '点击填写新内容';
    if (selected) selected.after(node);
    else section.append(node);
    added.set(key, {node, tag, section: section.id, anchor});
    markEditable(node);
    select(node);
    changed();
    node.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    node.scrollIntoView({block: 'nearest', behavior: 'auto'});
  }

  toolbar.addEventListener('click', async event => {
    const action = event.target.closest('[data-editor-action]')?.dataset.editorAction;
    if (!action) return;
    if (action === 'paragraph') addText('p');
    else if (action === 'heading') addText('h3');
    else if (action === 'delete' && selected) {
      checkpoint();
      const key = selected.dataset.contentKey;
      if (added.has(key)) { selected.remove(); added.delete(key); }
      else selected.classList.add('content-removed');
      select(null);
      changed();
      setStatus('已删除，可撤销');
    } else if (action === 'undo' && history.length) {
      apply(history.pop());
      changed();
      setStatus('已撤销上一步');
    } else if (action === 'save') save();
    else if (action === 'reset') {
      checkpoint();
      apply({changes: {}, additions: []});
      changed();
      setStatus('已恢复原版，可撤销；保存后生效');
    } else if (action === 'copy') {
      try {
        await navigator.clipboard.writeText(JSON.stringify(capture(), null, 2));
        setStatus('已复制修改，可粘贴给小菊');
      } catch {
        setStatus('无法复制，请检查浏览器剪贴板权限');
      }
    }
  });

  refreshControls();
})();
