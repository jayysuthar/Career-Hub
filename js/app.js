/* ───────────────────────────────────────────
   Career Hub — app.js
   Data is stored in localStorage so your list
   survives page refreshes and browser restarts.
─────────────────────────────────────────── */

const STORAGE_KEY   = 'career_hub_companies';
const VISITS_KEY    = 'career_hub_visits';
const EMAILS_KEY    = 'career_hub_emails';
const LINKEDIN_KEY  = 'career_hub_linkedin';
const NAME_KEY      = 'career_hub_username';

/* ── Avatar color palettes ── */
const PALETTES = [
  { bg: '#dbeafe', text: '#1e40af' },
  { bg: '#d1fae5', text: '#065f46' },
  { bg: '#ede9fe', text: '#4c1d95' },
  { bg: '#fee2e2', text: '#991b1b' },
  { bg: '#fef3c7', text: '#78350f' },
  { bg: '#fce7f3', text: '#831843' },
  { bg: '#e0f2fe', text: '#0c4a6e' },
  { bg: '#f0fdf4', text: '#14532d' },
  { bg: '#fff7ed', text: '#7c2d12' },
  { bg: '#f5f3ff', text: '#3b0764' },
];

/* ── State ── */
let companies = [];
let filterTag = '';
let pendingDeleteId = null;
let visits = {}; // { "YYYY-MM-DD": ["id1", "id2", ...] }
let calYear   = null;
let calMonth  = null;
let dragSrcId = null;
let emails = []; // { id, companyId, name, email, role, note }
const expandedPanels = new Set(); // company IDs with open contact panel

/* ── Persist / Load ── */
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    companies = raw ? JSON.parse(raw) : [];
  } catch {
    companies = [];
  }
  if (companies.length === 0) seedDefaults();
}

function loadVisits() {
  try {
    const raw = localStorage.getItem(VISITS_KEY);
    visits = raw ? JSON.parse(raw) : {};
  } catch { visits = {}; }
}

function saveVisits() {
  localStorage.setItem(VISITS_KEY, JSON.stringify(visits));
}

