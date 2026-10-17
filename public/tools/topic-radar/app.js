'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=u=>{try{const p=new URL(u);return ['http:','https:'].includes(p.protocol)&&!p.username&&!p.password?esc(p.href):'#'}catch{return '#'}};
const fmt=(t,short=false)=>t?new Date(t*1000).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',...(short?{}:{hour:'2-digit',minute:'2-digit',hour12:false})}):'时间未提供';
let state={items:[],sources:[],categories:[]},view='radar',scope='全部',category='全部',selectedDay='',limit=30,currentId=null,polling=false,toastTimer;
const motionGrid=$('#cards'),finePointer=matchMedia('(hover: hover) and (pointer: fine)'),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let pointerCard=null,keyboardCard=null,motionFrame=0;
function redrawCardMotion(){
 cancelAnimationFrame(motionFrame);
 motionFrame=requestAnimationFrame(()=>{
  const active=pointerCard?.isConnected?pointerCard:keyboardCard?.isConnected?keyboardCard:null;
  motionGrid.classList.toggle('has-card-focus',!!active);
  const cx=active?active.offsetLeft+active.offsetWidth/2:0,cy=active?active.offsetTop+active.offsetHeight/2:0;
  motionGrid.querySelectorAll('.card').forEach(card=>{
   const chosen=card===active;card.classList.toggle('is-card-focus',chosen);
   const dx=active?card.offsetLeft+card.offsetWidth/2-cx:0,dy=active?card.offsetTop+card.offsetHeight/2-cy:0;
   card.style.setProperty('--card-push-x',!active||chosen?'0px':Math.abs(dx)>100?(Math.sign(dx)*5)+'px':'0px');
   card.style.setProperty('--card-push-y',!active||chosen?'0px':Math.abs(dy)>100?(Math.sign(dy)*6)+'px':'0px');
  });
 });
}
function resetCardMotion(){pointerCard=null;keyboardCard=null;cancelAnimationFrame(motionFrame);motionGrid.classList.remove('has-card-focus');}
function cardAt(target){return target instanceof Element?target.closest('#cards .card'):null;}
motionGrid.addEventListener('pointerover',event=>{if(!finePointer.matches||event.pointerType==='touch')return;const card=cardAt(event.target);if(card!==pointerCard){pointerCard=card;redrawCardMotion()}});
motionGrid.addEventListener('pointerout',event=>{if(!finePointer.matches)return;const next=cardAt(event.relatedTarget);if(next!==pointerCard){pointerCard=next;redrawCardMotion()}});
motionGrid.addEventListener('pointerleave',()=>{pointerCard=null;redrawCardMotion()});
motionGrid.addEventListener('focusin',event=>{keyboardCard=event.target.matches(':focus-visible')?cardAt(event.target):null;redrawCardMotion()});
motionGrid.addEventListener('focusout',event=>{keyboardCard=cardAt(event.relatedTarget);redrawCardMotion()});
window.addEventListener('blur',()=>{pointerCard=null;keyboardCard=null;redrawCardMotion()});
window.addEventListener('resize',redrawCardMotion);
reducedMotion.addEventListener('change',redrawCardMotion);
const OFFLINE='完整采集、刷新和 AI 需要本机 9155 服务（http://127.0.0.1:9155/）。当前页面只展示已保存的快照，不会生成新数据。';
function snapshotFile(path){const u=new URL(path,'https://radar.local');if(u.pathname==='/api/state'){const day=u.searchParams.get('day');if(day&&state.date&&day!==state.date)throw Error('这份网页快照只有 '+state.date+' 的记录。其他日期需要本机 9155 服务。');}return {'/api/state':'api/state.json','/api/progress':'api/progress.json','/api/reports':'api/reports.json','/api/connections':'api/connections.json','/api/videos':'api/videos.json','/api/source':'api/source.json'}[u.pathname]||'';}
async function api(path,data){if(data!==undefined)throw Error(OFFLINE);const file=snapshotFile(path);if(!file)throw Error(OFFLINE);const r=await fetch(file);if(!r.ok)throw Error(OFFLINE);let d;try{d=await r.json()}catch{throw Error(OFFLINE)}if(d&&typeof d==='object'&&!Array.isArray(d)&&d.error!=null&&d.items==null&&d.query==null&&d.message==null){if(new URL(path,'https://radar.local').pathname==='/api/videos')throw Error('这份快照没有逐条视频列表。免费搜索仍可使用；查询高赞、收录和刷新需要本机 9155 服务。');throw Error(typeof d.error==='string'?d.error:OFFLINE)}return d;}
function toast(s){$('#toast').textContent=s;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,3500);}
function openDialog(id){resetCardMotion();$('#'+id).showModal();}
$$('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).close());
$('#date-label').textContent=new Date().toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai',year:'numeric',month:'long',day:'numeric',weekday:'long'});
async function load(){try{state=await api('/api/state'+(view==='history'&&selectedDay?'?day='+encodeURIComponent(selectedDay):''));render();if(state.refresh?.running)startPoll();}catch(e){toast(e.message);$('#results-label').textContent='读取失败，可重新更新；本机已有记录仍然保留。';}}
function scopedItems(){return state.items.filter(x=>(view!=='saved'||x.favorite)&&(scope==='全部'||x.scopes.includes(scope)));}
function render(){
 $('#saved-count').textContent=state.items.filter(x=>x.favorite).length;
 const enabled=state.sources.filter(x=>x.enabled),ok=enabled.filter(x=>x.health?.ok);
 $('#update-label').textContent=state.last_refresh?'每2小时更新 · 上次 '+fmt(state.last_refresh)+' · 下次 '+fmt(state.next_refresh):'每2小时自动更新 · 尚未采集';
 $('#update-label').title='可用来源 '+ok.length+' / '+enabled.length+'；详细状态在“信息源”查看';
 $('#categories').innerHTML=['全部',...state.categories].map(c=>`<button data-category="${esc(c)}" class="${category===c?'selected':''}">${esc(c)}<b>${scopedItems().filter(x=>c==='全部'||x.categories.includes(c)).length}</b></button>`).join('');
 $$('#categories button').forEach(b=>b.onclick=()=>{category=b.dataset.category;limit=30;render()});
 renderCards();renderSources();renderProgress(state.refresh);
}
function renderCards(){
 resetCardMotion();
 const query=$('#search').value.trim().toLowerCase();let items=scopedItems().filter(x=>(category==='全部'||x.categories.includes(category))&&(!query||[x.title,x.brief?.what,x.brief?.why,...x.categories,...x.evidence.map(e=>e.source)].join(' ').toLowerCase().includes(query)));
 const sort=$('#sort').value;
 if(sort==='heat')items.sort((a,b)=>b.heat-a.heat);if(sort==='newest')items.sort((a,b)=>(b.published||b.captured)-(a.published||a.captured));
 $('#results-label').textContent=`${view==='history'?selectedDay+' 的记录 · ':''}共 ${items.length} 条${category!=='全部'?' · '+category:''}${scope!=='全部'?' · '+scope:''}`;
 $('#cards').innerHTML=items.length?items.slice(0,limit).map(x=>{
  const e=x.evidence.find(e=>!e.stale)||x.evidence[0],c=coverFor(x),b=briefFor(x);
  return `<article class="card"><div class="card-visual"><button class="cover-open" data-detail="${x.id}" aria-label="查看详情：${esc(x.title)}"><img src="${photoPath(c.src)}" alt="${esc(c.alt)}" width="1000" height="520" loading="lazy" decoding="async" class="${c.position==='50% 30%'?'portrait':''}"></button><div class="photo-tags"><span>${esc(x.categories[0])}</span><span>${esc(x.scopes.join(' / '))}</span></div><span class="photo-kind">${esc(c.label)}</span><button class="favorite-star ${x.favorite?'on':''}" data-save="${x.id}" aria-label="${x.favorite?'取消收藏':'收藏选题'}：${esc(x.title)}">${x.favorite?'★':'☆'}</button></div><div class="card-body"><button class="card-title" data-detail="${x.id}">${esc(x.title)}</button><dl class="event-brief"><div><dt>发生了什么</dt><dd>${esc(b.what)}</dd></div><div><dt>${esc(b.why_label)}</dt><dd>${esc(b.why)}</dd></div></dl><div class="story-source"><span>${esc(e?.source||'已归档')}${e?.stale?' · 缓存':''}</span><time>${x.published?'发布 '+fmt(x.published):'榜单 '+fmt(e?.source_time||x.captured)}</time></div><div class="card-actions"><button class="detail-link" data-detail="${x.id}">看详情 <span>→</span></button><a href="${link(x.douyin_search||douyinSearch(x.title))}" target="_blank" rel="noreferrer" title="免费搜索入口，未核实点赞数">抖音参考 ↗</a>${e?`<a class="original-link" href="${link(e.url)}" target="_blank" rel="noreferrer">原文 ↗</a>`:''}</div></div></article>`
 }).join('')+(items.length>limit?'<button id="load-more" class="secondary load-more">再看 30 条</button>':''):`<div class="empty"><h3>${view==='saved'?'把值得拍的题目留下来':state.items.length?'暂时没有符合条件的线索':'从第一次捕捉开始'}</h3><p>${view==='saved'?'点击选题右上角的星星收藏，笔记也会保存在本机。':state.items.length?'换个分类、范围或关键词试试。':'点击“更新热点”，抓取全国热榜和海外公开新闻。失败来源会在“信息源”中说明。'}</p></div>`;
 $$('#cards [data-detail]').forEach(b=>b.onclick=()=>detail(b.dataset.detail));
 $$('#cards [data-save]').forEach(b=>b.onclick=()=>favorite(b.dataset.save));
 bindPhotoFallbacks($('#cards'));
 if($('#load-more'))$('#load-more').onclick=()=>{limit+=30;renderCards()};
}
function briefFor(x){return x.brief||{what:x.evidence.find(e=>e.summary)?.summary?.slice(0,105)||x.title,why:'来源未说明具体起因，打开原文核实。',why_label:'起因待核实'}}
function coverFor(x){return x.cover||{src:'/assets/covers/city.jpg',alt:'城市主题配图',label:'主题配图',credit:'Unsplash · 主题配图',url:'https://unsplash.com/'}}
function photoPath(src){const ok=/^\/(?:assets\/covers\/[a-z0-9-]+|media\/[a-f0-9]{64})\.(?:jpg|png|webp)$/.test(src||'');return esc((ok?src:'/assets/covers/city.jpg').replace(/^\//,''))}
function bindPhotoFallbacks(root){root.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>{if(img.dataset.fallback)return;img.dataset.fallback='1';img.src='assets/covers/city.jpg';img.alt='城市主题配图';const parent=img.closest('.card-visual')||img.closest('figure');if(parent){const label=parent.querySelector('.photo-kind');if(label)label.textContent='主题配图';const credit=parent.querySelector('figcaption');if(credit)credit.textContent='原配图暂不可用 · 城市主题配图'}}));}
async function favorite(id){const x=state.items.find(x=>x.id===id);try{await api('/api/favorite',{id,favorite:!x.favorite,note:x.note});x.favorite=!x.favorite;render();toast(x.favorite?'已收藏到本机':'已取消收藏')}catch(e){toast(e.message)}}
function renderSources(){
 $('#source-list').innerHTML=state.sources.map(s=>{const h=s.health||{};return `<div class="source-row"><div><strong>${esc(s.name)}</strong><small>${esc({hot:'TrendRadar 热榜',rss:'TrendRadar RSS',rsshub:'RSSHub 订阅',watch:'轻量网页监测',changedetection:'changedetection.io'}[s.kind])} · ${esc(s.scope)} · ${esc(s.category)}</small></div><div class="source-health ${h.ok===false?'fail':''}">${!s.enabled?'已暂停':h.ok===undefined?'尚未采集':h.ok?'已接入 · '+h.count+'条':esc(h.error||'来源暂不可用')}<small>${h.checked?'检查 '+fmt(h.checked):''}${h.source_time?' · 源更新 '+fmt(h.source_time):''}</small></div><button class="toggle ${s.enabled?'on':''}" data-toggle="${s.id}">${s.enabled?'已启用':'已暂停'}</button>${s.id.startsWith('custom-')?`<button class="delete-source" data-delete="${s.id}">移除</button>`:''}</div>`}).join('');
 $$('#source-list [data-toggle]').forEach(b=>b.onclick=async()=>{const s=state.sources.find(s=>s.id===b.dataset.toggle);try{await api('/api/source',{id:s.id,enabled:!s.enabled});await load();toast('已保存；启用新来源后请更新热点')}catch(e){toast(e.message)}});
 $$('#source-list [data-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('移除这个信息源？收藏和笔记会保留。'))return;try{await api('/api/source/delete',{id:b.dataset.delete});await load();toast('已移除')}catch(e){toast(e.message)}});
}
function renderProgress(p){const busy=p?.running;$('#refresh').disabled=!!busy;$('#refresh').textContent=busy?'正在捕捉…':'↻ 更新热点';$('#progress').hidden=!busy;if(busy)$('#progress').textContent=`${p.message} ${p.done} / ${p.total}`;}
async function startPoll(){if(polling)return;polling=true;try{for(;;){await new Promise(r=>setTimeout(r,1500));const p=await api('/api/progress');renderProgress(p);if(!p.running){await load();toast(p.message);break;}}}catch(e){toast(e.message)}finally{polling=false}}
$('#refresh').onclick=async()=>{try{await api('/api/refresh',{});renderProgress({running:true,message:'正在连接信息源…',done:0,total:state.sources.filter(x=>x.enabled).length});startPoll()}catch(e){toast(e.message)}};
$$('[data-scope]').forEach(b=>b.onclick=()=>{scope=b.dataset.scope;limit=30;$$('[data-scope]').forEach(x=>x.classList.toggle('selected',x===b));render()});
$('#search').oninput=()=>{limit=30;renderCards()};$('#sort').onchange=renderCards;
$$('[data-view]').forEach(b=>b.onclick=async()=>{
 const old=view;view=b.dataset.view;category='全部';limit=30;$('#search').value='';
 $$('[data-view]').forEach(x=>x.classList.toggle('active',x===b));
 const names={radar:['今天，发生了什么？','看懂一件事，再决定拍什么。',''],saved:['收藏的选题','好问题和你的笔记，都留在这里。',''],history:['每日记录','按日期回看热点与线索。',''],sources:['信息源','全国热榜、行业新闻与全球动态。','']};
 $('#page-title').textContent=names[view][0];$('#page-subtitle').textContent=names[view][1];$('#section-kicker').textContent=names[view][2];$('#radar-panel').hidden=view==='sources';$('#sources-panel').hidden=view!=='sources';$('#history-day').hidden=view!=='history';
 if(view==='history'){try{const days=await api('/api/reports');selectedDay=days[0]||state.date;$('#history-day').innerHTML=(days.length?days:[selectedDay]).map(d=>`<option>${esc(d)}</option>`).join('');await load()}catch(e){toast(e.message)}}else if(old==='history')await load();else render();
});
$('#history-day').onchange=()=>{selectedDay=$('#history-day').value;load()};
function detail(id){
 currentId=id;const x=state.items.find(x=>x.id===id);if(!x)return;
 const dims=x.breakdown?.dimension_scores||{};const labels={info_density:'信息信号',actionability:'可操作性',creator_value:'创作适配',viral_potential:'传播信号',source_authority:'来源信号',freshness:'新鲜度'};
 const a=x.ai;
 $('#detail-content').innerHTML=`<div class="detail-meta">${x.categories.map(c=>`<span class="category-badge">${esc(c)}</span>`).join('')}<span>${esc(x.scopes.join(' / '))}</span></div><h2 class="detail-title">${esc(x.title)}</h2><div class="detail-meta"><span>选题指数 ${x.score}/100</span><span>预测证据：${esc(x.confidence)}</span><span>判断时间 ${fmt(state.generated)}</span></div><div class="judgment"><h3>${esc(x.status)} <span class="status-tag">规则初筛</span></h3><ul>${x.reasons.map(r=>`<li>${esc(r)}</li>`).join('')}</ul><p class="help">尚未核实原文。标题和摘要可能不完整，不能据此认定参数、指控或体验真实。</p></div><h3>可以怎么拍</h3><p class="angle">${esc(x.angle)}</p><h3>原文与线索入口 <small>（${x.evidence.length} 条）</small></h3>${x.evidence.map(e=>`<div class="evidence"><a href="${link(e.url)}" target="_blank" rel="noreferrer">${esc(e.title)} ↗</a><p>${esc(e.summary||'来源未提供摘要，请打开原文查看。')}</p><small>${esc(e.source)}${e.rank?' · 榜单第'+e.rank+'名':''} · ${e.published?'发布 '+fmt(e.published):'未提供发布时间'} · 源更新 ${fmt(e.source_time)}${e.stale?' · ⚠ 已过期或来源失败，不用于当前热度判断':''}</small></div>`).join('')||'<p class="help">已离开当前订阅列表，收藏和笔记仍然保留。</p>'}<h3>相关抖音视频</h3><div id="douyin-content"><p class="help">正在读取相关入口…</p></div><h3>AI 再看一遍</h3><p class="help">连接模型后，可根据上述公开资料补充拍摄角度与不确定性；不发送你的笔记。</p><button id="ai-analyze" class="secondary">${a?'重新 AI 研判':'AI 研判'}</button><div id="ai-output">${a?`<div class="ai-result"><b>${esc(a.judgment)} · AI建议</b>${a.outdated?'<p class="form-error">来源已变化，请重新研判。</p>':''}<p>${esc(a.reason)}</p><p>${esc(a.angle)}</p><ul>${a.uncertainties.map(u=>`<li>${esc(u)}</li>`).join('')}</ul><small>${esc(a.model)} · ${fmt(a.time)} · 待验证预测</small></div>`:''}</div><details><summary>评分和观测记录</summary><p class="help">以下为加权贡献；规则信号输入，不是模型评分。当前指数应用时效衰减，推荐顺序另加同源多样性调整。</p><div class="dimensions">${Object.entries(labels).map(([k,label])=>`<div class="dimension">${label}<b>${(dims[k]||0).toFixed(1)}</b></div>`).join('')}</div><p class="help">${x.history.filter(h=>h.rank).map(h=>`${fmt(h.source_time)} · ${esc(state.sources.find(s=>s.id===h.source)?.name||h.source)} 第${h.rank}名`).join('<br>')||'尚无热榜排名记录；订阅报道不具有平台热榜名次。'}</p></details><h3>我的选题笔记</h3><textarea id="topic-note" class="note-area" placeholder="想问的问题、需要核实的参数、拍摄角度…">${esc(x.note)}</textarea><div class="detail-actions"><button id="note-save" class="primary">保存笔记并收藏</button><span id="note-state" class="help">手动保存到本机</span></div>`;
 const c=coverFor(x),b=briefFor(x),figure=document.createElement('figure');figure.className='detail-photo';figure.innerHTML=`<img src="${photoPath(c.src)}" alt="${esc(c.alt)}" class="${c.position==='50% 30%'?'portrait':''}"><span class="photo-kind">${esc(c.label)}</span><figcaption>${c.url?`<a href="${link(c.url)}" target="_blank" rel="noreferrer">${esc(c.credit)} ↗</a>`:esc(c.credit)}${c.license?` · <a href="${link(c.license)}" target="_blank" rel="noreferrer">许可</a>`:''}</figcaption>`;
 $('#detail-content').prepend(figure);
 const summary=document.createElement('dl');summary.className='event-brief detail-brief';summary.innerHTML=`<div><dt>发生了什么</dt><dd>${esc(b.what)}</dd></div><div><dt>${esc(b.why_label)}</dt><dd>${esc(b.why)}</dd></div>`;$('#detail-content .detail-title').after(summary);
 const judgment=$('#detail-content .judgment'),fold=document.createElement('details');fold.className='judgment-fold';fold.innerHTML='<summary>热度与选题判断</summary>';judgment.replaceWith(fold);fold.append(judgment);bindPhotoFallbacks($('#detail-content'));
 $('#note-save').onclick=async()=>{const note=$('#topic-note').value;try{await api('/api/favorite',{id,favorite:true,note});x.favorite=true;x.note=note;$('#note-state').textContent='已保存';render()}catch(e){$('#note-state').textContent='保存失败，输入已保留，请重试';toast(e.message)}};
 $('#ai-analyze').onclick=async()=>{const b=$('#ai-analyze');b.disabled=true;b.textContent='正在分析…';$('#ai-output').textContent='';try{const data=await api('/api/ai',{id});x.ai=data;if($('#detail').open&&currentId===id){$('#ai-output').innerHTML=`<div class="ai-result"><b>${esc(data.judgment)} · AI建议</b><p>${esc(data.reason)}</p><p>${esc(data.angle)}</p><ul>${data.uncertainties.map(u=>`<li>${esc(u)}</li>`).join('')}</ul><small>${esc(data.model)} · ${fmt(data.time)} · 待验证预测</small></div>`;b.disabled=false;b.textContent='重新 AI 研判'}}catch(e){if($('#detail').open&&currentId===id){$('#ai-output').innerHTML=(a?`<div class="ai-result"><b>${esc(a.judgment)} · AI建议</b><p>${esc(a.reason)}</p><p>${esc(a.angle)}</p><ul>${(a.uncertainties||[]).map(u=>`<li>${esc(u)}</li>`).join('')}</ul><small>${esc(a.model)} · ${fmt(a.time)} · 待验证预测</small></div>`:'')+`<p class="help">${esc(e.message)}</p>`;$('#ai-output').className='';b.disabled=false;b.textContent=a?'重新 AI 研判':'重试 AI 研判'}}};
 if(!$('#detail').open)openDialog('detail');loadVideos(id);
}
$('#method-open').onclick=()=>openDialog('method-dialog');
$('#source-add').onclick=()=>{$('#source-category').innerHTML=state.categories.map(c=>`<option>${esc(c)}</option>`).join('');$('#source-form').reset();$('#source-error').textContent='';openDialog('source-dialog')};
$('#source-form').onsubmit=async e=>{e.preventDefault();const f=e.target,b=f.querySelector('button[type=submit]');b.disabled=true;try{await api('/api/source',Object.fromEntries(new FormData(f)));$('#source-dialog').close();await load();toast('已添加；点击“更新热点”开始采集')}catch(e){$('#source-error').textContent=e.message}finally{b.disabled=false}};
$('#connections-open').onclick=async()=>{try{const cfg=await api('/api/connections'),f=$('#connections-form');f.reset();for(const [k,v] of Object.entries(cfg))if(f.elements[k])f.elements[k].value=v;$('#connections-error').textContent='';openDialog('connections-dialog');localAIStatus()}catch(e){toast(e.message)}};
$('#connections-form').onsubmit=async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));for(const k of ['ai_key','change_key','douyin_key'])if(!data[k])delete data[k];try{await api('/api/connections',data);$('#connections-dialog').close();toast('连接设置已保存；连接状态以实际采集或分析结果为准')}catch(e){$('#connections-error').textContent=e.message}};
$('#export').onclick=()=>{const d=view==='history'?selectedDay:state.date;if(!d){toast('暂无可导出的记录');return}if(d!==state.date){toast('这份网页快照只包含 '+state.date+' 的选题单。其他日期的导出需要本机 9155 服务。');return}const a=document.createElement('a');a.href='api/export.md';a.download='选题雷达-'+d+'.md';document.body.append(a);a.click();a.remove();toast('已下载这份快照的选题单；不包含私人笔记')};
// Native close protection for unsaved notes also works in a regular local preview.
$('#detail').addEventListener('cancel',e=>{const x=state.items.find(x=>x.id===currentId),input=$('#topic-note');if(x&&input&&input.value!==x.note&&!confirm('笔记尚未保存，确定关闭？'))e.preventDefault()});
$('#detail [data-close]').onclick=()=>{const x=state.items.find(x=>x.id===currentId),input=$('#topic-note');if(!x||!input||input.value===x.note||confirm('笔记尚未保存，确定关闭？'))$('#detail').close()};
load();

