/**
 * 通告本 · 共享数据层（localStorage）
 * 助理版 / 本人版读写同一份；导入预览后确认；后导入覆盖冲突键。
 */
(function (global) {
  const STORAGE_KEY = 'tonggaoben.v1';
  const STATUS_ORDER = ['待定', '锁档', '在组', '宣发', '已结束'];
  const HARD = new Set(['锁档', '在组', '宣发']);
  const CHECKLIST_STEPS = [
    { key: 'wake', label: '叫早' },
    { key: 'kit', label: '开工箱' },
    { key: 'ad', label: '通知副导' },
    { key: 'driver', label: '通知司机' },
    { key: 'meal', label: '取餐' },
    { key: 'lines', label: '确认无戏份' },
    { key: 'hotel', label: '回酒店后勤' },
  ];

  function uid(prefix) {
    return (prefix || 'id') + '-' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  function emptyStore() {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      callSheets: [],
      projects: [],
      business: [],
      lines: [],
      settings: {
        healthRedline: false,
        sanitizeDefault: true,
        locationEnabled: false,
        paparazzi: {
          phoneLock: false,
          locationOff: false,
          noLive: false,
          wardrobeCheck: false,
          exitPlan: false,
        },
      },
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyStore();
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return emptyStore();
      data.callSheets = data.callSheets || [];
      data.projects = data.projects || [];
      data.business = data.business || [];
      data.lines = data.lines || [];
      data.settings = Object.assign(emptyStore().settings, data.settings || {});
      return data;
    } catch (e) {
      return emptyStore();
    }
  }

  function save(data) {
    data.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    global.dispatchEvent(new CustomEvent('tonggaoben:change', { detail: data }));
    return data;
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
    const empty = emptyStore();
    global.dispatchEvent(new CustomEvent('tonggaoben:change', { detail: empty }));
    return empty;
  }

  /** 虚构示例：无真实艺人名、酒店、医疗数据 */
  function sampleData() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tY = tomorrow.getFullYear();
    const tM = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const tD = String(tomorrow.getDate()).padStart(2, '0');
    const tomorrowStr = `${tY}-${tM}-${tD}`;
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nY = nextWeek.getFullYear();
    const nM = String(nextWeek.getMonth() + 1).padStart(2, '0');
    const nD = String(nextWeek.getDate()).padStart(2, '0');
    const nextWeekStr = `${nY}-${nM}-${nD}`;
    const in10 = new Date(today);
    in10.setDate(in10.getDate() + 10);
    const iY = in10.getFullYear();
    const iM = String(in10.getMonth() + 1).padStart(2, '0');
    const iD = String(in10.getDate()).padStart(2, '0');
    const in10Str = `${iY}-${iM}-${iD}`;
    const overdue = new Date(today);
    overdue.setDate(overdue.getDate() - 2);
    const oY = overdue.getFullYear();
    const oM = String(overdue.getMonth() + 1).padStart(2, '0');
    const oD = String(overdue.getDate()).padStart(2, '0');
    const overdueStr = `${oY}-${oM}-${oD}`;

    const sheetId = uid('cs');
    const s1 = uid('sess');
    const s2 = uid('sess');
    const s3 = uid('sess');
    const pA = uid('proj');
    const pB = uid('proj');
    const pC = uid('proj');

    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      callSheets: [
        {
          id: sheetId,
          date: todayStr,
          projectCode: 'PROJECT-A',
          makeupTime: '05:30',
          handoffTime: '06:15',
          arrivalTime: '07:00',
          notes: '夜戏转日戏，注意妆造换场节奏（虚构示例）',
          locationNote: '',
          sessions: [
            { id: s1, number: '12', dayNight: '日', inout: '外', summary: '巷口对峙·第一遍', makeupNote: '素淡', cleared: false },
            { id: s2, number: '13', dayNight: '日', inout: '内', summary: '审讯室·独白', makeupNote: '泪妆预备', cleared: false },
            { id: s3, number: '14', dayNight: '夜', inout: '外', summary: '天台收尾', makeupNote: '风吹造型', cleared: true },
          ],
          checklist: { wake: true, kit: true, ad: false, driver: false, meal: false, lines: false, hotel: false },
        },
        {
          id: uid('cs'),
          date: tomorrowStr,
          projectCode: 'PROJECT-A',
          makeupTime: '06:00',
          handoffTime: '06:45',
          arrivalTime: '07:30',
          notes: '明日通告预备',
          locationNote: '',
          sessions: [
            { id: uid('sess'), number: '15', dayNight: '日', inout: '内', summary: '办公室·对戏', makeupNote: '正装', cleared: false },
            { id: uid('sess'), number: '16', dayNight: '日', inout: '外', summary: '停车场·追逐', makeupNote: '运动装', cleared: false },
          ],
          checklist: { wake: false, kit: false, ad: false, driver: false, meal: false, lines: false, hotel: false },
        },
      ],
      projects: [
        {
          id: pA,
          code: 'PROJECT-A',
          title: '剧集·虚构甲',
          status: '在组',
          startDate: todayStr,
          endDate: nextWeekStr,
          energy: 4,
          response: 'accept',
          privateReason: '',
          rescheduleReason: '',
        },
        {
          id: pB,
          code: 'PROJECT-B',
          title: '电影·虚构乙',
          status: '锁档',
          startDate: tomorrowStr,
          endDate: in10Str,
          energy: 3,
          response: null,
          privateReason: '',
          rescheduleReason: '',
        },
        {
          id: pC,
          code: 'PROJECT-C',
          title: '商务活动·虚构丙',
          status: '待定',
          startDate: nextWeekStr,
          endDate: nextWeekStr,
          energy: 2,
          response: null,
          privateReason: '想留白休息（私密，脱敏会去掉）',
          rescheduleReason: '',
        },
      ],
      business: [
        {
          id: uid('biz'),
          title: '品牌试镜·虚构丁',
          dueDate: overdueStr,
          done: false,
          note: '素材待确认',
        },
        {
          id: uid('biz'),
          title: '杂志封面拍摄·虚构戊',
          dueDate: todayStr,
          done: false,
          note: '与在组日可能撞车',
        },
        {
          id: uid('biz'),
          title: '端板对账·虚构己',
          dueDate: in10Str,
          done: false,
          note: '',
        },
      ],
      lines: [
        {
          id: uid('line'),
          role: '角色·青',
          projectCode: 'PROJECT-A',
          sessionNumber: '12',
          callSheetDate: todayStr,
          text: '你以为我还会信吗？这一次，我自己走。',
          moodNote: '克制、冷',
          rewritten: false,
          revealed: false,
        },
        {
          id: uid('line'),
          role: '角色·青',
          projectCode: 'PROJECT-A',
          sessionNumber: '13',
          callSheetDate: todayStr,
          text: '灯灭之前，把话说完。我不是来求情的。',
          moodNote: '紧绷、爆发前',
          rewritten: true,
          revealed: false,
        },
        {
          id: uid('line'),
          role: '角色·白',
          projectCode: 'PROJECT-A',
          sessionNumber: '14',
          callSheetDate: todayStr,
          text: '风很大。你先下去，我随后。',
          moodNote: '轻、收',
          rewritten: false,
          revealed: false,
        },
        {
          id: uid('line'),
          role: '角色·青',
          projectCode: 'PROJECT-A',
          sessionNumber: '15',
          callSheetDate: tomorrowStr,
          text: '文件在第三格。别翻错了。',
          moodNote: '公事公办',
          rewritten: false,
          revealed: false,
        },
      ],
      settings: {
        healthRedline: false,
        sanitizeDefault: true,
        locationEnabled: false,
        paparazzi: {
          phoneLock: false,
          locationOff: false,
          noLive: false,
          wardrobeCheck: false,
          exitPlan: false,
        },
      },
    };
  }

  function loadSample() {
    return save(sampleData());
  }

  function datesOverlap(aStart, aEnd, bStart, bEnd) {
    return aStart <= bEnd && bStart <= aEnd;
  }

  /** 冲突：双硬红；一方待定黄；同日在组+商务黄 */
  function computeConflicts(data) {
    const projects = data.projects || [];
    const business = data.business || [];
    const byId = {};
    projects.forEach((p) => {
      byId[p.id] = { level: null, reasons: [] };
    });

    for (let i = 0; i < projects.length; i++) {
      for (let j = i + 1; j < projects.length; j++) {
        const a = projects[i];
        const b = projects[j];
        if (a.status === '已结束' || b.status === '已结束') continue;
        if (!datesOverlap(a.startDate, a.endDate, b.startDate, b.endDate)) continue;
        const aHard = HARD.has(a.status);
        const bHard = HARD.has(b.status);
        const aPend = a.status === '待定';
        const bPend = b.status === '待定';
        if (aHard && bHard) {
          byId[a.id].level = 'red';
          byId[b.id].level = 'red';
          byId[a.id].reasons.push(`与 ${b.code} 双硬档重叠`);
          byId[b.id].reasons.push(`与 ${a.code} 双硬档重叠`);
        } else if ((aHard && bPend) || (bHard && aPend) || (aPend && bPend)) {
          if (byId[a.id].level !== 'red') byId[a.id].level = 'yellow';
          if (byId[b.id].level !== 'red') byId[b.id].level = 'yellow';
          byId[a.id].reasons.push(`与 ${b.code} 含待定重叠`);
          byId[b.id].reasons.push(`与 ${a.code} 含待定重叠`);
        }
      }
    }

    const onSetDays = new Set();
    projects
      .filter((p) => p.status === '在组')
      .forEach((p) => {
        const start = new Date(p.startDate + 'T00:00:00');
        const end = new Date(p.endDate + 'T00:00:00');
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const ys = d.getFullYear();
          const ms = String(d.getMonth() + 1).padStart(2, '0');
          const ds = String(d.getDate()).padStart(2, '0');
          onSetDays.add(`${ys}-${ms}-${ds}`);
        }
      });

    const bizFlags = {};
    business.forEach((b) => {
      bizFlags[b.id] = { level: null, reasons: [] };
      if (!b.done && onSetDays.has(b.dueDate)) {
        bizFlags[b.id].level = 'yellow';
        bizFlags[b.id].reasons.push('与在组日撞车');
        projects
          .filter((p) => p.status === '在组' && b.dueDate >= p.startDate && b.dueDate <= p.endDate)
          .forEach((p) => {
            if (byId[p.id].level !== 'red') byId[p.id].level = 'yellow';
            byId[p.id].reasons.push(`商务「${b.title}」同日`);
          });
      }
    });

    return { projects: byId, business: bizFlags };
  }

  function canTransition(from, to) {
    if (from === to) return { ok: true };
    if (from === '待定' && to === '已结束') return { ok: true };
    if (from === '锁档' && to === '待定') return { ok: true, needReason: true };
    const fi = STATUS_ORDER.indexOf(from);
    const ti = STATUS_ORDER.indexOf(to);
    if (fi < 0 || ti < 0) return { ok: false, msg: '未知状态' };
    if (ti === fi + 1) return { ok: true };
    return { ok: false, msg: `不可从「${from}」直接到「${to}」。允许：待定→锁档→在组→宣发→已结束；待定→已结束；锁档→待定须写改期原因。` };
  }

  function sanitize(data) {
    const clone = JSON.parse(JSON.stringify(data));
    (clone.projects || []).forEach((p) => {
      delete p.privateReason;
    });
    (clone.callSheets || []).forEach((cs) => {
      if (!clone.settings?.locationEnabled) {
        cs.locationNote = '';
      }
    });
    if (clone.settings) {
      delete clone.settings.paparazzi;
    }
    clone._sanitized = true;
    clone._note = clone.settings?.healthRedline
      ? '艺人侧备注：今日需要压缩通告（团队备忘）'
      : undefined;
    return clone;
  }

  function previewImport(incoming) {
    const cur = load();
    const counts = { add: 0, overwrite: 0, detail: [] };
    function mergeKey(arrName, keyField) {
      const curArr = cur[arrName] || [];
      const inArr = incoming[arrName] || [];
      const map = new Map(curArr.map((x) => [x[keyField], x]));
      inArr.forEach((item) => {
        if (map.has(item[keyField])) {
          counts.overwrite++;
          counts.detail.push(`覆盖 ${arrName}:${item[keyField]}`);
        } else {
          counts.add++;
          counts.detail.push(`新增 ${arrName}:${item[keyField]}`);
        }
      });
    }
    mergeKey('callSheets', 'id');
    mergeKey('projects', 'id');
    mergeKey('business', 'id');
    mergeKey('lines', 'id');
    if (incoming.settings) {
      counts.detail.push('将合并 settings');
    }
    return counts;
  }

  function applyImport(incoming) {
    const cur = load();
    function mergeArr(arrName, keyField) {
      const map = new Map((cur[arrName] || []).map((x) => [x[keyField], x]));
      (incoming[arrName] || []).forEach((item) => {
        map.set(item[keyField], item);
      });
      cur[arrName] = Array.from(map.values());
    }
    mergeArr('callSheets', 'id');
    mergeArr('projects', 'id');
    mergeArr('business', 'id');
    mergeArr('lines', 'id');
    if (incoming.settings) {
      cur.settings = Object.assign({}, cur.settings, incoming.settings);
    }
    return save(cur);
  }

  function forwardCopy(sheet) {
    const list = (sheet.sessions || [])
      .map((s) => `${s.number}场${s.dayNight}${s.inout} ${s.summary}`)
      .join('；');
    return `【通告本】${sheet.date} ${sheet.projectCode}｜妆造${sheet.makeupTime || '—'} 到场${sheet.arrivalTime || '—'}｜场次${list || '—'}｜备注${sheet.notes || '—'}`;
  }

  function todayStr() {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }

  global.TG = {
    STORAGE_KEY,
    STATUS_ORDER,
    CHECKLIST_STEPS,
    uid,
    emptyStore,
    load,
    save,
    clear,
    sampleData,
    loadSample,
    computeConflicts,
    canTransition,
    sanitize,
    previewImport,
    applyImport,
    forwardCopy,
    todayStr,
  };
})(window);
