(() => {
  'use strict';
  const canvas = document.querySelector('.cover-paper-canvas');
  if (!canvas) return;
  const wrapper = canvas.closest('.cover-art');
  const gl = canvas.getContext('webgl', {
    alpha: true, antialias: true, depth: true, stencil: false,
    premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'low-power'
  });
  if (!gl) return; // The sharp SVG remains visible if GPU rendering is unavailable.

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
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 light = normalize(vec3(-0.6, 0.85, 1.5));
      float diffuse = max(dot(normal, light), 0.0);
      float sky = normal.y * 0.05;
      float sheen = pow(max(dot(reflect(-light, normal), normalize(vec3(0.0, 0.0, 6.5) - vPosition)), 0.0), 22.0);
      vec3 shade = uColor * (0.80 + 0.19 * diffuse + sky);
      shade += vec3(0.035) * sheen;
      gl_FragColor = vec4(shade, 1.0);
    }
  `;
  function shader(type, source) {
    const result = gl.createShader(type);
    gl.shaderSource(result, source);
    gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error('Paper shader unavailable');
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

  // Rounded paper ends, pearls and a small sparkle share one static GPU buffer.
  const vertices = [];
  const segments = 144, inner = 0.80, outer = 1.17, halfDepth = 0.042;
  const gap = 0.64, start = gap / 2, span = Math.PI * 2 - gap;
  const point = (angle, radius, z) => [Math.cos(angle) * radius, Math.sin(angle) * radius, z];
  const radial = (angle, direction) => [Math.cos(angle) * direction, Math.sin(angle) * direction, 0];
  function quad(points, normals) {
    for (const index of [0, 1, 2, 0, 2, 3]) vertices.push(...points[index], ...normals[index]);
  }
  function triangle(points, normal) {
    for (const p of points) vertices.push(...p, ...normal);
  }
  for (let i = 0; i < segments; i++) {
    const a = start + span * i / segments, b = start + span * (i + 1) / segments;
    quad([point(a, inner, halfDepth), point(a, outer, halfDepth), point(b, outer, halfDepth), point(b, inner, halfDepth)], Array(4).fill([0, 0, 1]));
    quad([point(a, outer, -halfDepth), point(a, inner, -halfDepth), point(b, inner, -halfDepth), point(b, outer, -halfDepth)], Array(4).fill([0, 0, -1]));
    quad([point(a, outer, halfDepth), point(a, outer, -halfDepth), point(b, outer, -halfDepth), point(b, outer, halfDepth)], [radial(a, 1), radial(a, 1), radial(b, 1), radial(b, 1)]);
    quad([point(a, inner, -halfDepth), point(a, inner, halfDepth), point(b, inner, halfDepth), point(b, inner, -halfDepth)], [radial(a, -1), radial(a, -1), radial(b, -1), radial(b, -1)]);
  }
  for (const [angle, direction] of [[start, -1], [start + span, 1]]) {
    const middle = (inner + outer) / 2, radius = (outer - inner) / 2;
    const centre = point(angle, middle, 0), r = radial(angle, 1);
    const tangent = [-Math.sin(angle) * direction, Math.cos(angle) * direction, 0];
    const capNormal = a => [r[0] * Math.cos(a) + tangent[0] * Math.sin(a), r[1] * Math.cos(a) + tangent[1] * Math.sin(a), 0];
    const capPoint = (a, z) => {
      const n = capNormal(a); return [centre[0] + radius * n[0], centre[1] + radius * n[1], z];
    };
    for (let i = 0; i < 24; i++) {
      const a = Math.PI * i / 24, b = Math.PI * (i + 1) / 24;
      triangle([[centre[0], centre[1], halfDepth], capPoint(a, halfDepth), capPoint(b, halfDepth)], [0, 0, 1]);
      triangle([[centre[0], centre[1], -halfDepth], capPoint(b, -halfDepth), capPoint(a, -halfDepth)], [0, 0, -1]);
      quad([capPoint(a, halfDepth), capPoint(a, -halfDepth), capPoint(b, -halfDepth), capPoint(b, halfDepth)], [capNormal(a), capNormal(a), capNormal(b), capNormal(b)]);
    }
  }
  const ringMesh = {first: 0, count: vertices.length / 6};
  const pearlStart = vertices.length / 6, pearlRadius = 0.058;
  function spherePoint(latitude, longitude) {
    return [Math.sin(latitude) * Math.cos(longitude), Math.cos(latitude), Math.sin(latitude) * Math.sin(longitude)];
  }
  for (let latitude = 0; latitude < 12; latitude++) for (let longitude = 0; longitude < 20; longitude++) {
    const a = Math.PI * latitude / 12, b = Math.PI * (latitude + 1) / 12;
    const u = Math.PI * 2 * longitude / 20, v = Math.PI * 2 * (longitude + 1) / 20;
    const normals = [spherePoint(a,u), spherePoint(b,u), spherePoint(b,v), spherePoint(a,v)];
    quad(normals.map(n => n.map(value => value * pearlRadius)), normals);
  }
  const pearlMesh = {first: pearlStart, count: vertices.length / 6 - pearlStart};
  const starStart = vertices.length / 6, outline = [];
  const curves = [
    [[0,1],[.12,.23],[.23,.12],[1,0]], [[1,0],[.23,-.12],[.12,-.23],[0,-1]],
    [[0,-1],[-.12,-.23],[-.23,-.12],[-1,0]], [[-1,0],[-.23,.12],[-.12,.23],[0,1]]
  ];
  for (const curve of curves) for (let i = 0; i < 16; i++) {
    const t = i / 16, s = 1 - t;
    const weights = [s*s*s, 3*s*s*t, 3*s*t*t, t*t*t];
    outline.push([curve.reduce((n,p,k) => n + weights[k] * p[0], 0) * .21, curve.reduce((n,p,k) => n + weights[k] * p[1], 0) * .25]);
  }
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length];
    const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
    const normal = [-dy / length, dx / length, 0], depth = .015;
    triangle([[0,0,depth], [...a,depth], [...b,depth]], [0,0,1]);
    triangle([[0,0,-depth], [...b,-depth], [...a,-depth]], [0,0,-1]);
    quad([[...a,depth],[...a,-depth],[...b,-depth],[...b,depth]], Array(4).fill(normal));
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
    color: gl.getUniformLocation(program, 'uColor')
  };
  const identity = () => new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  function multiply(a, b) {
    const result = new Float32Array(16);
    for (let column = 0; column < 4; column++) for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 4; k++) result[column * 4 + row] += a[k * 4 + row] * b[column * 4 + k];
    }
    return result;
  }
  function rotation(axis, angle) {
    const m = identity(), c = Math.cos(angle), s = Math.sin(angle);
    if (axis === 'x') { m[5]=c; m[6]=s; m[9]=-s; m[10]=c; }
    if (axis === 'y') { m[0]=c; m[2]=-s; m[8]=s; m[10]=c; }
    if (axis === 'z') { m[0]=c; m[1]=s; m[4]=-s; m[5]=c; }
    return m;
  }
  function translate(x, y = 0, z = 0) { const m = identity(); m[12] = x; m[13] = y; m[14] = z; return m; }
  let projectionReady = false;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.min(1100, Math.round(rect.width * ratio)));
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
  let frame = 0, elapsed = 0, previous = 0, visible = true, contextLost = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function renderMesh(mesh, model, color) {
    gl.uniformMatrix4fv(uniforms.model, false, model);
    gl.uniform3fv(uniforms.color, color);
    gl.drawArrays(gl.TRIANGLES, mesh.first, mesh.count);
  }
  function draw() {
    const phase = elapsed / 12000 * Math.PI * 2;
    const world = multiply(rotation('z', -0.40 + 0.035 * Math.sin(phase)), multiply(rotation('y', phase - 0.28), rotation('x', 0.78 + 0.07 * Math.sin(phase))));
    const models = [
      multiply(world, multiply(translate(-0.54), rotation('z', phase + 0.35))),
      multiply(world, multiply(translate(0.54), multiply(rotation('x', Math.PI / 2), rotation('z', -phase + 1.25))))
    ];
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    for (let i = 0; i < 2; i++) {
      renderMesh(ringMesh, models[i], i === 0 ? [1, 0.957, 0.88] : [0.98, 0.855, 0.69]);
    }
    // One synchronized orbit: opposite pearls and a counter-orbiting four-point star.
    for (const offset of [-.2, Math.PI - .2]) {
      const angle = phase + offset;
      renderMesh(pearlMesh, translate(1.82 * Math.cos(angle), 1.55 * Math.sin(angle), .48 * Math.sin(angle)), [1, .985, .94]);
    }
    const angle = .8 - phase;
    const star = multiply(translate(1.70 * Math.cos(angle), 1.52 * Math.sin(angle), .45 * Math.sin(angle)), multiply(rotation('y', .24 * Math.sin(angle)), rotation('z', phase / 2 - .12)));
    renderMesh(starMesh, star, [1, .965, .88]);
  }
  function animate(time) {
    frame = 0;
    if (!visible || document.hidden || reducedMotion.matches || contextLost) { previous = 0; return; }
    if (previous) elapsed = (elapsed + Math.min(time - previous, 50)) % 12000;
    previous = time;
    draw();
    frame = requestAnimationFrame(animate);
  }
  function resume() {
    if (!frame && visible && !document.hidden && !reducedMotion.matches && !contextLost) frame = requestAnimationFrame(animate);
  }
  function pause() { cancelAnimationFrame(frame); frame = 0; previous = 0; }
  resize(); draw(); wrapper.setAttribute('data-live-3d', ''); resume();
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) resume(); else pause();
  });
  observer.observe(canvas);
  new ResizeObserver(() => { resize(); draw(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); else resume(); });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) { pause(); draw(); } else resume(); });
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); contextLost = true; pause(); wrapper.removeAttribute('data-live-3d');
  });
})();