function todayKey() {
  // Build YYYY-MM-DD explicitly from ET date parts — avoids locale formatting quirks
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const get = t => parts.find(p => p.type === t).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function todayVisitedIds() {
  return new Set(visits[todayKey()] || []);
}

function recordVisit(id) {
  const key = todayKey();
  if (!visits[key]) visits[key] = [];
  if (!visits[key].includes(id)) {
    visits[key].push(id);
    saveVisits();
    renderProgress();
    // re-render just this card to add the visited highlight
    const c = companies.find(x => x.id === id);
    const card = document.getElementById('card-' + id);
    if (c && card) card.outerHTML = cardHTML(c);
    rewireCards();
  }
}

function unvisitCard(id) {
  const key = todayKey();
  if (!visits[key]) return;
  visits[key] = visits[key].filter(v => v !== id);
  if (visits[key].length === 0) delete visits[key];
  saveVisits();
  renderProgress();
  const c = companies.find(x => x.id === id);
  const card = document.getElementById('card-' + id);
  if (c && card) card.outerHTML = cardHTML(c);
  rewireCards();
}

function renderProgress() {
  const visited = todayVisitedIds();
  const total   = companies.length;
  const count   = [...visited].filter(id => companies.some(c => c.id === id)).length;
  const pct     = total > 0 ? (count / total) * 100 : 0;
  document.getElementById('dp-count').textContent = `${count} / ${total}`;
  document.getElementById('dp-bar-fill').style.width = pct + '%';
}

function openHistory() {
  const today = new Date(todayKey() + 'T12:00:00');
  calYear  = today.getFullYear();
  calMonth = today.getMonth();
  renderCalendar();
  document.getElementById('history-overlay').hidden = false;
}

function closeHistory() {
  document.getElementById('history-overlay').hidden = true;
}

function renderCalendar() {
  const todayStr = todayKey();
  const total    = companies.length;

  const firstOfMonth = new Date(calYear, calMonth, 1);
  const daysInMonth  = new Date(calYear, calMonth + 1, 0).getDate();
  const startDow     = firstOfMonth.getDay(); // 0 = Sunday
  const monthLabel   = firstOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Current calendar month as YYYY-MM string, to check if "next" is in the future
  const viewingStr  = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`;
  const todayYM     = todayStr.slice(0, 7);
  const isThisMonth = viewingStr === todayYM;
  const isFutureMonth = viewingStr > todayYM;

  const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  let html = `
    <div class="cal-nav">
      <button class="cal-nav-btn" id="cal-prev" title="Previous month">${iconChevronLeft()}</button>
      <span class="cal-month-label">${monthLabel}</span>
      <button class="cal-nav-btn" id="cal-next" title="Next month" ${isThisMonth ? 'disabled' : ''}>${iconChevronRight()}</button>
    </div>
    <div class="cal-grid">
      ${DAYS.map(d => `<div class="cal-dow">${d}</div>`).join('')}
      ${Array(startDow).fill('<div class="cal-cell cal-cell--empty"></div>').join('')}`;

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr  = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday  = dateStr === todayStr;
    const isFuture = dateStr > todayStr;
    const count    = (visits[dateStr] || []).filter(id => companies.some(c => c.id === id)).length;
    const hasVisit = count > 0;

    html += `
      <div class="cal-cell${isToday ? ' cal-cell--today' : ''}${hasVisit ? ' cal-cell--active' : ''}${isFuture ? ' cal-cell--future' : ''}">
        <span class="cal-day-num">${d}</span>
        ${hasVisit ? `<span class="cal-tally">${count}/${total}</span>` : ''}
      </div>`;
  }

  html += '</div>';

  // Summary row
  const monthVisitDays = Object.keys(visits).filter(k => k.startsWith(viewingStr)).length;
  html += `<p class="cal-summary">${monthVisitDays > 0
    ? `${monthVisitDays} active day${monthVisitDays !== 1 ? 's' : ''} this month`
    : 'No visits recorded this month'}</p>`;

  document.getElementById('history-body').innerHTML = html;

  document.getElementById('cal-prev').addEventListener('click', () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendar();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    if (isThisMonth) return;
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendar();
  });
}

/* ── Emails ── */
function loadEmails() {
  try {
    const raw = localStorage.getItem(EMAILS_KEY);
    emails = raw ? JSON.parse(raw) : [];
  } catch { emails = []; }
}

function saveEmails() {
  localStorage.setItem(EMAILS_KEY, JSON.stringify(emails));
}

function emailsForCompany(companyId) {
  return emails
    .filter(e => e.companyId === companyId)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

function openEmailModal(preselectedCompanyId = null, editEmailId = null) {
  const existing = editEmailId ? emails.find(e => e.id === editEmailId) : null;

  const select = document.getElementById('ef-company');
  const companyId = existing ? existing.companyId : preselectedCompanyId;
  select.innerHTML = '<option value="">Select a company…</option>' +
    companies.map(c => `<option value="${c.id}"${c.id === companyId ? ' selected' : ''}>${esc(c.name)}</option>`).join('');

  document.getElementById('ef-email-id').value  = editEmailId || '';
  document.getElementById('ef-name').value      = existing?.name     || '';
  document.getElementById('ef-email').value     = existing?.email    || '';
  document.getElementById('ef-role').value      = existing?.role     || '';
  document.getElementById('ef-phone').value     = existing?.phone    || '';
  document.getElementById('ef-linkedin').value  = existing?.linkedin || '';
  document.getElementById('ef-note').value      = existing?.note     || '';

  document.getElementById('err-ef-company').hidden = true;
  document.getElementById('err-ef-email').hidden   = true;
  document.getElementById('err-ef-phone').hidden   = true;

  document.getElementById('email-modal-title').textContent = existing ? 'Edit contact'    : 'Add contact';
  document.getElementById('email-modal-save').textContent  = existing ? 'Save changes' : 'Add contact';

  // Lock company selector when editing (contact belongs to a specific company)
  select.disabled = !!existing;

  document.getElementById('email-modal-overlay').hidden = false;
  document.getElementById('ef-name').focus();
}

function closeEmailModal() {
  document.getElementById('email-modal-overlay').hidden = true;
}

function saveEmailForm() {
  const companyId = document.getElementById('ef-company').value;
  const name      = document.getElementById('ef-name').value.trim();
  const email     = document.getElementById('ef-email').value.trim();
  const role      = document.getElementById('ef-role').value.trim();
  const phone     = document.getElementById('ef-phone').value.trim();
  const linkedin  = document.getElementById('ef-linkedin').value.trim();
  const note      = document.getElementById('ef-note').value.trim();

  let ok = true;
  if (!companyId) {
    document.getElementById('err-ef-company').hidden = false; ok = false;
  } else {
    document.getElementById('err-ef-company').hidden = true;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    document.getElementById('err-ef-email').hidden = false; ok = false;
  } else {
    document.getElementById('err-ef-email').hidden = true;
  }
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      document.getElementById('err-ef-phone').hidden = false; ok = false;
    } else {
      document.getElementById('err-ef-phone').hidden = true;
    }
  } else {
    document.getElementById('err-ef-phone').hidden = true;
  }
  if (!ok) return;

  const editId = document.getElementById('ef-email-id').value;
  if (editId) {
    const idx = emails.findIndex(e => e.id === editId);
    if (idx !== -1) emails[idx] = { ...emails[idx], name, email, role, phone, linkedin, note };
  } else {
    emails.push({ id: uid(), companyId, name, email, role, phone, linkedin, note });
  }

  saveEmails();
  expandedPanels.add(companyId);
  closeEmailModal();
  render();
}

function deleteEmail(emailId) {
  emails = emails.filter(e => e.id !== emailId);
  saveEmails();
  render();
}

/* ── Drag-and-drop reorder ── */
function moveCompany(fromId, toId) {
  const fromIdx = companies.findIndex(c => c.id === fromId);
  const toIdx   = companies.findIndex(c => c.id === toId);
  if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
  const [item] = companies.splice(fromIdx, 1);
  companies.splice(toIdx, 0, item);
  save();
  render();
}

function onDragStart(e) {
  dragSrcId = this.dataset.id;
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => this.classList.add('card--dragging'), 0);
}

function onDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (this.dataset.id !== dragSrcId) this.classList.add('card--drag-over');
}

function onDragLeave() {
  this.classList.remove('card--drag-over');
}

function onDrop(e) {
  e.stopPropagation();
  this.classList.remove('card--drag-over');
  if (dragSrcId && dragSrcId !== this.dataset.id) moveCompany(dragSrcId, this.dataset.id);
}

function onDragEnd() {
  document.querySelectorAll('.card--dragging, .card--drag-over')
    .forEach(c => c.classList.remove('card--dragging', 'card--drag-over'));
  dragSrcId = null;
}

function toggleEmailPanel(companyId) {
  if (expandedPanels.has(companyId)) {
    expandedPanels.delete(companyId);
  } else {
    expandedPanels.clear();
    expandedPanels.add(companyId);
  }
  render();
}

function seedDefaults() {
  companies = [];
  save();
}

/* ── Helpers ── */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function initials(name) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function paletteFor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % PALETTES.length;
  return PALETTES[h];
}

function allTags() {
  const tags = companies.map(c => c.tag).filter(Boolean);
  return [...new Set(tags)].sort();
}

function normalizeUrl(url) {
  url = url.trim();
  if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;
  return url;
}

/* ── Render ── */
function render() {
  const q = document.getElementById('search').value.trim().toLowerCase();

  const filtered = companies.filter(c => {
    const matchesTag = !filterTag || c.tag === filterTag;
    const matchesQ = !q
      || c.name.toLowerCase().includes(q)
      || (c.tag || '').toLowerCase().includes(q)
      || (c.note || '').toLowerCase().includes(q);
    return matchesTag && matchesQ;
  });

  renderTagPills();
  renderCards(filtered);
  renderProgress();
  document.getElementById('count').textContent =
    `${filtered.length} ${filtered.length === 1 ? 'company' : 'companies'}`;
}

function renderTagPills() {
  const container = document.getElementById('filter-tags');
  const tags = allTags();
  container.innerHTML = '';

  const all = btn('All', '', filterTag === '');
  container.appendChild(all);
  tags.forEach(tag => container.appendChild(btn(tag, tag, filterTag === tag)));

  function btn(label, value, active) {
    const b = document.createElement('button');
    b.className = 'tag-pill' + (active ? ' active' : '');
    b.textContent = label;
    b.dataset.tag = value;
    b.addEventListener('click', () => { filterTag = value; render(); });
    return b;
  }

  // populate datalist for tag suggestions in modal
  const dl = document.getElementById('tag-suggestions');
  dl.innerHTML = tags.map(t => `<option value="${t}">`).join('');
}

function renderCards(list) {
  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty');

  if (list.length === 0) {
    grid.innerHTML = '';
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  grid.innerHTML = list.map(c => cardHTML(c)).join('');
  rewireCards();

  // Place the panel after the last card in the expanded company's row
  if (expandedPanels.size > 0) {
    const expandedId = [...expandedPanels][0];
    if (list.some(c => c.id === expandedId)) placeEmailPanel(expandedId);
  }
}

function rewireCards() {
  const grid = document.getElementById('grid');

  grid.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', () => {
      const { action, id } = el.dataset;
      if (action === 'open')                 openCareer(id);
      if (action === 'edit')                 openModal(id);
      if (action === 'delete')               confirmDelete(id);
      if (action === 'unvisit')              unvisitCard(id);
      if (action === 'toggle-emails')        toggleEmailPanel(id);
      if (action === 'add-email-to-company') openEmailModal(id);
      if (action === 'delete-email')         deleteEmail(el.dataset.emailId);
    });
  });

  grid.querySelectorAll('.card').forEach(card => {
    card.addEventListener('dragstart', onDragStart);
    card.addEventListener('dragover',  onDragOver);
    card.addEventListener('dragleave', onDragLeave);
    card.addEventListener('drop',      onDrop);
    card.addEventListener('dragend',   onDragEnd);
  });
}

function cardHTML(c) {
  const p          = paletteFor(c.name);
  const visited    = todayVisitedIds().has(c.id);
  const host       = (() => { try { return new URL(c.url).hostname.replace('www.', ''); } catch { return c.url; } })();
  const cardEmails = emailsForCompany(c.id);
  const isExpanded = expandedPanels.has(c.id);

  return `
  <div class="card${visited ? ' card--visited' : ''}${isExpanded ? ' card--expanded' : ''}" id="card-${c.id}" data-id="${c.id}" draggable="true">
    <div class="card-top">
      <div class="card-avatar" style="background:${p.bg};color:${p.text}">${initials(c.name)}</div>
      <div class="card-info">
        <div class="card-name" title="${esc(c.name)}">${esc(c.name)}</div>
        ${c.tag ? `<span class="card-tag">${esc(c.tag)}</span>` : ''}
      </div>
      ${visited ? `<button class="visited-chip" data-action="unvisit" data-id="${c.id}" title="Click to unmark">✓ visited ✕</button>` : ''}
    </div>
    ${c.note ? `<p class="card-note">${esc(c.note)}</p>` : ''}
    <p class="card-url" title="${esc(c.url)}">${esc(host)}</p>
    <div class="card-actions">
      <a class="btn-open" href="${esc(c.url)}" target="_blank" rel="noopener noreferrer" data-action="open" data-id="${c.id}" draggable="false">
        ${iconExternal()} Open careers
      </a>
      <button class="btn-icon-sm" data-action="edit" data-id="${c.id}" aria-label="Edit ${esc(c.name)}">
        ${iconEdit()}
      </button>
      <button class="btn-icon-sm danger" data-action="delete" data-id="${c.id}" aria-label="Remove ${esc(c.name)}">
        ${iconTrash()}
      </button>
    </div>
    <button class="card-contact-toggle${isExpanded ? ' active' : ''}" data-action="toggle-emails" data-id="${c.id}">
      ${iconEnvelope()}
      <span>${cardEmails.length} ${cardEmails.length === 1 ? 'contact' : 'contacts'}</span>
      ${isExpanded ? iconChevronUp() : iconChevronDown()}
    </button>
  </div>`;
}

function placeEmailPanel(companyId) {
  const c = companies.find(x => x.id === companyId);
  if (!c) return;

  const grid    = document.getElementById('grid');
  const clicked = document.getElementById('card-' + companyId);
  if (!clicked) return;

  // Find every card in the same grid row (same offsetTop)
  const allCards   = [...grid.querySelectorAll('.card')];
  const rowTop     = clicked.offsetTop;
  const sameRow    = allCards.filter(card => card.offsetTop === rowTop);
  const lastInRow  = sameRow[sameRow.length - 1];

  // Build panel
  const cardEmails = emailsForCompany(companyId);
  const panel = document.createElement('div');
  panel.id        = 'active-email-panel';
  panel.className = 'email-panel';
  const linkedinIcon = `<svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor"><path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/></svg>`;

  panel.innerHTML = `
    <div class="email-panel-header">
      <div class="email-panel-title">${iconEnvelope()} <span>Contacts — ${esc(c.name)}</span></div>
      <button class="btn-ghost email-panel-close" data-action="toggle-emails" data-id="${companyId}">✕ Close</button>
    </div>
    ${cardEmails.length > 0 ? `
    <div class="contact-table-wrap">
      <table class="contact-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Position</th>
            <th>Email</th>
            <th>Phone</th>
            <th>LinkedIn</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${cardEmails.map(e => `
          <tr>
            <td class="ct-name">${e.name ? esc(e.name) : '<span class="ct-empty">—</span>'}</td>
            <td class="ct-role">${e.role ? esc(e.role) : '<span class="ct-empty">—</span>'}</td>
            <td><a href="mailto:${esc(e.email)}" class="ct-link">${esc(e.email)}</a></td>
            <td>${e.phone ? `<a href="tel:${esc(e.phone)}" class="ct-link">${esc(e.phone)}</a>` : '<span class="ct-empty">—</span>'}</td>
            <td>${e.linkedin ? `<a href="${esc(e.linkedin)}" target="_blank" rel="noopener noreferrer" class="ct-linkedin-btn">${linkedinIcon} LinkedIn</a>` : '<span class="ct-empty">—</span>'}</td>
            <td class="ct-actions">
              <button class="btn-icon-sm" data-action="edit-email" data-email-id="${e.id}" aria-label="Edit contact">${iconEdit()}</button>
              <button class="btn-icon-sm danger" data-action="delete-email" data-email-id="${e.id}" aria-label="Remove contact">${iconTrash()}</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '<p class="card-emails-empty">No contacts yet.</p>'}
    <button class="email-add-btn" data-action="add-email-to-company" data-id="${companyId}">+ Add contact</button>`;

  // Insert as a grid sibling right after the last card in this row
  lastInRow.insertAdjacentElement('afterend', panel);

  // Wire events inside the panel
  panel.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', () => {
      const { action, id, emailId } = el.dataset;
      if (action === 'toggle-emails')        toggleEmailPanel(id);
      if (action === 'add-email-to-company') openEmailModal(id);
      if (action === 'edit-email')           openEmailModal(null, emailId);
      if (action === 'delete-email')         deleteEmail(emailId);
    });
  });
}

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── SVG icons ── */
function iconChevronLeft() {
  return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M10 4l-4 4 4 4"/></svg>`;
}
function iconChevronRight() {
  return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M6 4l4 4-4 4"/></svg>`;
}

