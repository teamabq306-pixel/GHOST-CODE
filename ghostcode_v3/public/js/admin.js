/**
 * GHOST CODE v3.0 — Admin Panel JS
 * Incluye: repos, novedades, cambio de contraseña
 */
'use strict';

function $(id) { return document.getElementById(id); }
function escHtml(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function showAlert(el, msg, type) {
  if (!el) return;
  el.textContent = msg;
  el.className   = `alert alert-${type}`;
  el.classList.remove('d-none');
  setTimeout(() => el.classList.add('d-none'), 6000);
}
async function apiPost(url, data) {
  const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
  return res.json();
}
async function apiGet(url) {
  const res = await fetch(url);
  return res.json();
}
async function apiDel(url) {
  const res = await fetch(url, { method:'DELETE' });
  return res.json();
}

// ── Toggle password visibility ────────────────────────────────────────
$('togglePass')?.addEventListener('click', () => {
  const inp = $('loginPass'), ico = $('togglePass').querySelector('i');
  inp.type = inp.type === 'password' ? 'text' : 'password';
  ico.className = inp.type === 'password' ? 'bi bi-eye' : 'bi bi-eye-slash';
});

// ── Login ─────────────────────────────────────────────────────────────
['loginUser','loginPass'].forEach(id =>
  $(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); })
);
$('loginBtn')?.addEventListener('click', doLogin);

async function doLogin() {
  const alert = $('loginAlert'), btn = $('loginBtn');
  const text = $('loginText'), spin = $('loginSpinner');
  const user = $('loginUser')?.value.trim(), pass = $('loginPass')?.value;
  if (!user || !pass) { showAlert(alert, 'Ingresa usuario y contraseña.', 'danger'); return; }
  btn.disabled = true; text.classList.add('d-none'); spin.classList.remove('d-none');
  try {
    const res = await apiPost('/api/login', { username: user, password: pass });
    if (res.success) { showDashboard(); }
    else {
      showAlert(alert, res.message || 'Credenciales inválidas.', 'danger');
      // Si hay bloqueo, deshabilita botón
      if (res.message && res.message.includes('Bloqueado')) {
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-lock-fill me-2"></i>Bloqueado';
        setTimeout(() => { btn.disabled = false; btn.innerHTML = '<span id="loginText"><i class="bi bi-box-arrow-in-right me-2"></i>Acceder</span><span id="loginSpinner" class="spinner-border spinner-border-sm d-none" role="status"></span>'; }, 15 * 60 * 1000);
      }
    }
  } catch { showAlert(alert, 'Error de conexión.', 'danger'); }
  finally { btn.disabled = false; text.classList.remove('d-none'); spin.classList.add('d-none'); }
}

// ── Check auth on load ────────────────────────────────────────────────
async function checkAuth() {
  try { const r = await apiGet('/api/auth/check'); if (r.authenticated) showDashboard(); } catch {}
}

function showDashboard() {
  $('loginPanel').classList.add('d-none');
  $('dashPanel').classList.remove('d-none');
  loadDashboardData();
}

// ── Logout ────────────────────────────────────────────────────────────
$('logoutBtn')?.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  $('dashPanel').classList.add('d-none');
  $('loginPanel').classList.remove('d-none');
  if ($('loginPass')) $('loginPass').value = '';
});

// ── Sidebar nav ───────────────────────────────────────────────────────
document.querySelectorAll('.gc-sidebar-link[data-section]').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const sec = link.dataset.section;
    document.querySelectorAll('.gc-sidebar-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    document.querySelectorAll('.gc-admin-section').forEach(s => s.classList.add('d-none'));
    const target = $(`section-${sec}`);
    if (target) target.classList.remove('d-none');
    if (sec === 'contacts')   loadContacts();
    if (sec === 'portfolio')  loadPortfolioAdmin();
    if (sec === 'repos')      loadReposAdmin();
    if (sec === 'updates')    loadUpdatesAdmin();
  });
});

// ── Dashboard data ────────────────────────────────────────────────────
async function loadDashboardData() {
  try {
    const r = await apiGet('/api/dashboard');
    if (!r.success) return;
    if ($('statContacts'))  $('statContacts').textContent  = r.stats.totalContacts;
    if ($('statPortfolio')) $('statPortfolio').textContent = r.stats.totalPortfolio;
    if ($('statRepos'))     $('statRepos').textContent     = r.stats.totalRepos;
    if ($('statUpdates'))   $('statUpdates').textContent   = r.stats.totalUpdates;
  } catch {}
}

