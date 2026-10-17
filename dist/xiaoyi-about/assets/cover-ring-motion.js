(() => {
  'use strict';
  // Cover ornament: two interlocking open rings with rounded, polished edges, glossy pearls and a
  // twinkling star. Lit by a key light plus a warm bounce from the red wall, floating gently and
  // tilting toward the pointer.
  const canvas = document.querySelector('.cover-paper-canvas');
  if (!canvas) return;
  const wrapper = canvas.closest('.cover-art');
  const hero = wrapper.closest('.hero') || document.body;
  const gl = canvas.getContext('webgl', {
    alpha: true, antialias: true, depth: true, stencil: false,
    premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'low-power'
  });
  if (!gl) return; // The SVG stays visible if GPU rendering is unavailable.

  const vertexSource = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;
    uniform mat4 uModel;
    uniform mat4 uProjection;
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vec4 position = uModel * vec4(aPosition, 1.0);
      vPosition = position.xyz;
      vNormal = mat3(uModel) * aNormal;
      position.z -= 6.5;
      gl_Position = uProjection * position;
    }
  `;
  const fragmentSource = `
    precision mediump float;
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform vec3 uColor;
    uniform float uGloss;
    uniform float uGlow;
    void main() {
      vec3 n = normalize(vNormal);
      vec3 v = normalize(vec3(0.0, 0.0, 6.5) - vPosition);
      if (dot(n, v) < 0.0) n = -n;
      vec3 key = normalize(vec3(-0.55, 0.8, 1.2));
      vec3 bounce = normalize(vec3(0.7, -0.65, 0.45));
      float wrap = (dot(n, key) + 0.35) / 1.35;
      float diffuse = clamp(wrap, 0.0, 1.0);
      float fill = max(dot(n, bounce), 0.0);
      vec3 h = normalize(key + v);
      float spec = pow(max(dot(n, h), 0.0), mix(40.0, 120.0, uGloss)) * mix(0.35, 0.9, uGloss);
      float sheen = pow(max(dot(n, h), 0.0), 7.0) * 0.08;
      float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);
      vec3 shade = uColor * (0.64 + 0.42 * diffuse);
      shade += vec3(1.0, 0.42, 0.22) * fill * 0.22;            // warm bounce from the red wall
      shade += vec3(1.0, 0.5, 0.32) * fresnel * 0.38;           // edges pick up the background
      shade *= 0.88 + 0.12 * n.y;                                // soft occlusion underneath
      shade += vec3(1.0, 0.98, 0.94) * (spec + sheen);
      shade += uColor * uGlow;
      gl_FragColor = vec4(shade, 1.0);
    }
  `;
  function shader(type, source) {
    const result = gl.createShader(type);
    gl.shaderSource(result, source);
    gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error('Ring shader unavailable');
    return result;
  }
  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  } catch { return; }
  gl.useProgram(program);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clearColor(0, 0, 0, 0);

  const vertices = [];
  const push = (p, n) => vertices.push(p[0], p[1], p[2], n[0], n[1], n[2]);
  const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  // Grid surface from a function returning [position, normal] for (u, v) in [0,1]².
  function surface(fn, uSteps, vSteps) {
    for (let i = 0; i < uSteps; i++) for (let j = 0; j < vSteps; j++) {
      const a = fn(i / uSteps, j / vSteps), b = fn((i + 1) / uSteps, j / vSteps);
      const c = fn((i + 1) / uSteps, (j + 1) / vSteps), d = fn(i / uSteps, (j + 1) / vSteps);
      for (const [p, n] of [a, b, c, a, c, d]) push(p, n);
    }
  }

  // Open ring: a rounded-rectangle (superellipse) tube swept around a circle, with rounded ends.
  const R = 0.985, halfWidth = 0.19, halfDepth = 0.068, power = 4;
  const gap = 0.64, start = gap / 2, span = Math.PI * 2 - gap;
  const section = t => {
    const c = Math.cos(t), s = Math.sin(t);
    const u = halfWidth * Math.sign(c) * Math.abs(c) ** (2 / power);
    const w = halfDepth * Math.sign(s) * Math.abs(s) ** (2 / power);
    const gu = Math.sign(u) * Math.abs(u / halfWidth) ** (power - 1) / halfWidth;
    const gw = Math.sign(w) * Math.abs(w / halfDepth) ** (power - 1) / halfDepth;
    return {u, w, gu, gw};
  };
  surface((p, q) => {
    const angle = start + span * p, {u, w, gu, gw} = section(q * Math.PI * 2);
    const dir = [Math.cos(angle), Math.sin(angle)];
    return [[dir[0] * (R + u), dir[1] * (R + u), w], norm([dir[0] * gu, dir[1] * gu, gw])];
  }, 180, 36);
  for (const [angle, sign] of [[start, -1], [start + span, 1]]) {
    const dir = [Math.cos(angle), Math.sin(angle)], tangent = [-dir[1] * sign, dir[0] * sign];
    surface((p, q) => {
      const s = p, shrink = Math.sqrt(Math.max(0, 1 - s * s));
      const {u, w, gu, gw} = section(q * Math.PI * 2);
      const along = s * halfWidth;
      const n = norm([dir[0] * gu * shrink + tangent[0] * s * 6, dir[1] * gu * shrink + tangent[1] * s * 6, gw * shrink]);
      return [[dir[0] * (R + u * shrink) + tangent[0] * along, dir[1] * (R + u * shrink) + tangent[1] * along, w * shrink], n];
    }, 14, 36);
  }
  const ringMesh = {first: 0, count: vertices.length / 6};

  const pearlStart = vertices.length / 6, pearlRadius = 0.066;
  surface((p, q) => {
    const lat = Math.PI * p, lon = Math.PI * 2 * q;
    const n = [Math.sin(lat) * Math.cos(lon), Math.cos(lat), Math.sin(lat) * Math.sin(lon)];
    return [n.map(x => x * pearlRadius), n];
  }, 18, 28);
  const pearlMesh = {first: pearlStart, count: vertices.length / 6 - pearlStart};

  // Four-point star with a softly domed face.
  const starStart = vertices.length / 6, outline = [];
  const curves = [
    [[0,1],[.12,.23],[.23,.12],[1,0]], [[1,0],[.23,-.12],[.12,-.23],[0,-1]],
    [[0,-1],[-.12,-.23],[-.23,-.12],[-1,0]], [[-1,0],[-.23,.12],[-.12,.23],[0,1]]
  ];
  for (const curve of curves) for (let i = 0; i < 18; i++) {
    const t = i / 18, s = 1 - t, k = [s*s*s, 3*s*s*t, 3*s*t*t, t*t*t];
    outline.push([curve.reduce((n, pt, j) => n + k[j] * pt[0], 0) * .22, curve.reduce((n, pt, j) => n + k[j] * pt[1], 0) * .26]);
  }
  const dome = .045, edge = .012;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length];
    for (const side of [1, -1]) {
      const tip = [0, 0, dome * side];
      const pa = [a[0], a[1], edge * side], pb = [b[0], b[1], edge * side];
      const n = norm([(a[0] + b[0]) * .9, (a[1] + b[1]) * .9, side * 1.2]);
      const ordered = side > 0 ? [tip, pa, pb] : [tip, pb, pa];
      for (const p of ordered) push(p, p === tip ? [0, 0, side] : n);
    }
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy), n = [dy / l, -dx / l, 0];
    for (const p of [[a[0],a[1],edge],[a[0],a[1],-edge],[b[0],b[1],-edge],[a[0],a[1],edge],[b[0],b[1],-edge],[b[0],b[1],edge]]) push(p, n);
  }
  const starMesh = {first: starStart, count: vertices.length / 6 - starStart};

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPosition'), normal = gl.getAttribLocation(program, 'aNormal');
  gl.enableVertexAttribArray(position);
  gl.enableVertexAttribArray(normal);
  gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 24, 0);
  gl.vertexAttribPointer(normal, 3, gl.FLOAT, false, 24, 12);
  const uniforms = {
    model: gl.getUniformLocation(program, 'uModel'),
    projection: gl.getUniformLocation(program, 'uProjection'),
    color: gl.getUniformLocation(program, 'uColor'),
    gloss: gl.getUniformLocation(program, 'uGloss'),
    glow: gl.getUniformLocation(program, 'uGlow')
  };
  const identity = () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  function multiply(a, b) {
    const result = new Float32Array(16);
    for (let column = 0; column < 4; column++) for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 4; k++) result[column * 4 + row] += a[k * 4 + row] * b[column * 4 + k];
    }
    return result;
  }
  const chain = (...ms) => ms.reduce((a, b) => multiply(a, b));
  function rotation(axis, angle) {
    const m = identity(), c = Math.cos(angle), s = Math.sin(angle);
    if (axis === 'x') { m[5]=c; m[6]=s; m[9]=-s; m[10]=c; }
    if (axis === 'y') { m[0]=c; m[2]=-s; m[8]=s; m[10]=c; }
    if (axis === 'z') { m[0]=c; m[1]=s; m[4]=-s; m[5]=c; }
    return m;
  }
  function translate(x, y = 0, z = 0) { const m = identity(); m[12] = x; m[13] = y; m[14] = z; return m; }
  function scale(s) { const m = identity(); m[0] = m[5] = m[10] = s; return m; }

  let projectionReady = false;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.min(1200, Math.round(rect.width * ratio)));
    const height = Math.max(1, Math.round(width * rect.height / rect.width));
    if (width === canvas.width && height === canvas.height && projectionReady) return;
    canvas.width = width; canvas.height = height;
    gl.viewport(0, 0, width, height);
    const f = 1 / Math.tan(0.30), near = 0.1, far = 30;
    gl.uniformMatrix4fv(uniforms.projection, false, new Float32Array([
      f / (width / height),0,0,0, 0,f,0,0,
      0,0,(far+near)/(near-far),-1, 0,0,2*far*near/(near-far),0
    ]));
    projectionReady = true;
  }

  // Pointer tilt, eased so the rings lean toward the cursor without jitter.
  const tilt = {x: 0, y: 0, tx: 0, ty: 0};
  hero.addEventListener('pointermove', event => {
    const box = hero.getBoundingClientRect();
    tilt.tx = ((event.clientY - box.top) / box.height - .5) * .45;
    tilt.ty = ((event.clientX - box.left) / box.width - .5) * .6;
  }, {passive: true});
  hero.addEventListener('pointerleave', () => { tilt.tx = 0; tilt.ty = 0; });

  const CYCLE = 14000;
  let frame = 0, elapsed = 0, life = 0, previous = 0, visible = true, contextLost = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function renderMesh(mesh, model, color, gloss, glow = 0) {
    gl.uniformMatrix4fv(uniforms.model, false, model);
    gl.uniform3fv(uniforms.color, color);
    gl.uniform1f(uniforms.gloss, gloss);
    gl.uniform1f(uniforms.glow, glow);
    gl.drawArrays(gl.TRIANGLES, mesh.first, mesh.count);
  }
  const easeOut = t => 1 - (1 - t) ** 4;
  function draw() {
    const phase = elapsed / CYCLE * Math.PI * 2;
    // Entrance: the pair spins in and settles over the first 1.6 s.
    const enter = reducedMotion.matches ? 1 : easeOut(Math.min(1, life / 1600));
    const bob = Math.sin(phase * 2) * .07;
    wrapper.style.setProperty('--ring-bob', bob.toFixed(3));
    const world = chain(
      translate(0, bob, 0),
      scale(.82 + .18 * enter),
      rotation('x', tilt.x),
      rotation('y', tilt.y + (1 - enter) * 1.6),
      rotation('z', -0.40 + 0.04 * Math.sin(phase)),
      rotation('y', phase - 0.28),
      rotation('x', 0.78 + 0.08 * Math.sin(phase))
    );
    const models = [
      chain(world, translate(-0.54), rotation('z', phase + 0.35)),
      chain(world, translate(0.54), rotation('x', Math.PI / 2), rotation('z', -phase + 1.25))
    ];
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    renderMesh(ringMesh, models[0], [0.98, 0.94, 0.87], .8);
    renderMesh(ringMesh, models[1], [0.96, 0.82, 0.62], 1);
    // Pearls on one shared orbit, and a counter-orbiting star that twinkles.
    const orbitScale = .9 + .1 * enter;
    for (const offset of [-.2, Math.PI - .2]) {
      const angle = phase + offset;
      renderMesh(pearlMesh, chain(translate(1.82 * orbitScale * Math.cos(angle), 1.55 * orbitScale * Math.sin(angle) + bob * .6, .48 * Math.sin(angle)), scale(enter)), [1, .97, .93], 1);
    }
    const angle = .8 - phase, twinkle = Math.max(0, Math.sin(phase * 5)) ** 6;
    const star = chain(
      translate(1.70 * orbitScale * Math.cos(angle), 1.52 * orbitScale * Math.sin(angle) + bob * .4, .45 * Math.sin(angle)),
      rotation('y', .3 * Math.sin(angle)), rotation('z', phase / 2 - .12), scale(enter * (1 + .22 * twinkle))
    );
    renderMesh(starMesh, star, [1, .96, .86], .9, .25 * twinkle);
  }
  function animate(time) {
    frame = 0;
    if (!visible || document.hidden || reducedMotion.matches || contextLost) { previous = 0; return; }
    if (previous) {
      const step = Math.min(time - previous, 50);
      elapsed = (elapsed + step) % CYCLE;
      life += step;
    }
    previous = time;
    tilt.x += (tilt.tx - tilt.x) * .06;
    tilt.y += (tilt.ty - tilt.y) * .06;
    draw();
    frame = requestAnimationFrame(animate);
  }
  function resume() {
    if (!frame && visible && !document.hidden && !reducedMotion.matches && !contextLost) frame = requestAnimationFrame(animate);
  }
  function pause() { cancelAnimationFrame(frame); frame = 0; previous = 0; }
  // Restart the entrance spin when the cover is revealed after the opening.
  new MutationObserver(() => { if (hero.classList.contains('paper-arrive')) life = 0; }).observe(hero, {attributes: true, attributeFilter: ['class']});
  resize(); draw(); wrapper.setAttribute('data-live-3d', ''); resume();
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) resume(); else pause();
  });
  observer.observe(canvas);
  new ResizeObserver(() => { resize(); draw(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); else resume(); });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) { pause(); life = 1600; draw(); } else resume(); });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); contextLost = true; pause(); wrapper.removeAttribute('data-live-3d');
  });
})();