function iconEnvelope() {
  return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="3" width="14" height="10" rx="1.5"/><path d="M1 4l7 5 7-5"/></svg>`;
}
function iconChevronDown() {
  return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6l4 4 4-4"/></svg>`;
}
function iconChevronUp() {
  return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10l4-4 4 4"/></svg>`;
}

function iconExternal() {
  return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V9"/><path d="M10 2h4v4"/><path d="M14 2L8 8"/></svg>`;
}
function iconEdit() {
  return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11.5 2.5a1.5 1.5 0 012 2L5 13H2v-3L11.5 2.5z"/></svg>`;
}
function iconTrash() {
  return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 4h12M6 4V2h4v2M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4"/></svg>`;
}

/* ── Open career page ── */
function openCareer(id) {
  recordVisit(id); // navigation handled by the <a href>
}

/* ── Modal (add / edit) ── */
function openModal(editId = null) {
  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const saveBtn = document.getElementById('modal-save');

  clearForm();

  if (editId) {
    const c = companies.find(x => x.id === editId);
    if (!c) return;
    document.getElementById('edit-id').value = editId;
    document.getElementById('f-name').value = c.name;
    document.getElementById('f-url').value = c.url;
    document.getElementById('f-tag').value = c.tag || '';
    document.getElementById('f-note').value = c.note || '';
    title.textContent = 'Edit company';
    saveBtn.textContent = 'Save changes';
  } else {
    title.textContent = 'Add company';
    saveBtn.textContent = 'Add company';
  }

  overlay.hidden = false;
  document.getElementById('f-name').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').hidden = true;
  clearForm();
}