let aiSetupPolling=false;
async function localAIStatus(){try{const s=await api('/api/local-ai');$('#local-ai-status').textContent=s.message;$('#local-ai-setup').disabled=s.running;$('#local-ai-setup').textContent=s.ready?'重新检查本机AI':'一键准备本机AI';if(s.running&&!aiSetupPolling){aiSetupPolling=true;try{for(;;){await new Promise(r=>setTimeout(r,1500));const p=await api('/api/local-ai');$('#local-ai-status').textContent=p.message;$('#local-ai-setup').disabled=p.running;if(!p.running){if(p.ready){$('#connections-form').elements.ai_mode.value='local';toast('本机AI已就绪')}break}}}finally{aiSetupPolling=false}}}catch(e){$('#local-ai-status').textContent=e.message}}
$('#local-ai-setup').onclick=async()=>{try{await api('/api/local-ai',{});localAIStatus()}catch(e){toast(e.message)}};

// Keep an open page in sync with scheduled server updates. Never touch an edited note.
let backgroundChecking=false;
async function checkBackgroundRefresh(){
 if(backgroundChecking||polling||document.hidden)return;
 backgroundChecking=true;
 try{
  const p=await api('/api/progress');
  if(p.running){renderProgress(p);startPoll();return}
  if(view==='history')return;
  const today=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Shanghai'});
  if(p.last_refresh===state.last_refresh&&p.media_revision===state.media_revision&&today===state.date)return;
  const latest=await api('/api/state');
  if(latest.last_refresh!==state.last_refresh||latest.media_revision!==state.media_revision||latest.date!==state.date){state=latest;render()}
 }catch(e){/* Offline keeps the currently displayed records and draft intact. */}
 finally{backgroundChecking=false}
}
setInterval(checkBackgroundRefresh,30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkBackgroundRefresh()});
window.addEventListener('focus',checkBackgroundRefresh);

