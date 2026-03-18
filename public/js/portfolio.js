/**
 * GHOST CODE v2.0 — Portfolio Page JS
 */
'use strict';

let allProjects = [];

async function loadPortfolio() {
  try {
    const res = await fetch('/api/portfolio');
    const data = await res.json();
    allProjects = data.portfolio || [];
    renderPortfolio(allProjects);
    buildFilters(allProjects);
  } catch {
    document.getElementById('portfolioLoader').innerHTML =
      '<p class="gc-text text-center">Error al cargar proyectos.</p>';
  }
}

function buildFilters(projects) {
  const bar = document.getElementById('filterBar');
  if (!bar) return;
  const categories = [...new Set(projects.map(p => p.category).filter(Boolean))];
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'gc-filter-btn';
    btn.dataset.filter = cat;
    btn.textContent = cat;
    bar.appendChild(btn);
  });

  bar.querySelectorAll('.gc-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.gc-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      const filtered = filter === 'all' ? allProjects : allProjects.filter(p => p.category === filter);
      renderPortfolio(filtered);
    });
  });
}

function renderPortfolio(projects) {
  const grid   = document.getElementById('portfolioGrid');
  const loader = document.getElementById('portfolioLoader');
  const empty  = document.getElementById('portfolioEmpty');

  if (loader) loader.classList.add('d-none');

  if (!projects.length) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('d-none');
    return;
  }
  if (empty) empty.classList.add('d-none');

  grid.innerHTML = projects.map((p, i) => `
    <div class="col-md-6 col-lg-4 gc-portfolio-item" data-id="${p.id}">
      <div class="gc-project-card" onclick="openModal('${p.id}')">
        ${p.image
          ? `<img src="${p.image}" alt="${escHtml(p.title)}" class="gc-project-card-img" />`
          : `<div class="gc-project-card-img-placeholder"><i class="bi bi-code-square"></i></div>`
        }
        <div class="gc-project-header">
          <span class="gc-project-num">${String(i + 1).padStart(2, '0')}</span>
          ${p.category ? `<span class="gc-tag">${escHtml(p.category)}</span>` : ''}
        </div>
        <h3 class="h5 fw-bold mt-3 mb-2">${escHtml(p.title)}</h3>
        <p class="gc-card-text">${escHtml(p.description).substring(0, 120)}${p.description.length > 120 ? '…' : ''}</p>
        ${p.tags ? `<div class="gc-project-stack mt-3"><code>${escHtml(p.tags)}</code></div>` : ''}
      </div>
    </div>
  `).join('');
}

function openModal(id) {
  const p = allProjects.find(x => x.id === id);
  if (!p) return;

  document.getElementById('modalTitle').textContent = p.title;
  document.getElementById('modalBody').innerHTML = `
    ${p.image ? `<img src="${p.image}" alt="${escHtml(p.title)}" class="w-100 rounded mb-4" style="max-height:320px;object-fit:cover;border:1px solid var(--gc-border)" />` : ''}
    <div class="d-flex gap-2 flex-wrap mb-3">
      ${p.category ? `<span class="gc-tag">${escHtml(p.category)}</span>` : ''}
    </div>
    <p class="gc-text mb-3">${escHtml(p.description)}</p>
    ${p.tags ? `<div class="gc-project-stack mb-3"><strong class="gc-label">Stack:</strong><br/><code>${escHtml(p.tags)}</code></div>` : ''}
    ${p.link ? `<a href="${escHtml(p.link)}" target="_blank" rel="noopener" class="btn gc-btn-primary mt-2"><i class="bi bi-box-arrow-up-right me-2"></i>Ver Proyecto</a>` : ''}
  `;

  new bootstrap.Modal(document.getElementById('portfolioModal')).show();
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

loadPortfolio();
