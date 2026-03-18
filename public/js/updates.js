/**
 * GHOST CODE v3.0 - Actualizaciones / Novedades Page JS
 */
'use strict';

let allUpdates = [];

async function loadUpdates() {
  try {
    const res  = await fetch('/api/updates');
    const data = await res.json();
    allUpdates = data.updates || [];
    renderUpdates(allUpdates);
    buildFilters(allUpdates);
  } catch {
    document.getElementById('updatesLoader').innerHTML = '<p class="gc-text text-center">Error al cargar novedades.</p>';
  }
}

function buildFilters(items) {
  const bar = document.getElementById('updFilterBar');
  if (!bar) return;
  const cats = [...new Set(items.map(i => i.category).filter(Boolean))];
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.className      = 'gc-filter-btn';
    btn.dataset.filter = cat;
    btn.textContent    = cat;
    bar.appendChild(btn);
  });
  bar.querySelectorAll('.gc-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.gc-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      renderUpdates(f === 'all' ? allUpdates : allUpdates.filter(u => u.category === f));
    });
  });
}

function renderUpdates(items) {
  const grid   = document.getElementById('updatesGrid');
  const loader = document.getElementById('updatesLoader');
  const empty  = document.getElementById('updatesEmpty');
  if (loader) loader.classList.add('d-none');

  if (!items.length) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('d-none');
    return;
  }
  if (empty) empty.classList.add('d-none');

  grid.innerHTML = items.map(u => `
    <div class="col-md-6 col-lg-4">
      <div class="gc-update-card h-100" onclick="openUpdateModal('${u.id}')">
        ${u.image
          ? `<img src="${escHtml(u.image)}" alt="${escHtml(u.title)}" class="gc-update-card-img" />`
          : `<div class="gc-update-card-img-placeholder"><i class="bi bi-newspaper"></i></div>`
        }
        <div class="gc-update-body">
          <div class="d-flex gap-2 align-items-center mb-2">
            ${u.category ? `<span class="gc-tag">${escHtml(u.category)}</span>` : ''}
            <span class="gc-contact-meta ms-auto">${formatDate(u.createdAt)}</span>
          </div>
          <h3 class="h5 fw-bold mb-2">${escHtml(u.title)}</h3>
          <p class="gc-card-text">${escHtml(u.content).substring(0,120)}${u.content.length > 120 ? '…' : ''}</p>
          <div class="gc-preview-arrow mt-3"><i class="bi bi-arrow-right-circle gc-accent"></i> <span class="gc-accent small">Leer más</span></div>
        </div>
      </div>
    </div>
  `).join('');
}

function openUpdateModal(id) {
  const u = allUpdates.find(x => x.id === id);
  if (!u) return;
  document.getElementById('updateModalTitle').textContent = u.title;
  document.getElementById('updateModalBody').innerHTML = `
    ${u.image ? `<img src="${escHtml(u.image)}" alt="${escHtml(u.title)}" class="w-100 rounded mb-4" style="max-height:320px;object-fit:cover;border:1px solid var(--gc-border)" />` : ''}
    <div class="d-flex gap-2 flex-wrap align-items-center mb-3">
      ${u.category ? `<span class="gc-tag">${escHtml(u.category)}</span>` : ''}
      <span class="gc-contact-meta">${formatDate(u.createdAt)}</span>
    </div>
    <p class="gc-text" style="white-space:pre-line">${escHtml(u.content)}</p>
    ${u.link ? `<a href="${escHtml(u.link)}" target="_blank" rel="noopener" class="btn gc-btn-primary mt-3"><i class="bi bi-box-arrow-up-right me-2"></i>Ver enlace</a>` : ''}
  `;
  new bootstrap.Modal(document.getElementById('updateModal')).show();
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es', { day:'2-digit', month:'short', year:'numeric' });
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

loadUpdates();
