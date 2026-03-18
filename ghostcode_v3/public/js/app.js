/**
 * GHOST CODE v2.0 — Frontend App (compartido en todas las páginas)
 */
'use strict';

// ─── UTILS ────────────────────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

async function apiPost(endpoint, data) {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

// ─── FOOTER YEAR ─────────────────────────────────────────────────────────────
const fy = $('footerYear');
if (fy) fy.textContent = new Date().getFullYear();

// ─── NAVBAR SCROLL ────────────────────────────────────────────────────────────
(function() {
  const nav = $('mainNav');
  if (!nav) return;
  window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 80), { passive: true });
})();

// ─── HERO CODE TYPEWRITER (solo en index) ─────────────────────────────────────
(function() {
  const el = $('heroCode');
  if (!el) return;
  const code = `// Ghost Code — init()\nconst ghost = new GhostCode({\n  security: 'max',\n  performance: 'optimal',\n  scale: Infinity\n});\n\nghost.build({\n  frontend: ['React', 'Vue', 'HTML5'],\n  backend:  ['Node', 'Go', 'Python'],\n  cloud:    ['AWS', 'GCP', 'K8s'],\n  shield:   true,\n});\n\nghost.deploy()\n  .then(() => {\n    console.log('🔒 Sistema activo');\n    console.log('✅ Código invisible');\n  });`;
  let i = 0;
  function type() { if (i < code.length) { el.textContent += code[i++]; setTimeout(type, i < 30 ? 60 : 35); } }
  setTimeout(type, 800);
})();

// ─── STATS COUNTER ────────────────────────────────────────────────────────────
(function() {
  const counters = document.querySelectorAll('.gc-stat-num[data-target]');
  if (!counters.length) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.target);
      let current = 0;
      const step = Math.ceil(target / 60);
      const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = current;
        if (current >= target) clearInterval(timer);
      }, 25);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });
  counters.forEach(c => observer.observe(c));
})();

// ─── CONTACT FORM ─────────────────────────────────────────────────────────────
(function() {
  const form = $('contactForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const alert  = $('formAlert');
    const btn    = $('submitBtn');
    const text   = $('submitText');
    const spin   = $('submitSpinner');

    const name    = $('fname')?.value.trim();
    const email   = $('femail')?.value.trim();
    const subject = $('fsubject')?.value.trim();
    const message = $('fmessage')?.value.trim();

    if (!name || !email || !subject || !message) {
      showAlert(alert, 'Por favor completa todos los campos obligatorios.', 'danger');
      return;
    }

    btn.disabled = true;
    text.classList.add('d-none');
    spin.classList.remove('d-none');

    try {
      const res = await apiPost('/api/contact', { name, email, subject, message });
      if (res.success) {
        showAlert(alert, '✓ Mensaje enviado correctamente. Te contactaremos pronto.', 'success');
        form.reset();
      } else {
        const errs = res.errors ? res.errors.join(', ') : res.message || 'Error al enviar.';
        showAlert(alert, errs, 'danger');
      }
    } catch {
      showAlert(alert, 'Error de conexión. Intenta de nuevo.', 'danger');
    } finally {
      btn.disabled = false;
      text.classList.remove('d-none');
      spin.classList.add('d-none');
    }
  });
})();

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function showAlert(el, msg, type) {
  if (!el) return;
  el.textContent = msg;
  el.className = `alert alert-${type}`;
  el.classList.remove('d-none');
  setTimeout(() => el.classList.add('d-none'), 6000);
}