function clearForm() {
  ['edit-id','f-name','f-url','f-tag','f-note'].forEach(id => {
    document.getElementById(id).value = '';
    document.getElementById(id)?.classList?.remove('error');
  });
  document.getElementById('err-name').hidden = true;
  document.getElementById('err-url').hidden = true;
}

function saveForm() {
  const id = document.getElementById('edit-id').value;
  const name = document.getElementById('f-name').value.trim();
  const url = normalizeUrl(document.getElementById('f-url').value);
  const tag = document.getElementById('f-tag').value.trim();
  const note = document.getElementById('f-note').value.trim();

  // validation
  let ok = true;
  if (!name) {
    document.getElementById('err-name').hidden = false;
    document.getElementById('f-name').classList.add('error');
    ok = false;
  } else {
    document.getElementById('err-name').hidden = true;
    document.getElementById('f-name').classList.remove('error');
  }
  if (!url || !/^https?:\/\/.+/i.test(url)) {
    document.getElementById('err-url').hidden = false;
    document.getElementById('f-url').classList.add('error');
    ok = false;
  } else {
    document.getElementById('err-url').hidden = true;
    document.getElementById('f-url').classList.remove('error');
  }
  if (!ok) return;

  if (id) {
    const idx = companies.findIndex(c => c.id === id);
    if (idx !== -1) companies[idx] = { id, name, url, tag, note };
  } else {
    companies.push({ id: uid(), name, url, tag, note });
  }

  save();
  closeModal();
  render();
}

