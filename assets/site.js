// Rahanie Events & Decor — shared behaviour. Vanilla JS, no libraries.
(() => {
  const WA_NUMBER = '254792353563';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ---- preload splash ----
  const splash = $('.splash');
  if (splash) {
    const hide = () => splash.classList.add('gone');
    addEventListener('load', () => setTimeout(hide, reduced ? 0 : 350));
    setTimeout(hide, 2600); // never hold the page hostage on slow data
  }

  // ---- smart sticky header: hides scrolling down, back on any scroll up ----
  const head = $('.site-head');
  let lastY = scrollY, ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      const y = scrollY, menuOpen = document.body.classList.contains('menu-open');
      if (!menuOpen) head.classList.toggle('hide', y > lastY && y > 120);
      lastY = y; ticking = false;
    });
  }, { passive: true });

  // ---- mobile nav panel ----
  const burger = $('.burger'), panel = $('.panel');
  const setMenu = open => {
    burger.setAttribute('aria-expanded', open); panel.classList.toggle('open', open);
    document.body.classList.toggle('menu-open', open); document.body.style.overflow = open ? 'hidden' : '';
    if (open) head.classList.remove('hide');
  };
  burger?.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  panel?.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && panel?.classList.contains('open')) { setMenu(false); burger.focus(); } });
  addEventListener('resize', () => { if (innerWidth >= 960 && panel?.classList.contains('open')) setMenu(false); });

  // ---- scroll reveal ----
  const rv = $$('.rv');
  if (reduced || !('IntersectionObserver' in window)) rv.forEach(e => e.classList.add('in'));
  else {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    rv.forEach(e => io.observe(e));
  }

  // ---- scroll-linked tilt on photo cards (kept under ±1°, rAF-throttled) ----
  const tilts = $$('.tilt');
  if (tilts.length && !reduced) {
    let pending = false;
    const apply = () => {
      const h = innerHeight;
      tilts.forEach((el, i) => {
        const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > h) return;
        const p = ((r.top + r.height / 2) / h - .5) * 2;           // -1 top .. 1 bottom
        el.style.transform = `perspective(900px) rotateX(${(p * .9).toFixed(3)}deg) rotateZ(${((i % 2 ? 1 : -1) * p * .35).toFixed(3)}deg)`;
      });
      pending = false;
    };
    addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(apply); } }, { passive: true });
    apply();
  }

  // ---- fullscreen photo lightbox (grid → overlay, caption, prev/next, counter, Esc) ----
  const items = $$('[data-lb]');
  if (items.length) {
    const lb = document.createElement('div');
    lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Photo viewer');
    lb.innerHTML = `<div class="lb-top"><span class="lb-count" aria-live="polite"></span><button class="lb-close" aria-label="Close photo viewer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
      <div class="lb-stage"><button class="lb-prev" aria-label="Previous photo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 5l-7 7 7 7"/></svg></button><img alt=""><button class="lb-next" aria-label="Next photo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg></button></div>
      <p class="lb-cap"></p>`;
    document.body.appendChild(lb);
    const img = $('img', lb), cap = $('.lb-cap', lb), count = $('.lb-count', lb);
    let list = items, idx = 0, opener = null;
    const show = i => {
      idx = (i + list.length) % list.length; const el = list[idx];
      img.style.opacity = 0;
      const src = el.dataset.full; const pre = new Image(); pre.onload = () => { img.src = src; img.alt = el.dataset.alt || ''; img.style.opacity = 1; }; pre.src = src;
      cap.innerHTML = `<b>${el.dataset.title || ''}</b>${el.dataset.cap || ''}`;
      count.textContent = `${idx + 1} / ${list.length}`;
    };
    const open = el => {
      const g = el.dataset.lb; list = items.filter(x => x.dataset.lb === g); opener = el;
      show(list.indexOf(el)); lb.classList.add('open'); document.body.style.overflow = 'hidden'; $('.lb-close', lb).focus();
    };
    const close = () => { lb.classList.remove('open'); document.body.style.overflow = ''; opener?.focus(); };
    items.forEach(el => el.addEventListener('click', () => open(el)));
    $('.lb-close', lb).onclick = close; $('.lb-prev', lb).onclick = () => show(idx - 1); $('.lb-next', lb).onclick = () => show(idx + 1);
    lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('lb-stage')) close(); });
    addEventListener('keydown', e => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'Tab') { const f = $$('button', lb); const first = f[0], last = f[f.length - 1]; // keep focus inside
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    });
    let sx = null; // swipe
    lb.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); sx = null; });
  }

  // ---- videos: muted autoplay in view, custom sound toggle (one with sound at a time), fullscreen ----
  const vids = $$('.vid');
  const muteOthers = keep => vids.forEach(v => { if (v !== keep) { $('video', v).muted = true; v.classList.remove('sound'); $('.snd', v)?.setAttribute('aria-pressed', 'false'); } });
  vids.forEach(box => {
    const v = $('video', box), snd = $('.snd', box), fs = $('.fs', box);
    snd?.addEventListener('click', () => {
      const on = v.muted; muteOthers(box); v.muted = !on; box.classList.toggle('sound', on); snd.setAttribute('aria-pressed', on);
      snd.setAttribute('aria-label', on ? 'Mute video' : 'Turn sound on'); if (v.paused) v.play().catch(() => {});
    });
    const goFull = () => { const f = v.requestFullscreen || v.webkitEnterFullscreen || v.webkitRequestFullscreen; f && f.call(v); };
    fs?.addEventListener('click', goFull); v.addEventListener('click', goFull);
  });
  if (vids.length && 'IntersectionObserver' in window) {
    const vio = new IntersectionObserver(es => es.forEach(e => {
      const v = $('video', e.target);
      if (e.isIntersecting && !reduced) { if (v.preload === 'none') v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
    }), { threshold: .35 });
    vids.forEach(b => vio.observe(b));
  }

  // ---- booking flow → pre-filled, structured WhatsApp message ----
  const book = $('#book-form');
  book?.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    $$('[required]', book).forEach(f => {
      const bad = !f.value.trim(); f.setAttribute('aria-invalid', bad); const er = $(`#${f.id}-err`); if (er) er.textContent = bad ? 'Please fill this in.' : '';
      if (bad && ok) { f.focus(); ok = false; }
    });
    if (!ok) return;
    const v = id => ($('#' + id)?.value || '').trim();
    const date = v('b-date') ? new Date(v('b-date') + 'T12:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : '';
    const lines = [
      "Hi Rahanie Events! I'd like to book an event ✨", '',
      `• Name: ${v('b-name')}`, `• Event: ${v('b-type')}`, `• Date: ${date}`, `• Location: ${v('b-loc')}`, `• Guests (pax): ${v('b-pax')}`,
      v('b-theme') ? `• Preferred theme: ${v('b-theme')}` : null, v('b-budget') ? `• Budget: ${v('b-budget')}` : null,
      v('b-inspo') ? `• Inspo: ${v('b-inspo')}` : null, '', '(Sent from the Rahanie website booking form)'
    ].filter(x => x !== null);  // optional fields drop out entirely when empty
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank', 'noopener');
  });

  // ---- reviews form (FormSubmit → owner's inbox) ----
  const rf = $('#review-form');
  if (rf) {
    if (new URLSearchParams(location.search).get('review') === 'thanks') $('#review-thanks')?.removeAttribute('hidden');
    rf.addEventListener('submit', e => {
      let ok = true;
      $$('[required]', rf).forEach(f => {
        const bad = f.type === 'checkbox' ? !f.checked : f.type === 'email' ? !/^\S+@\S+\.\S+$/.test(f.value) : !f.value.trim();
        f.setAttribute('aria-invalid', bad); const er = $(`#${f.id}-err`); if (er) er.textContent = bad ? (f.type === 'email' ? 'Please enter a valid email.' : 'Please fill this in.') : '';
        if (bad && ok) { f.focus(); ok = false; }
      });
      if (!ok) e.preventDefault();
    });
  }

  $$('[data-year]').forEach(e => e.textContent = new Date().getFullYear());
})();