function douyinSearch(title){return 'https://www.douyin.com/search/'+encodeURIComponent(title.slice(0,60))+'?type=video'}
function videoList(items){return items.length?items.map(v=>`<div class="video-reference"><a href="${link(v.url)}" target="_blank" rel="noreferrer">${esc(v.title)} ↗</a><div class="video-stat"><b>♡ ${v.likes===null?'点赞未知':Number(v.likes).toLocaleString('zh-CN')+' 赞'}</b><span>${esc(v.author)}</span><small>${v.verified_likes?'数据服务返回 · 本次样本内按赞排序':'人工记录 · 点赞数未自动核实'}</small></div><p class="help">${esc(v.related)} · ${v.published?'发布 '+fmt(v.published)+' · ':''}记录/查询 ${fmt(v.checked)}</p><button class="text-button" data-video-delete="${esc(v.id)}">移除这条参考</button></div>`).join(''):'<p class="help">暂未收录视频。下面的入口是相关搜索，不代表已找到或核实高赞作品。</p>'}
function staticVideoPanel(id,message){const x=state.items.find(item=>item.id===id);const query=(x?.title||'').slice(0,60);const search=x?.douyin_search||douyinSearch(query||'选题');$('#douyin-content').innerHTML=`<div class="video-query"><label>搜索关键词<input id="video-query" value="${esc(query)}" maxlength="60"></label><a id="video-search-link" class="secondary" href="${link(search)}" target="_blank" rel="noreferrer">去抖音找相关视频 ↗</a></div><p class="help">${esc(message)}</p><div id="video-results"><p class="help">暂未收录视频。上面的入口是相关搜索，不代表已找到或核实高赞作品。</p></div>`;$('#video-query').oninput=()=>{$('#video-search-link').href=douyinSearch($('#video-query').value)};}
async function loadVideos(id){
 try{const d=await api('/api/videos?topic='+encodeURIComponent(id));if(currentId!==id||!$('#detail').open)return;
 $('#douyin-content').innerHTML=`<div class="video-query"><label>搜索关键词<input id="video-query" value="${esc(d.query)}" maxlength="60"></label><a id="video-search-link" class="secondary" href="${link(d.search_url)}" target="_blank" rel="noreferrer">去抖音找相关视频 ↗</a>${d.configured?'<button id="video-fetch" class="secondary">查询高赞候选</button>':''}</div><p class="help">${d.configured?'查询会使用已配置的数据服务，可能消耗额度。默认最近7天、1万赞起，取样本内点赞较高的3条；相同关键词2小时内使用缓存。':'当前未连接抖音数据服务，暂不能自动读取真实点赞数。免费搜索和手动收录可用。'}</p><div id="video-status" class="help" role="status"></div><div id="video-results">${videoList(d.items)}</div><details><summary>收录我找到的视频</summary><form id="video-form"><label>抖音视频链接或分享文案<input name="url" required placeholder="粘贴视频分享内容，或抖音视频页链接"></label><label>视频标题<input name="title" required maxlength="600" placeholder="便于核对是否同一件事"></label><div class="form-row"><label>作者（可选）<input name="author" maxlength="100"></label><label>看到的点赞数（可留空）<input name="likes" type="number" min="0" step="1" placeholder="例如 125000"></label></div><p class="help">人工填写的点赞数会标为“未自动核实”，不冒充平台实时统计。</p><p class="form-error" id="video-form-error" role="alert"></p><button class="primary" type="submit">保存视频参考</button></form></details>`;
 $('#video-query').oninput=()=>$('#video-search-link').href=douyinSearch($('#video-query').value);
 function deleteBindings(){$$('#video-results [data-video-delete]').forEach(b=>b.onclick=async()=>{if(!confirm('移除这条视频参考？'))return;try{await api('/api/videos/delete',{topic:id,id:b.dataset.videoDelete});loadVideos(id)}catch(e){$('#video-status').textContent=e.message}})}
 deleteBindings();
 if($('#video-fetch'))$('#video-fetch').onclick=async()=>{const button=$('#video-fetch');button.disabled=true;$('#video-status').textContent='正在查询公开点赞数据…';try{const result=await api('/api/videos/search',{topic:id,query:$('#video-query').value});if(currentId!==id)return;$('#video-results').innerHTML=videoList(result.items);$('#video-status').textContent=result.cached?'已使用2小时内的查询缓存':'查询完成；仅为关键词候选，请核对是否同一事件。';deleteBindings()}catch(e){$('#video-status').textContent=e.message}finally{if(button.isConnected)button.disabled=false}};
 $('#video-form').onsubmit=async event=>{event.preventDefault();const form=event.target,button=form.querySelector('button[type=submit]');button.disabled=true;try{await api('/api/videos/save',{topic:id,...Object.fromEntries(new FormData(form))});loadVideos(id);toast('视频参考已保存；人工点赞数标注为未自动核实')}catch(e){$('#video-form-error').textContent=e.message;button.disabled=false}};
 }catch(e){if(currentId===id&&$('#detail').open)staticVideoPanel(id,e.message)}
}