/* ── Delete confirm ── */
function confirmDelete(id) {
  const c = companies.find(x => x.id === id);
  if (!c) return;
  pendingDeleteId = id;
  document.getElementById('confirm-name').textContent = c.name;
  document.getElementById('confirm-overlay').hidden = false;
}

function closeConfirm() {
  document.getElementById('confirm-overlay').hidden = true;
  pendingDeleteId = null;
}

function executeDelete() {
  if (!pendingDeleteId) return;
  companies = companies.filter(c => c.id !== pendingDeleteId);
  emails    = emails.filter(e => e.companyId !== pendingDeleteId);
  expandedPanels.delete(pendingDeleteId);
  save();
  saveEmails();
  closeConfirm();
  render();
}

/* ── Bookmark import ── */
function importFromBookmarkHTML(htmlText) {
  // Chrome exports Netscape Bookmark Format — the DOM parser mangles its
  // non-standard <DL><p> structure, so parse the raw text instead.

  // Find the <H3>Companies</H3> folder heading (case-insensitive)
  const folderMatch = /<h3[^>]*>\s*companies\s*<\/h3>/i.exec(htmlText);
  if (!folderMatch) return { error: 'No "Companies" folder found in the file.' };

  // Grab everything after that heading and find the first <DL>
  const afterHeading = htmlText.slice(folderMatch.index + folderMatch[0].length);
  const dlOffset = afterHeading.search(/<dl\b/i);
  if (dlOffset === -1) return { error: 'Could not read the Companies folder contents.' };

  // Extract the matched DL, tracking depth so nested sub-folders are included
  const fromDL = afterHeading.slice(dlOffset);
  let depth = 0, endPos = fromDL.length;
  const tagRe = /<\/?dl\b/gi;
  let m;
  while ((m = tagRe.exec(fromDL)) !== null) {
    if (m[0].startsWith('</')) {
      if (--depth <= 0) { endPos = tagRe.lastIndex; break; }
    } else {
      depth++;
    }
  }
  const dlContent = fromDL.slice(0, endPos);

  // Parse every <A HREF="...">Name</A> inside that DL
  const linkRe = /<a\b[^>]*\bhref="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
  let imported = 0, skipped = 0;
  while ((m = linkRe.exec(dlContent)) !== null) {
    const url = normalizeUrl(m[1]);
    const name = decodeHTMLEntities(m[2].trim());
    if (!url || !name || !/^https?:\/\//i.test(url)) continue;
    if (companies.some(c => c.url === url)) { skipped++; continue; }
    companies.push({ id: uid(), name, url, tag: '', note: '' });
    imported++;
  }

  if (imported > 0) { save(); render(); }
  return { imported, skipped };
}

function decodeHTMLEntities(str) {
  const el = document.createElement('textarea');
  el.innerHTML = str;
  return el.value;
}

function showImportToast(msg, isError = false) {
  let toast = document.getElementById('import-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'import-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = 'import-toast' + (isError ? ' error' : '');
  toast.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.hidden = true; }, 4000);
}

