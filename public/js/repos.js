/**
 * GHOST CODE v3.0 - Repositorios Page JS
 */
'use strict';

let allRepos = [];

async function loadRepos() {
  try {
    const res  = await fetch('/api/repos');
    const data = await res.json();
    allRepos   = data.repos || [];
    renderRepos(allRepos);
    buildFilters(allRepos);
  } catch {
    document.getElementById('reposLoader').innerHTML = '<p class="gc-text text-center">Error al cargar repositorios.</p>';
  }
}

function buildFilters(repos) {
  const bar  = document.getElementById('repoFilterBar');
  if (!bar)  return;
  const langs = [...new Set(repos.map(r => r.lang).filter(Boolean))];
  langs.forEach(lang => {
    const btn = document.createElement('button');
    btn.className    = 'gc-filter-btn';
    btn.dataset.filter = lang;
    btn.textContent  = lang;
    bar.appendChild(btn);
  });
  bar.querySelectorAll('.gc-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.gc-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      renderRepos(f === 'all' ? allRepos : allRepos.filter(r => r.lang === f));
    });
  });
}

function renderRepos(repos) {
  const grid   = document.getElementById('reposGrid');
  const loader = document.getElementById('reposLoader');
  const empty  = document.getElementById('reposEmpty');
  if (loader) loader.classList.add('d-none');

  if (!repos.length) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('d-none');
    return;
  }
  if (empty) empty.classList.add('d-none');

  const statusIcon = s => s === 'privado' ? '<i class="bi bi-lock-fill gc-accent me-1"></i>' : '<i class="bi bi-unlock gc-accent me-1"></i>';

  grid.innerHTML = repos.map(r => `
    <div class="col-md-6 col-lg-4">
      <div class="gc-repo-card h-100">
        <div class="gc-repo-header">
          <i class="bi bi-github gc-accent" style="font-size:1.4rem"></i>
          <span class="gc-tag ms-2">${escHtml(r.lang || 'Repo')}</span>
          <span class="ms-auto gc-contact-meta">${statusIcon(r.status)}${escHtml(r.status||'público')}</span>
        </div>
        <h3 class="h5 fw-bold mt-3 mb-2">${escHtml(r.name)}</h3>
        ${r.desc ? `<p class="gc-card-text mb-3">${escHtml(r.desc)}</p>` : ''}
        ${r.tags ? `<div class="gc-card-tags mb-3">${r.tags.split(',').map(t=>`<span class="gc-tag">${escHtml(t.trim())}</span>`).join('')}</div>` : ''}
        <a href="${escHtml(r.url)}" target="_blank" rel="noopener noreferrer" class="btn gc-btn-primary mt-auto w-100">
          <i class="bi bi-github me-2"></i>Ver Repositorio
        </a>
      </div>
    </div>
  `).join('');
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

loadRepos();