// ── Contacts ──────────────────────────────────────────────────────────
async function loadContacts() {
  const list = $('contactsList'), empty = $('contactsEmpty');
  if (!list) return;
  list.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-light"></div></div>';
  try {
    const r = await apiGet('/api/dashboard');
    if (!r.success) { list.innerHTML = '<p class="gc-text">Error al cargar.</p>'; return; }
    const contacts = r.stats.contacts || [];
    if (!contacts.length) { list.innerHTML = ''; empty?.classList.remove('d-none'); return; }
    empty?.classList.add('d-none');
    list.innerHTML = [...contacts].reverse().map(c => `
      <div class="gc-contact-row">
        <div class="d-flex justify-content-between flex-wrap gap-2 mb-2">
          <div><strong class="gc-white">${escHtml(c.name)}</strong><span class="gc-contact-meta ms-2">&lt;${escHtml(c.email)}&gt;</span></div>
          <span class="gc-contact-meta">${new Date(c.createdAt).toLocaleDateString('es',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
        </div>
        <div class="gc-contact-meta mb-1"><strong>Asunto:</strong> ${escHtml(c.subject)}</div>
        <p class="gc-text mb-0" style="font-size:.9rem">${escHtml(c.message)}</p>
      </div>
    `).join('');
  } catch { list.innerHTML = '<p class="gc-text">Error de conexión.</p>'; }
}

// ── Portfolio ─────────────────────────────────────────────────────────
let deleteTargetId = null, deleteTargetType = '';