/* ── Event wiring ── */
document.getElementById('add-btn').addEventListener('click', () => openModal());
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('modal-save').addEventListener('click', saveForm);

document.getElementById('confirm-close').addEventListener('click', closeConfirm);
document.getElementById('confirm-cancel').addEventListener('click', closeConfirm);
document.getElementById('confirm-ok').addEventListener('click', executeDelete);

document.getElementById('add-email-btn').addEventListener('click', () => openEmailModal());
document.getElementById('email-modal-close').addEventListener('click', closeEmailModal);
document.getElementById('email-modal-cancel').addEventListener('click', closeEmailModal);
document.getElementById('email-modal-save').addEventListener('click', saveEmailForm);
document.getElementById('email-modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeEmailModal();
});

document.getElementById('history-btn').addEventListener('click', openHistory);
document.getElementById('history-close').addEventListener('click', closeHistory);
document.getElementById('history-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeHistory();
});

document.getElementById('import-btn').addEventListener('click', () => {
  document.getElementById('import-file').click();
});

document.getElementById('import-file').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const result = importFromBookmarkHTML(ev.target.result);
    if (result.error) {
      showImportToast(result.error, true);
    } else {
      showImportToast(
        `Imported ${result.imported} ${result.imported === 1 ? 'company' : 'companies'}` +
        (result.skipped ? ` · ${result.skipped} already existed` : '')
      );
    }
  };
  reader.readAsText(file);
  e.target.value = ''; // allow re-importing same file
});

