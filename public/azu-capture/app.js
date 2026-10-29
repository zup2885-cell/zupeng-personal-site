import { cropRect, safeName, createZip } from './core.js';
const $ = id => document.getElementById(id);
const state = { items: [], selected: new Set(), db: null, ready: false, urls: new Map(), draft: null, crop: null, bitmap: null, stream: null, captureToken: 0, undo: null, toastTimer: null, importing: false, recording: false };
const encoder = canvas => new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('图片导出失败，请重试。')), 'image/png'));
function message(text, undo = false) {
  clearTimeout(state.toastTimer); $('toast').querySelector('span').textContent = text;
  $('undo').hidden = !undo; $('toast').hidden = false;
  state.toastTimer = setTimeout(() => { $('toast').hidden = true; }, undo ? 15000 : 6500);
}
function fail(error) { console.error(error); message(error?.message || '操作未完成，请重试。'); }
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('azu-capture-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('images', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('请关闭其他阿祖截图标签页后重新打开。'));
  });
}
function transact(mode, action) {
  return new Promise((resolve, reject) => {
    const tx = state.db.transaction('images', mode), store = tx.objectStore('images');
    let result; const request = action(store);
    if (request) request.onsuccess = () => { result = request.result; };
    tx.oncomplete = () => resolve(result); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error('保存未完成。'));
  });
}
async function persist(items, remove = false) {
  if (!state.ready) throw new Error('收集盒还未加载完成，请稍后重试。');
  if (state.db) {
    try { await transact('readwrite', store => { for (const item of items) remove ? store.delete(item.id) : store.put(item); }); }
    catch { throw new Error('浏览器空间不足或保存被限制，请先下载图片，释放空间后重试。'); }
  }
}
async function addImage(blob, name, width, height) {
  const item = { id: crypto.randomUUID(), name: name || '阿祖截图', blob, width, height, created: Date.now() };
  await persist([item]); state.items.unshift(item); render(); return item;
}
function render() {
  const grid = $('grid'); grid.replaceChildren();
  const ids = new Set(state.items.map(item => item.id));
  for (const [id, url] of state.urls) if (!ids.has(id)) { URL.revokeObjectURL(url); state.urls.delete(id); }
  for (const item of state.items) {
    if (!state.urls.has(item.id)) state.urls.set(item.id, URL.createObjectURL(item.blob));
    const card = document.createElement('article'); card.className = 'image-card'; card.dataset.id = item.id;
    const preview = document.createElement('button'); preview.className = 'thumbnail'; preview.setAttribute('aria-label', `查看 ${item.name}`);
    const img = document.createElement('img'); img.src = state.urls.get(item.id); img.alt = item.name; img.loading = 'lazy'; preview.append(img);
    preview.addEventListener('click', () => openEditor(item.blob, item.name, item.id).catch(fail));
    const label = document.createElement('label'); label.className = 'check';
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = state.selected.has(item.id); checkbox.setAttribute('aria-label', `选择 ${item.name}`);
    checkbox.addEventListener('change', () => { checkbox.checked ? state.selected.add(item.id) : state.selected.delete(item.id); updateSelection(); }); label.append(checkbox);
    const title = document.createElement('h3'); title.textContent = item.name;
    const meta = document.createElement('div'); meta.className = 'image-meta';
    const size = document.createElement('span'); size.textContent = `${item.width} × ${item.height}`;
    const time = document.createElement('span'); time.textContent = new Date(item.created).toLocaleDateString('zh-CN', { month:'2-digit',day:'2-digit' }); meta.append(size, time);
    card.append(preview, label, title, meta); grid.append(card);
  }
  $('count').textContent = String(state.items.length).padStart(2, '0'); $('empty').hidden = state.items.length > 0; updateSelection();
}
function updateSelection() {
  for (const card of $('grid').children) { const selected = state.selected.has(card.dataset.id); card.classList.toggle('selected', selected); card.querySelector('input').checked = selected; }
  $('select-all').checked = state.items.length > 0 && state.selected.size === state.items.length;
  $('select-all').indeterminate = state.selected.size > 0 && state.selected.size < state.items.length;
  $('select-all').disabled = !state.items.length;
  $('selection-label').textContent = state.selected.size ? `已选 ${state.selected.size} 张` : `${state.items.length} 张图片`;
  $('remove').disabled = !state.selected.size; $('export').disabled = !state.items.length;
  $('export').firstChild.textContent = state.selected.size ? '下载所选 ' : '打包下载 ';
}
function canvasFromBitmap(bitmap, rect) {
  const r = rect || { x:0, y:0, width:bitmap.width, height:bitmap.height };
  const canvas = document.createElement('canvas'); canvas.width = r.width; canvas.height = r.height;
  canvas.getContext('2d').drawImage(bitmap, r.x, r.y, r.width, r.height, 0, 0, r.width, r.height); return canvas;
}
async function decode(blob) {
  if (blob.size > 30 * 1024 * 1024) throw new Error('单张图片请控制在 30 MB 内。');
  const image = await createImageBitmap(blob);
  if (image.width * image.height > 40_000_000) { image.close(); throw new Error('图片超过 4000 万像素，请缩小后导入。'); }
  return image;
}
async function importImages(files) {
  if (state.importing) { message('上一批图片正在导入，请稍等。'); return; }
  if (!state.ready) { message('收集盒正在加载，请稍等。'); return; }
  const valid = [...files].filter(f => /^image\/(png|jpeg|webp|gif|avif|bmp)$/.test(f.type));
  if (!valid.length) { message('请选择 PNG、JPG、WebP 等图片文件。'); return; }
  state.importing = true; $('import').disabled = true; let count = 0, lastError = '';
  try {
    for (const file of valid) {
      let bitmap;
      try { bitmap = await decode(file); const blob = await encoder(canvasFromBitmap(bitmap)); await addImage(blob, file.name?.replace(/\.[^.]+$/, '') || '粘贴的图片', bitmap.width, bitmap.height); count++; }
      catch (error) { lastError = error.message || '图片格式无法读取'; }
      finally { bitmap?.close(); }
    }
    message(`已收好 ${count} 张图片。${lastError ? `部分未导入：${lastError}` : ''}`);
  } finally { state.importing = false; $('import').disabled = false; $('files').value = ''; }
}
let editorToken = 0;
async function openEditor(blob, name, id = null) {
  const token = ++editorToken;
  const bitmap = await decode(blob);
  if (token !== editorToken) { bitmap.close(); return; }
  state.bitmap?.close(); state.bitmap = bitmap; state.draft = { blob, name, id }; state.crop = null;
  $('image-name').value = name; $('editor-title').textContent = id ? '让好点子，更聚焦。' : '留住你想要的部分。';
  const canvas = $('crop-canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height; canvas.getContext('2d').drawImage(bitmap,0,0);
  updateCrop(); if (!$('editor').open) $('editor').showModal();
}
function updateCrop() {
  const box = $('crop-box'), r = state.crop, canvas = $('crop-canvas'); box.hidden = !r;
  if (r) { box.style.left = `${r.x / canvas.width * 100}%`; box.style.top = `${r.y / canvas.height * 100}%`; box.style.width = `${r.width / canvas.width * 100}%`; box.style.height = `${r.height / canvas.height * 100}%`; }
  $('crop-info').textContent = r ? `选区 ${r.width} × ${r.height} 像素 · 拖动可重新框选` : '拖动框选裁剪范围，也可以保留整张。';
  $('save').textContent = state.draft?.id ? (r ? '保存裁剪副本' : '保存名称') : '保存到收集盒';
}
function currentBlob() { return state.crop ? encoder(canvasFromBitmap(state.bitmap, state.crop)) : Promise.resolve(state.draft.blob); }
let pointerStart = null;
function point(event) {
  const canvas = $('crop-canvas'), rect = canvas.getBoundingClientRect();
  return { x:(event.clientX-rect.left)/rect.width*canvas.width, y:(event.clientY-rect.top)/rect.height*canvas.height };
}
$('crop-canvas').addEventListener('pointerdown', event => { if(event.button !== 0) return; pointerStart = point(event); event.currentTarget.setPointerCapture(event.pointerId); state.crop = null; updateCrop(); });
$('crop-canvas').addEventListener('pointermove', event => { if (!pointerStart) return; state.crop = cropRect(pointerStart, point(event), state.bitmap.width, state.bitmap.height); updateCrop(); });
function finishCrop() { pointerStart = null; if (state.crop && (state.crop.width < 3 || state.crop.height < 3)) state.crop = null; updateCrop(); }
$('crop-canvas').addEventListener('pointerup', finishCrop); $('crop-canvas').addEventListener('pointercancel', finishCrop);
$('reset-crop').onclick = () => { state.crop = null; updateCrop(); };
$('close-editor').onclick = () => $('editor').close();
$('editor').addEventListener('close', () => { editorToken++; state.bitmap?.close(); state.bitmap = null; state.draft = null; state.crop = null; pointerStart = null; });
$('save').onclick = async () => {
  if (!state.draft || !state.bitmap) return;
  const draft = state.draft, crop = state.crop, width = crop?.width || state.bitmap.width, height = crop?.height || state.bitmap.height;
  const name = $('image-name').value.trim() || '阿祖截图'; $('save').disabled = true;
  try {
    const blob = await currentBlob();
    if (draft.id && !crop) { const original = state.items.find(item => item.id === draft.id); const next = {...original, name}; await persist([next]); Object.assign(original, next); render(); }
    else await addImage(blob, name, width, height);
    $('editor').close(); message(crop && draft.id ? '已保存裁剪副本，原图仍在。' : '收好了。');
  } catch (error) { fail(error); } finally { $('save').disabled = false; }
};
function download(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
$('download-one').onclick = async () => { try { const name = safeName($('image-name').value); download(await currentBlob(), `${name}.png`); } catch (error) { fail(error); } };
$('copy').onclick = async () => {
  if (!navigator.clipboard?.write || !window.ClipboardItem) { message('这个浏览器暂不支持复制图片，请下载 PNG。'); return; }
  try { await navigator.clipboard.write([new ClipboardItem({ 'image/png':currentBlob() })]); message('图片已复制，可以粘贴到聊天或文档里。'); }
  catch { message('未能复制图片，请允许剪贴板访问，或下载 PNG。'); }
};
function stopCapture() {
  state.captureToken++; state.stream?.getTracks().forEach(track => track.stop()); state.stream = null;
  $('screen-preview').srcObject = null; $('start-capture').disabled = false; $('take-shot').disabled = true;
  if (!state.recording) $('start-record').disabled = false;
}
$('start-capture').onclick = async () => {
  if (!navigator.mediaDevices?.getDisplayMedia) { message('当前浏览器不支持在线截屏。请用桌面版 Chrome / Edge，或导入系统截图。'); return; }
  if (state.recording) return;
  const token = ++state.captureToken; $('start-capture').disabled = true; $('start-record').disabled = true;
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video:true, audio:false, selfBrowserSurface:'exclude' });
    if (token !== state.captureToken) { stream.getTracks().forEach(t => t.stop()); return; }
    state.stream = stream; const video = $('screen-preview'); video.srcObject = stream;
    stream.getVideoTracks()[0].addEventListener('ended', () => { if (state.stream === stream) { $('capture-dialog').close(); stopCapture(); } }, { once:true });
    $('capture-dialog').showModal(); await video.play();
    if (state.stream === stream) $('take-shot').disabled = false;
  } catch (error) {
    $('capture-dialog').close(); stopCapture();
    message(error.name === 'NotAllowedError' ? '未开始截屏。你可以重新选择画面，或导入系统截图。' : '无法读取屏幕。请使用桌面浏览器，并检查系统的屏幕录制权限。');
  }
};
$('cancel-capture').onclick = () => $('capture-dialog').close();
$('capture-dialog').addEventListener('close', stopCapture);
$('take-shot').onclick = async () => {
  const video = $('screen-preview'); if (!video.videoWidth || !video.videoHeight || !state.stream) return;
  $('take-shot').disabled = true;
  try {
    const canvas = document.createElement('canvas'); canvas.width = video.videoWidth; canvas.height = video.videoHeight; canvas.getContext('2d').drawImage(video,0,0);
    const blob = await encoder(canvas); stopCapture(); $('capture-dialog').close();
    await openEditor(blob, `截图 ${new Date().toLocaleString('zh-CN', {hour12:false})}`);
  } catch (error) { stopCapture(); $('capture-dialog').close(); fail(error); }
};
window.addEventListener('pagehide', () => { stopCapture(); endRecording(false); });
$('import').onclick = () => $('files').click(); $('files').onchange = () => importImages($('files').files);
document.addEventListener('paste', event => { if (event.target instanceof HTMLInputElement || document.querySelector('dialog[open]')) return; const files = [...(event.clipboardData?.items || [])].filter(i => i.kind === 'file').map(i => i.getAsFile()).filter(Boolean); if (files.length) { event.preventDefault(); importImages(files); } });
let dragDepth = 0;
document.addEventListener('dragover', event => { if (event.dataTransfer.types.includes('Files')) event.preventDefault(); });
document.addEventListener('drop', event => { if (event.dataTransfer.files.length) event.preventDefault(); });
$('drop-area').addEventListener('dragenter', event => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); dragDepth++; $('drop-area').classList.add('dragging'); } });
$('drop-area').addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; $('drop-area').classList.remove('dragging'); } });
$('drop-area').addEventListener('drop', event => { event.preventDefault(); dragDepth=0; $('drop-area').classList.remove('dragging'); importImages(event.dataTransfer.files); });
$('select-all').onchange = () => { state.selected = new Set($('select-all').checked ? state.items.map(i => i.id) : []); updateSelection(); };
$('remove').onclick = async () => {
  const removed = state.items.filter(i => state.selected.has(i.id)); if (!removed.length) return;
  try { await persist(removed, true); state.undo = removed; const ids = new Set(removed.map(i => i.id)); state.items = state.items.filter(i => !ids.has(i.id)); state.selected.clear(); render(); message(`已移除 ${removed.length} 张图片。`, true); } catch (error) { fail(error); }
};
$('undo').onclick = async () => {
  if (!state.undo) return; const items = state.undo; $('undo').disabled = true;
  try { await persist(items); state.items.push(...items); state.items.sort((a,b) => b.created-a.created); state.undo = null; render(); message('已恢复图片。'); } catch (error) { fail(error); } finally { $('undo').disabled=false; }
};
$('export').onclick = async () => {
  const items = state.items.filter(i => !state.selected.size || state.selected.has(i.id)); if (!items.length) return;
  const bytes = items.reduce((n, item) => n+item.blob.size,0); if (bytes > 250 * 1024 * 1024) { message('这批图片超过 250 MB，请选中一部分，分批下载。'); return; }
  $('export').disabled = true;
  try { const zip = await createZip(items); download(zip, `阿祖截图-${new Date().toISOString().slice(0,10)}.zip`); message(`已打包 ${items.length} 张图片。`); }
  catch (error) { fail(error); } finally { updateSelection(); }
};
$('demo').onclick = async () => {
  $('demo').disabled = true;
  try {
    const c = document.createElement('canvas'); c.width=1200; c.height=800; const ctx=c.getContext('2d');
    ctx.fillStyle='#eceadb'; ctx.fillRect(0,0,1200,800); ctx.fillStyle='#d9613d'; ctx.beginPath(); ctx.arc(930,350,170,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#263832'; ctx.font='bold 110px sans-serif'; ctx.fillText('MAKE',80,235); ctx.fillText('SOMETHING',80,350); ctx.fillText('GOOD.',80,465);
    ctx.font='22px sans-serif'; ctx.fillText('AZU CAPTURE / 仅供试用的示例图片',80,700);
    await openEditor(await encoder(c), '阿祖截图 · 示例');
  } catch (error) { fail(error); } finally { $('demo').disabled=false; }
};
let recorder = null, recordChunks = [], recordTimer = null, recordStarted = 0, recordStream = null, recordDiscard = false, recordStopping = false, recordToken = 0;
let trimBlob = null, trimUrl = '', trimDuration = 0, trimJob = 0;
function webmMime() {
  if (typeof MediaRecorder === 'undefined') return '';
  return ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type)) || '';
}
function clock(seconds) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  return `${String(minutes).padStart(2, '0')}:${String(Math.floor(safe % 60)).padStart(2, '0')}`;
}
function clockFine(seconds) {
  const safe = Math.max(0, seconds);
  return `${Math.floor(safe / 60)}:${(safe % 60).toFixed(1).padStart(4, '0')}`;
}
function cleanupRecord() {
  recordToken++; clearInterval(recordTimer); recordTimer = null; recordStream?.getTracks().forEach(track => track.stop()); recordStream = null; recorder = null;
  state.recording = false; recordStopping = false; $('record-preview').srcObject = null;
  if ($('record-dialog').open) $('record-dialog').close();
  if (!$('capture-dialog').open) { $('start-capture').disabled = false; $('start-record').disabled = false; }
}
function endRecording(save) {
  if (!state.recording || recordStopping) { if (!save) cleanupRecord(); return; }
  recordStopping = true; recordDiscard = !save;
  if (recorder && recorder.state === 'recording') recorder.stop();
  else cleanupRecord();
}
function trimRange() {
  const steps = Number($('trim-end').max) || 1;
  let start = Number($('trim-start').value) / steps * trimDuration;
  let end = Number($('trim-end').value) / steps * trimDuration;
  if (end < start) [start, end] = [end, start];
  if (end - start < 0.2) end = Math.min(trimDuration, start + 0.2);
  if (end > trimDuration) { end = trimDuration; start = Math.max(0, end - 0.2); }
  return { start, end };
}
function paintTrim(seek) {
  const { start, end } = trimRange();
  $('trim-info').textContent = `将保留 ${clockFine(start)} – ${clockFine(end)}，大约 ${(end - start).toFixed(1)} 秒。`;
  if (seek) { const video = $('trim-video'); try { video.currentTime = seek === 'end' ? end : start; } catch { /* not seekable yet */ } }
  return { start, end };
}
function openTrim(blob, duration) {
  trimJob++; if (trimUrl) URL.revokeObjectURL(trimUrl);
  trimBlob = blob; trimUrl = URL.createObjectURL(blob); trimDuration = duration;
  const video = $('trim-video');
  const apply = () => {
    const next = Number.isFinite(video.duration) && video.duration > 0 && video.duration < 1e7 ? video.duration : duration;
    trimDuration = next;
    const steps = Math.max(1, Math.round(next * 10));
    $('trim-start').max = $('trim-end').max = String(steps);
    $('trim-start').value = '0'; $('trim-end').value = String(steps);
    paintTrim();
  };
  video.onloadedmetadata = apply; video.src = trimUrl;
  $('trim-progress').hidden = true; $('download-trim').disabled = false;
  if (!$('trim-dialog').open) $('trim-dialog').showModal();
  if (video.readyState >= 1) apply();
}
function seekVideo(video, time) {
  return new Promise(resolve => {
    if (Math.abs((video.currentTime || 0) - time) < 0.05) { resolve(); return; }
    const timer = setTimeout(resolve, 2000);
    video.addEventListener('seeked', () => { clearTimeout(timer); resolve(); }, { once: true });
    try { video.currentTime = time; } catch { clearTimeout(timer); resolve(); }
  });
}
async function exportTrim() {
  if (!trimBlob || $('download-trim').disabled) return;
  const { start, end } = paintTrim();
  const job = ++trimJob;
  const whole = start <= 0.15 && end >= trimDuration - 0.15;
  if (whole) { download(trimBlob, `阿祖录屏-${Date.now()}.webm`); message('这一段好了，已经开始下载。'); return; }
  const video = $('trim-video');
  if (!video.videoWidth) { message('画面还没准备好，请稍等再下载。'); return; }
  const mime = webmMime();
  if (!mime) { message('这个浏览器不能导出剪辑。请改用桌面版 Chrome 或 Edge。'); return; }
  $('download-trim').disabled = true; $('trim-progress').hidden = false;
  $('trim-progress').textContent = '正在剪出这一段…请稍等，不要关闭。';
  const width = video.videoWidth - video.videoWidth % 2, height = video.videoHeight - video.videoHeight % 2;
  if (width < 2 || height < 2) { $('download-trim').disabled = false; message('画面还没准备好，请稍等再下载。'); return; }
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  const stream = canvas.captureStream(30);
  const rec = new MediaRecorder(stream, { mimeType: mime });
  const parts = [];
  const done = new Promise((resolve, reject) => {
    rec.ondataavailable = event => { if (event.data?.size) parts.push(event.data); };
    rec.onstop = () => resolve(new Blob(parts, { type: 'video/webm' }));
    rec.onerror = () => reject(new Error('剪辑没有完成，请再试一次。'));
  });
  try {
    video.pause(); video.muted = true; await seekVideo(video, start);
    if (job !== trimJob) return;
    ctx.drawImage(video, 0, 0, width, height); rec.start(100); await video.play();
    await new Promise((resolve, reject) => {
      const tick = () => {
        if (job !== trimJob) { reject(new Error('已取消剪辑。')); return; }
        ctx.drawImage(video, 0, 0, width, height);
        if (video.currentTime >= end - 0.03 || video.ended) { video.pause(); resolve(); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    if (rec.state === 'recording') rec.stop();
    const blob = await done;
    if (job !== trimJob) return;
    download(blob, `阿祖录屏-${Date.now()}.webm`);
    $('trim-progress').textContent = '已经开始下载。';
    message('这一段好了，已经开始下载。');
  } catch (error) {
    if (error?.message !== '已取消剪辑。') fail(error);
  } finally {
    stream.getTracks().forEach(track => track.stop());
    if (job === trimJob) $('download-trim').disabled = false;
  }
}
$('start-record').onclick = async () => {
  if (!navigator.mediaDevices?.getDisplayMedia) { message('当前浏览器不支持在线录屏。请用桌面版 Chrome / Edge，或导入系统截图。'); return; }
  if (state.recording || state.stream) return;
  const mime = webmMime();
  if (!mime) { message('这个浏览器不能保存录屏。请改用桌面版 Chrome 或 Edge。'); return; }
  $('start-record').disabled = true; $('start-capture').disabled = true;
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const token = ++recordToken;
    recordStream = stream; state.recording = true; recordDiscard = false; recordStopping = false; recordChunks = [];
    const rec = new MediaRecorder(stream, { mimeType: mime }); recorder = rec;
    rec.ondataavailable = event => { if (event.data?.size) recordChunks.push(event.data); };
    rec.onstop = () => {
      const blob = new Blob(recordChunks, { type: 'video/webm' });
      const duration = Math.max(0, (performance.now() - recordStarted) / 1000);
      const save = !recordDiscard;
      cleanupRecord();
      if (save && blob.size && duration >= 0.2) openTrim(blob, duration);
      else if (save) message('这段太短了，还没来得及留下画面。');
    };
    const video = $('record-preview'); video.srcObject = stream;
    if (!$('record-dialog').open) $('record-dialog').showModal();
    await video.play();
    if (token !== recordToken) return;
    recordStarted = performance.now(); rec.start(200);
    $('record-time').textContent = '00:00';
    recordTimer = setInterval(() => { $('record-time').textContent = clock((performance.now() - recordStarted) / 1000); }, 250);
    stream.getVideoTracks()[0].addEventListener('ended', () => endRecording(true), { once: true });
  } catch (error) {
    recordDiscard = true; cleanupRecord();
    message(error?.name === 'NotAllowedError' ? '未开始录屏。你可以重新选择画面。' : '无法读取屏幕。请使用桌面浏览器，并检查系统的屏幕录制权限。');
  }
};
$('record-stop').onclick = () => endRecording(true);
$('cancel-record').onclick = () => endRecording(false);
$('record-dialog').addEventListener('close', () => { if (state.recording) endRecording(false); });
$('trim-start').addEventListener('input', () => { if (Number($('trim-start').value) > Number($('trim-end').value)) $('trim-start').value = $('trim-end').value; paintTrim('start'); });
$('trim-end').addEventListener('input', () => { if (Number($('trim-end').value) < Number($('trim-start').value)) $('trim-end').value = $('trim-start').value; paintTrim('end'); });
$('download-trim').onclick = () => exportTrim().catch(fail);
$('close-trim').onclick = () => { trimJob++; $('trim-video').pause(); $('trim-dialog').close(); };
$('trim-dialog').addEventListener('close', () => { trimJob++; $('trim-video').pause(); });
async function init() {
  try { state.db = await openDB(); state.items = (await transact('readonly', store => store.getAll())).sort((a,b) => b.created-a.created); }
  catch { state.db = null; $('storage-note').textContent = '当前浏览器不允许本地保存：图片仅在本次页面中保留，关闭前请下载。'; message('当前使用临时收集盒，关闭页面前记得下载。'); }
  state.ready=true; render();
  if (!navigator.mediaDevices?.getDisplayMedia) $('capture-hint').textContent = '当前浏览器暂不支持直接截屏或录屏，可导入或粘贴系统截图；在线功能请用桌面版 Chrome / Edge。';
}
init();