async function loadPortfolioAdmin() {
  const list = $('portfolioAdminList'), empty = $('portfolioAdminEmpty');
  if (!list) return;
  list.innerHTML = '<div class="col-12 text-center py-4"><div class="spinner-border text-light"></div></div>';
  try {
    const r = await apiGet('/api/portfolio');
    const items = r.portfolio || [];
    if (!items.length) { list.innerHTML = ''; empty?.classList.remove('d-none'); return; }
    empty?.classList.add('d-none');
    list.innerHTML = items.map(p => `
      <div class="col-sm-6 col-lg-4">
        <div class="gc-admin-portfolio-card">
          ${p.image ? `<img src="${escHtml(p.image)}" alt="${escHtml(p.title)}" />` : '<div class="gc-no-img"><i class="bi bi-image"></i></div>'}
          <div class="gc-card-body">
            <div class="d-flex justify-content-between gap-2 mb-1">
              <strong class="gc-white" style="font-size:.9rem">${escHtml(p.title)}</strong>
              ${p.category ? `<span class="gc-tag">${escHtml(p.category)}</span>` : ''}
            </div>
            <p class="gc-text mb-2" style="font-size:.82rem">${escHtml(p.description).substring(0,80)}…</p>
            ${p.tags ? `<p class="gc-contact-meta mb-2">${escHtml(p.tags)}</p>` : ''}
            <div class="d-flex gap-2 mt-2">
              ${p.link ? `<a href="${escHtml(p.link)}" target="_blank" class="btn btn-sm gc-btn-outline py-1 px-2"><i class="bi bi-box-arrow-up-right"></i></a>` : ''}
              <button class="btn btn-sm btn-danger py-1 px-2 ms-auto" onclick="confirmDelete('${p.id}','portfolio')"><i class="bi bi-trash"></i></button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
    if ($('statPortfolio')) $('statPortfolio').textContent = items.length;
  } catch { list.innerHTML = '<p class="gc-text">Error al cargar.</p>'; }
}

$('openAddPortfolio')?.addEventListener('click', () => $('addPortfolioForm').classList.toggle('d-none'));
$('cancelPortfolio')?.addEventListener('click', () => { $('addPortfolioForm').classList.add('d-none'); $('portfolioForm')?.reset(); resetPreview('pImagePreview'); });

// Portfolio image preview
$('pImageBtn')?.addEventListener('click', () => $('pImage')?.click());
$('pImage')?.addEventListener('change', function() { if(this.files[0]) setPreview(this.files[0], $('pImagePreview')); });
setupDrop('pImageDrop', 'pImage', 'pImagePreview');

$('portfolioForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const alert = $('portfolioFormAlert'), btn = e.target.querySelector('[type="submit"]');
  const title = $('pTitle')?.value.trim(), desc = $('pDesc')?.value.trim();
  if (!title || !desc) { showAlert(alert, 'Título y descripción son obligatorios.', 'danger'); return; }
  btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando…';
  try {
    const fd = new FormData();
    fd.append('title', title); fd.append('description', desc);
    fd.append('category', $('pCategory')?.value.trim() || '');
    fd.append('tags', $('pTags')?.value.trim() || '');
    fd.append('link', $('pLink')?.value.trim() || '');
    const img = $('pImage')?.files[0]; if (img) fd.append('image', img);
    const res = await fetch('/api/portfolio', { method:'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      showAlert(alert, '✓ Proyecto guardado.', 'success');
      $('portfolioForm').reset(); resetPreview('pImagePreview');
      setTimeout(() => { $('addPortfolioForm').classList.add('d-none'); loadPortfolioAdmin(); }, 1200);
    } else { showAlert(alert, data.message || 'Error.', 'danger'); }
  } catch { showAlert(alert, 'Error de conexión.', 'danger'); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-lg me-2"></i>Guardar Proyecto'; }
});

// ── Repos ─────────────────────────────────────────────────────────────
async function loadReposAdmin() {
  const list = $('repoAdminList'), empty = $('repoAdminEmpty');
  if (!list) return;
  list.innerHTML = '<div class="col-12 text-center py-4"><div class="spinner-border text-light"></div></div>';
  try {
    const r = await apiGet('/api/repos');
    const items = r.repos || [];
    if (!items.length) { list.innerHTML = ''; empty?.classList.remove('d-none'); return; }
    empty?.classList.add('d-none');
    const statusBadge = s => s === 'privado' ? 'btn-warning' : s === 'archivado' ? 'btn-secondary' : 'btn-success';
    list.innerHTML = items.map(r => `
      <div class="col-sm-6 col-lg-4">
        <div class="gc-admin-portfolio-card">
          <div class="gc-no-img" style="height:80px"><i class="bi bi-github" style="font-size:2rem"></i></div>
          <div class="gc-card-body">
            <div class="d-flex justify-content-between gap-2 mb-1">
              <strong class="gc-white" style="font-size:.9rem">${escHtml(r.name)}</strong>
              <span class="badge ${statusBadge(r.status)} text-dark" style="font-size:.65rem">${escHtml(r.status||'público')}</span>
            </div>
            ${r.lang ? `<span class="gc-tag mb-2">${escHtml(r.lang)}</span>` : ''}
            ${r.desc ? `<p class="gc-text mb-2" style="font-size:.82rem">${escHtml(r.desc).substring(0,80)}</p>` : ''}
            ${r.tags ? `<p class="gc-contact-meta mb-2">${escHtml(r.tags)}</p>` : ''}
            <div class="d-flex gap-2 mt-2">
              <a href="${escHtml(r.url)}" target="_blank" class="btn btn-sm gc-btn-outline py-1 px-2"><i class="bi bi-github me-1"></i>Ver</a>
              <button class="btn btn-sm btn-danger py-1 px-2 ms-auto" onclick="confirmDelete('${r.id}','repo')"><i class="bi bi-trash"></i></button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
    if ($('statRepos')) $('statRepos').textContent = items.length;
  } catch { list.innerHTML = '<p class="gc-text">Error al cargar.</p>'; }
}

$('openAddRepo')?.addEventListener('click', () => $('addRepoForm').classList.toggle('d-none'));
$('cancelRepoBtn')?.addEventListener('click', () => { $('addRepoForm').classList.add('d-none'); });

$('saveRepoBtn')?.addEventListener('click', async () => {
  const alert = $('repoFormAlert');
  const name = $('rName')?.value.trim(), repoUrl = $('rUrl')?.value.trim();
  if (!name || !repoUrl) { showAlert(alert, 'Nombre y URL son obligatorios.', 'danger'); return; }
  try {
    const res = await apiPost('/api/repos', { name, url: repoUrl, desc: $('rDesc')?.value.trim(), lang: $('rLang')?.value.trim(), tags: $('rTags')?.value.trim(), status: $('rStatus')?.value });
    if (res.success) {
      showAlert(alert, '✓ Repositorio agregado.', 'success');
      ['rName','rUrl','rDesc','rLang','rTags'].forEach(id => { if($(id)) $(id).value=''; });
      setTimeout(() => { $('addRepoForm').classList.add('d-none'); loadReposAdmin(); }, 1200);
    } else { showAlert(alert, res.message || 'Error.', 'danger'); }
  } catch { showAlert(alert, 'Error de conexión.', 'danger'); }
});

// ── Updates/Novedades ─────────────────────────────────────────────────
async function loadUpdatesAdmin() {
  const list = $('updateAdminList'), empty = $('updateAdminEmpty');
  if (!list) return;
  list.innerHTML = '<div class="col-12 text-center py-4"><div class="spinner-border text-light"></div></div>';
  try {
    const r = await apiGet('/api/updates');
    const items = r.updates || [];
    if (!items.length) { list.innerHTML = ''; empty?.classList.remove('d-none'); return; }
    empty?.classList.add('d-none');
    list.innerHTML = items.map(u => `
      <div class="col-sm-6 col-lg-4">
        <div class="gc-admin-portfolio-card">
          ${u.image ? `<img src="${escHtml(u.image)}" alt="${escHtml(u.title)}" style="height:140px;object-fit:cover;width:100%;border-bottom:1px solid var(--gc-border)" />` : '<div class="gc-no-img"><i class="bi bi-newspaper"></i></div>'}
          <div class="gc-card-body">
            <div class="d-flex justify-content-between gap-2 mb-1">
              <strong class="gc-white" style="font-size:.9rem">${escHtml(u.title)}</strong>
              ${u.category ? `<span class="gc-tag">${escHtml(u.category)}</span>` : ''}
            </div>
            <p class="gc-contact-meta mb-2">${new Date(u.createdAt).toLocaleDateString('es',{day:'2-digit',month:'short',year:'numeric'})}</p>
            <p class="gc-text mb-2" style="font-size:.82rem">${escHtml(u.content).substring(0,80)}…</p>
            <div class="d-flex gap-2 mt-2">
              ${u.link ? `<a href="${escHtml(u.link)}" target="_blank" class="btn btn-sm gc-btn-outline py-1 px-2"><i class="bi bi-link-45deg"></i></a>` : ''}
              <button class="btn btn-sm btn-danger py-1 px-2 ms-auto" onclick="confirmDelete('${u.id}','update')"><i class="bi bi-trash"></i></button>
            </div>
          </div>
        </div>
      </div>
    `).join('');
    if ($('statUpdates')) $('statUpdates').textContent = items.length;
  } catch { list.innerHTML = '<p class="gc-text">Error al cargar.</p>'; }
}

$('openAddUpdate')?.addEventListener('click', () => $('addUpdateForm').classList.toggle('d-none'));
$('cancelUpdateBtn')?.addEventListener('click', () => { $('addUpdateForm').classList.add('d-none'); $('updateForm')?.reset(); resetPreview('uImagePreview'); });

$('uImageBtn')?.addEventListener('click', () => $('uImage')?.click());
$('uImage')?.addEventListener('change', function() { if(this.files[0]) setPreview(this.files[0], $('uImagePreview')); });
setupDrop('uImageDrop', 'uImage', 'uImagePreview');

$('updateForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const alert = $('updateFormAlert'), btn = e.target.querySelector('[type="submit"]');
  const title = $('uTitle')?.value.trim(), content = $('uContent')?.value.trim();
  if (!title || !content) { showAlert(alert, 'Título y contenido son obligatorios.', 'danger'); return; }
  btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Publicando…';
  try {
    const fd = new FormData();
    fd.append('title', title); fd.append('content', content);
    fd.append('category', $('uCategory')?.value || 'Noticia');
    fd.append('link', $('uLink')?.value.trim() || '');
    const img = $('uImage')?.files[0]; if (img) fd.append('image', img);
    const res = await fetch('/api/updates', { method:'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      showAlert(alert, '✓ Novedad publicada.', 'success');
      $('updateForm').reset(); resetPreview('uImagePreview');
      setTimeout(() => { $('addUpdateForm').classList.add('d-none'); loadUpdatesAdmin(); }, 1200);
    } else { showAlert(alert, data.message || 'Error.', 'danger'); }
  } catch { showAlert(alert, 'Error de conexión.', 'danger'); }
  finally { btn.disabled = false; btn.innerHTML = '<i class="bi bi-check-lg me-2"></i>Publicar'; }
});

// ── Delete (shared) ───────────────────────────────────────────────────
function confirmDelete(id, type) {
  deleteTargetId = id; deleteTargetType = type;
  new bootstrap.Modal($('deleteModal')).show();
}
$('confirmDelete')?.addEventListener('click', async () => {
  if (!deleteTargetId) return;
  const endpoints = { portfolio:'/api/portfolio/', repo:'/api/repos/', update:'/api/updates/' };
  const ep = endpoints[deleteTargetType];
  if (!ep) return;
  try {
    await apiDel(ep + deleteTargetId);
    bootstrap.Modal.getInstance($('deleteModal'))?.hide();
    if (deleteTargetType === 'portfolio') loadPortfolioAdmin();
    if (deleteTargetType === 'repo')      loadReposAdmin();
    if (deleteTargetType === 'update')    loadUpdatesAdmin();
    loadDashboardData();
  } catch { bootstrap.Modal.getInstance($('deleteModal'))?.hide(); }
  deleteTargetId = null; deleteTargetType = '';
});

// ── Background upload ─────────────────────────────────────────────────
$('bgFileBtn')?.addEventListener('click', () => $('bgFile')?.click());
$('bgFile')?.addEventListener('change', function() {
  if (!this.files[0]) return;
  setPreview(this.files[0], $('bgPreview'));
  $('uploadBgBtn').disabled = false;
});
setupDrop('bgDrop', 'bgFile', 'bgPreview', () => { $('uploadBgBtn').disabled = false; });

$('uploadBgBtn')?.addEventListener('click', async () => {
  const file = $('bgFile')?.files[0], alert = $('bgAlert');
  const btn = $('uploadBgBtn'), text = $('uploadBgText'), spin = $('uploadBgSpinner');
  if (!file) return;
  btn.disabled = true; text.classList.add('d-none'); spin.classList.remove('d-none');
  try {
    const fd = new FormData(); fd.append('background', file);
    const res = await fetch('/api/upload/background', { method:'POST', body: fd });
    const data = await res.json();
    if (data.success) showAlert(alert, `✓ Fondo actualizado. Recarga el sitio para verlo.`, 'success');
    else showAlert(alert, data.message || 'Error.', 'danger');
  } catch { showAlert(alert, 'Error de conexión.', 'danger'); }
  finally { btn.disabled = false; text.classList.remove('d-none'); spin.classList.add('d-none'); }
});

// ── Cambio de contraseña ──────────────────────────────────────────────
$('changePwdBtn')?.addEventListener('click', async () => {
  const alert   = $('pwdAlert');
  const current = $('pwdCurrent')?.value;
  const newPwd  = $('pwdNew')?.value;
  const confirm = $('pwdConfirm')?.value;
  if (!current || !newPwd || !confirm) { showAlert(alert, 'Completa todos los campos.', 'danger'); return; }
  if (newPwd !== confirm)              { showAlert(alert, 'Las contraseñas nuevas no coinciden.', 'danger'); return; }
  if (newPwd.length < 8)              { showAlert(alert, 'La nueva contraseña debe tener al menos 8 caracteres.', 'danger'); return; }
  try {
    const res = await apiPost('/api/admin/change-password', { currentPassword: current, newPassword: newPwd });
    if (res.success) {
      showAlert(alert, '✓ Contraseña actualizada para esta sesión.', 'success');
      [$('pwdCurrent'), $('pwdNew'), $('pwdConfirm')].forEach(el => { if(el) el.value=''; });
    } else { showAlert(alert, res.message || 'Error.', 'danger'); }
  } catch { showAlert(alert, 'Error de conexión.', 'danger'); }
});

// ── Helpers ───────────────────────────────────────────────────────────
function setPreview(file, previewEl) {
  if (!previewEl) return;
  const reader = new FileReader();
  reader.onload = e => { previewEl.src = e.target.result; previewEl.classList.remove('d-none'); };
  reader.readAsDataURL(file);
}
function resetPreview(previewId) {
  const el = $(previewId);
  if (el) { el.src = ''; el.classList.add('d-none'); }
}
function setupDrop(dropId, inputId, previewId, callback) {
  const drop = $(dropId), input = $(inputId);
  if (!drop || !input) return;
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('dragover'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('dragover'));
  drop.addEventListener('drop', e => {
    e.preventDefault(); drop.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files;
      setPreview(file, $(previewId));
      if (callback) callback();
    }
  });
}

checkAuth();