document.getElementById('search').addEventListener('input', render);

// close modal on overlay click
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});
document.getElementById('confirm-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeConfirm();
});

// keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeConfirm(); closeHistory(); closeEmailModal(); closeLinkedInModal(); }
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('search').focus();
  }
});

/* ── Theme ── */
function applyTheme(dark) {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.getElementById('theme-icon-sun').toggleAttribute('hidden',  dark);
  document.getElementById('theme-icon-moon').toggleAttribute('hidden', !dark);
}

function initTheme() {
  const saved = localStorage.getItem('career_hub_theme');
  const prefersDark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark);
}

document.getElementById('theme-btn').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme !== 'dark';
  applyTheme(dark);
  localStorage.setItem('career_hub_theme', dark ? 'dark' : 'light');
});

/* ── LinkedIn ── */
function openLinkedIn() {
  const saved = localStorage.getItem(LINKEDIN_KEY);
  if (saved) {
    window.open(saved, '_blank', 'noopener');
  } else {
    showLinkedInModal();
  }
}

function showLinkedInModal(prefill = '') {
  document.getElementById('linkedin-url-input').value = prefill;
  document.getElementById('err-linkedin-url').hidden = true;
  document.getElementById('linkedin-modal-overlay').hidden = false;
  document.getElementById('linkedin-url-input').focus();
}

