// Golden Canopy hero — a procedural marquee interior (fabric bays, pleated side drapes, string lights, lit tables).
// Only imported on capable devices; phones / Save-Data / reduced-motion keep the static poster instead.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const STAGE = '#0E0D0C', GOLD = '#C9A24A';

// lite: phones/tablets — lower render resolution, lighter geometry, half-res bloom.
// onSlow: called if the device can't hold a watchable frame rate, so the page can fall back to the poster.
export function start(canvas, host, { freezeAt = null, lite = false, onSlow = null } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lite, preserveDrawingBuffer: freezeAt !== null, powerPreference: lite ? 'low-power' : 'default' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));   // 1x looked pixelated on 3x phone screens
  const seg = lite ? .5 : 1;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .8;
  const scene = new THREE.Scene();
  const stage = new THREE.Color(STAGE);
  scene.background = stage; scene.fog = new THREE.FogExp2(stage, .045);
  const camera = new THREE.PerspectiveCamera(62, 1, .1, 120);

  const BAY = 5, LEN = 80, HALF = 8;
  const roofY = x => 6.4 - Math.abs(x) * .32;
  { // ceiling: pitched roof, fabric sagging between beams, pleats gathered toward each beam
    const g = new THREE.PlaneGeometry(HALF * 2, LEN, 160 * seg, 400 * seg); g.rotateX(Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), f = ((z % BAY) + BAY) % BAY / BAY;
      p.setY(i, roofY(x) - Math.sin(Math.PI * f) * .75 - Math.sin(x * 9) * .05 * (.3 + Math.sin(Math.PI * f)));
    }
    g.computeVertexNormals(); g.translate(0, 0, -LEN / 2 + 10);
    scene.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xf3ece2, roughness: .75, side: THREE.DoubleSide })));
  }
  [-1, 1].forEach(s => { // side drapes
    const g = new THREE.PlaneGeometry(LEN, 5, 600 * seg, 30 * seg), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const u = p.getX(i), v = p.getY(i); p.setZ(i, Math.sin(u * 5) * .12 + Math.sin(u * 1.2566) * .05 * (v + 2.5)); }
    g.computeVertexNormals(); g.rotateY(s * Math.PI / 2); g.translate(s * HALF, 2.4, -LEN / 2 + 10);
    scene.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xece3d6, roughness: .8, side: THREE.DoubleSide })));
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2, LEN), new THREE.MeshStandardMaterial({ color: 0x15110e, roughness: .35, metalness: .3 }));
  floor.rotation.x = -Math.PI / 2; floor.position.z = -LEN / 2 + 10; scene.add(floor);

  const bulbs = []; // catenary string lights + a lit hoop every other beam
  for (let z = 10; z > -LEN + 10; z -= BAY) {
    for (let k = 0; k <= 26; k++) { const x = -HALF + (k / 26) * HALF * 2; bulbs.push([x, roofY(x) - .55 - .9 * (1 - (x / HALF) ** 2), z - BAY / 2]); }
    if (Math.round(z / BAY) % 2 === 0) for (let k = 0; k < 18; k++) { const a = k / 18 * Math.PI * 2; bulbs.push([Math.cos(a) * 1.1, 4.4, z + Math.sin(a) * 1.1]); }
  }
  const bulbMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(.05, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.3, 1.2) }), bulbs.length);
  const m4 = new THREE.Matrix4(); bulbs.forEach((b, i) => bulbMesh.setMatrixAt(i, m4.makeTranslation(b[0], b[1], b[2]))); scene.add(bulbMesh);
  const hoopMat = new THREE.MeshStandardMaterial({ color: GOLD, metalness: 1, roughness: .3 });
  for (let z = 10; z > -LEN + 10; z -= BAY * 2) { const r = new THREE.Mesh(new THREE.TorusGeometry(1.1, .02, 6, 48), hoopMat); r.rotation.x = Math.PI / 2; r.position.set(0, 4.4, z); scene.add(r); }

  const cloth = new THREE.MeshStandardMaterial({ color: 0xf6f0e6, roughness: .9 });
  const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(GOLD).multiplyScalar(2.2) });
  const tableGeo = new THREE.CylinderGeometry(.85, 1, .78, 32, 1, true), topGeo = new THREE.CircleGeometry(.85, 32), cpGeo = new THREE.SphereGeometry(.16, 12, 10);
  for (let z = 10; z > -LEN + 10; z -= BAY) [-4, 4].forEach(x => {
    const t = new THREE.Mesh(tableGeo, cloth); t.position.set(x, .39, z - 1.2);
    const top = new THREE.Mesh(topGeo, cloth); top.rotation.x = -Math.PI / 2; top.position.set(x, .78, z - 1.2);
    const cp = new THREE.Mesh(cpGeo, glowMat); cp.position.set(x, .98, z - 1.2);
    scene.add(t, top, cp);
  });
  scene.add(new THREE.HemisphereLight(0xffe2b8, 0x1a120c, .4));
  const lamps = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xffc98a, 12, 14, 1.8); scene.add(l); return l; });

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), lite ? .65 : .75, .5, .9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false); composer.setSize(w, h);
    if (lite) bloom.setSize(Math.round(w / 2), Math.round(h / 2));   // bloom is the costliest pass; half-res is invisible on a phone
    camera.aspect = w / h; camera.fov = w / h < 1 ? 78 : 62; camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(host); resize();

  const ptr = { x: 0, y: 0 };
  host.addEventListener('pointermove', e => { const r = host.getBoundingClientRect(); ptr.x = (e.clientX - r.left) / r.width * 2 - 1; ptr.y = -((e.clientY - r.top) / r.height * 2 - 1); }, { passive: true });

  let z = 8, lx = 0, ly = 0, visible = true, last = performance.now(), raf = 0, shown = false;
  const frame = (dt, t) => {
    z -= dt * .9; if (z < 8 - BAY * 2) z += BAY * 2;              // geometry repeats every two bays, so the loop is seamless
    lx += (ptr.x - lx) * .04; ly += (ptr.y - ly) * .04;
    camera.position.set(lx * .8, 1.7 + ly * .2, z); camera.lookAt(lx * 2.2, 2.6 + ly * 1.2, z - 10);
    lamps.forEach((l, i) => l.position.set(0, 4, z - 3 - i * BAY));
    composer.render();
    if (!shown) { shown = true; canvas.classList.add('on'); }
  };
  if (freezeAt !== null) { z = 8 - freezeAt; frame(0, 0); return; }   // used once to render the static posters
  // frame-rate guard: after a short warm-up, average ~60 frames; under ~20fps we hand back to the poster
  let n = 0, sum = 0, stopped = false;
  const tick = now => {
    const raw = (now - last) / 1000, dt = Math.min(raw, .05); last = now; frame(dt, now);
    if (onSlow && n < 75) { n++; if (n > 15) sum += raw; if (n === 75 && sum / 60 > 1 / 20) { stopped = true; renderer.dispose(); onSlow(); return; } }
    if (!stopped && visible && !document.hidden) raf = requestAnimationFrame(tick);
  };
  const resume = () => { if (stopped) return; cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(tick); };
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) resume(); }).observe(host);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) resume(); });
  resume();
}