function closeLinkedInModal() {
  document.getElementById('linkedin-modal-overlay').hidden = true;
}

function saveLinkedIn() {
  const val = document.getElementById('linkedin-url-input').value.trim();
  const err = document.getElementById('err-linkedin-url');
  if (!val || !/^https?:\/\/(www\.)?linkedin\.com\//i.test(val)) {
    err.hidden = false;
    return;
  }
  err.hidden = true;
  localStorage.setItem(LINKEDIN_KEY, val);
  closeLinkedInModal();
  window.open(val, '_blank', 'noopener');
}

document.getElementById('linkedin-btn').addEventListener('click', openLinkedIn);
document.getElementById('linkedin-modal-close').addEventListener('click', closeLinkedInModal);
document.getElementById('linkedin-modal-cancel').addEventListener('click', closeLinkedInModal);
document.getElementById('linkedin-modal-save').addEventListener('click', saveLinkedIn);
document.getElementById('linkedin-modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeLinkedInModal();
});
// allow editing saved URL via right-click / long-press context isn't easy — expose via Shift+click
document.getElementById('linkedin-btn').addEventListener('contextmenu', e => {
  e.preventDefault();
  showLinkedInModal(localStorage.getItem(LINKEDIN_KEY) || '');
});

/* ── Personalized title ── */
function applyUsername() {
  const name = localStorage.getItem(NAME_KEY) || '';
  const h1 = document.getElementById('site-title');
  h1.textContent = name ? `${name}'s Career Hub` : 'Career Hub';
  document.title = name ? `${name}'s Career Hub` : 'Career Hub';
}

function startTitleEdit() {
  const h1 = document.getElementById('site-title');
  const saved = localStorage.getItem(NAME_KEY) || '';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'title-input';
  input.value = saved;
  input.placeholder = 'Your name';
  input.maxLength = 30;

  h1.replaceWith(input);
  input.focus();
  input.select();

  function commit() {
    const name = input.value.trim();
    if (name) localStorage.setItem(NAME_KEY, name);
    else localStorage.removeItem(NAME_KEY);
    const newH1 = document.createElement('h1');
    newH1.id = 'site-title';
    newH1.className = 'site-title';
    newH1.title = 'Click to personalize';
    input.replaceWith(newH1);
    applyUsername();
    newH1.addEventListener('click', startTitleEdit);
  }

  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { input.value = saved; input.blur(); }
  });
}

document.getElementById('site-title').addEventListener('click', startTitleEdit);

/* ── Sticky offset ── */
function syncToolbarTop() {
  const h = document.querySelector('.site-header')?.offsetHeight || 0;
  document.documentElement.style.setProperty('--header-h', h + 'px');
}
window.addEventListener('resize', syncToolbarTop);

/* ── Boot ── */
initTheme();
applyUsername();
syncToolbarTop();
loadVisits();
loadEmails();
load();
render();
