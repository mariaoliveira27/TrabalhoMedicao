import { renderCharts, bindChartControls } from './charts.js';

const app = document.querySelector('#app');
const account = document.querySelector('#account');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icons = {
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg>',
  shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6zM8 12l3 3 5-6"/></svg>',
  qr: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v7h-6M6 6h1M17 6h1M6 17h1"/></svg>'
};
let config, user, step = 0, busy = false, adminRows = [];
let draft = { name: '', company: '', answers: {}, consent: false };
let basePath = new URL(document.baseURI).pathname.replace(/\/+$/, '');
let draftKey = '';

async function api(path, options = {}) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(user?.csrf ? { 'X-CSRF-Token': user.csrf } : {}), ...options.headers };
  const response = await fetch(`${basePath}/api${path}`, { ...options, headers, credentials: 'same-origin' });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || 'Não foi possível concluir a solicitação.');
    Object.assign(error, { status: response.status, fields: data.fields, receipt: data.receipt });
    throw error;
  }
  return data;
}
function date(value) { return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); }
function toast(message) {
  const element = document.querySelector('#toast');
  element.textContent = message; element.hidden = false;
  clearTimeout(toast.timeout); toast.timeout = setTimeout(() => { element.hidden = true; }, 4500);
}
function focusHeading() { const h = app.querySelector('h1,h2'); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } window.scrollTo({ top: 0, behavior: 'instant' }); }
function showError(error) {
  if (error.status === 401) {
    user = null; account.hidden = true; renderLogin();
    toast('Sua sessão terminou. Entre novamente; seu rascunho continua nesta aba.');
    return;
  }
  let target = document.querySelector('#form-error');
  if (!target) { target = document.createElement('div'); target.id = 'form-error'; target.className = 'error'; target.setAttribute('role', 'alert'); app.prepend(target); }
  target.hidden = false; target.textContent = error.message;
  if (error.fields) fieldErrors(error.fields);
}
function saveDraft() {
  try { sessionStorage.setItem(draftKey, JSON.stringify(draft)); } catch { /* The form remains usable when storage is unavailable. */ }
}
function clearDraft() { try { sessionStorage.removeItem(draftKey); } catch {} }
function loadDraft() {
  draftKey = `medicao:${basePath}:${user.email}:${config.questionnaire.version}`;
  draft = { name: user.name || '', company: '', answers: {}, consent: false };
  try {
    const saved = JSON.parse(sessionStorage.getItem(draftKey));
    if (saved && typeof saved.name === 'string' && typeof saved.company === 'string' && saved.answers && typeof saved.answers === 'object') draft = { ...draft, ...saved };
  } catch {}
}
function privacyButton() { return '<button type="button" class="text-button" data-action="privacy">como seus dados são usados</button>'; }

function renderLogin() {
  account.hidden = true;
  app.innerHTML = `<section class="login-layout">
    <div class="story"><span class="tag"><span class="dot"></span> PESQUISA · GESTÃO E INDICADORES</span>
      <h1>O que a gente mede,<br>a gente pode<br><em>transformar.</em></h1>
      <p>Por trás de cada indicador, existe uma realidade. Compartilhe a sua e ajude a entender a medição nas empresas.</p>
      <div class="art" aria-hidden="true"><span class="art-note">OBSERVAR. MEDIR. EVOLUIR.</span>
        <svg viewBox="0 0 470 210" fill="none"><defs><pattern id="grid" width="35" height="35" patternUnits="userSpaceOnUse"><path d="M35 0H0V35" stroke="#cbd8bc" stroke-width=".7"/></pattern></defs><rect x="5" y="5" width="440" height="195" fill="url(#grid)"/><path d="M27 183H435" stroke="#a9bc96"/><rect x="47" y="128" width="57" height="55" rx="5" fill="#c0d0a8"/><rect x="129" y="98" width="57" height="85" rx="5" fill="#9bb581"/><rect x="211" y="114" width="57" height="69" rx="5" fill="#bfd29f"/><rect x="293" y="58" width="57" height="125" rx="5" fill="#5e8059"/><path d="m61 103 91-38 78 16 88-49 78-11" stroke="#284e3b" stroke-width="2"/><circle cx="61" cy="103" r="5" fill="#e9efdf" stroke="#284e3b" stroke-width="2"/><circle cx="152" cy="65" r="5" fill="#e9efdf" stroke="#284e3b" stroke-width="2"/><circle cx="230" cy="81" r="5" fill="#e9efdf" stroke="#284e3b" stroke-width="2"/><circle cx="318" cy="32" r="5" fill="#e9efdf" stroke="#284e3b" stroke-width="2"/><circle cx="396" cy="21" r="15" fill="#d6e7b3"/><path d="m389 28 14-14m-12 0h12v12" stroke="#284e3b" stroke-width="2"/><text x="47" y="202" fill="#738466" font-size="9" font-family="Arial">01</text><text x="129" y="202" fill="#738466" font-size="9" font-family="Arial">02</text><text x="211" y="202" fill="#738466" font-size="9" font-family="Arial">03</text><text x="293" y="202" fill="#738466" font-size="9" font-family="Arial">04</text></svg>
      </div><div class="story-bottom"><span>↗</span> SUA EXPERIÊNCIA FAZ PARTE DESSA EVOLUÇÃO.</div>
    </div>
    <div class="entry"><div class="step-label">SEU PONTO DE VISTA IMPORTA</div><h2>Vamos começar?</h2>
      <p class="intro">Entre com sua conta Google para participar.<br>Depois, queremos conhecer você e sua empresa.</p>
      <div class="facts"><span>${icons.clock} Cerca de 5 minutos</span><span>${icons.shield} Acesso identificado</span></div>
      <div id="google-button" class="google-slot"><span class="google-unavailable">Preparando login Google…</span></div>
      <div id="login-error" class="error" role="alert" hidden></div>
      <p class="login-help">Sua conta identifica a participação e evita respostas duplicadas.</p>
      <div class="divider">prefere responder pelo celular?</div>
      <button class="button secondary qr-button" data-action="qr">${icons.qr} Mostrar QR code <span aria-hidden="true">↗</span></button>
      <p class="privacy-note">Participação voluntária em uma pesquisa acadêmica.<br>Saiba ${privacyButton()}.</p>
    </div></section>`;
  setupGoogle().catch(error => { document.querySelector('#google-button').innerHTML = `<div class="google-unavailable">${esc(error.message)}</div>`; });
}
let googleScript;
function loadGoogle() {
  if (window.google?.accounts) return Promise.resolve();
  if (!googleScript) googleScript = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = setTimeout(() => reject(new Error('O Google demorou a responder. Recarregue a página para tentar novamente.')), 15000);
    script.src = 'https://accounts.google.com/gsi/client'; script.async = true;
    script.onload = () => { clearTimeout(timeout); resolve(); };
    script.onerror = () => { clearTimeout(timeout); reject(new Error('Não foi possível carregar o Google. Verifique sua conexão e recarregue.')); };
    document.head.append(script);
  });
  return googleScript;
}
async function setupGoogle() {
  if (!config.googleClientId) { document.querySelector('#google-button').innerHTML = '<div class="google-unavailable">O login Google será liberado após a configuração pela equipe.</div>'; return; }
  const [challenge] = await Promise.all([api('/auth/challenge'), loadGoogle()]);
  window.google.accounts.id.initialize({ client_id: config.googleClientId, nonce: challenge.nonce, auto_select: false, callback: async response => {
    if (busy) return; busy = true;
    const target = document.querySelector('#login-error'); target.hidden = true;
    try { await api('/auth/google', { method: 'POST', body: JSON.stringify({ credential: response.credential }) }); await loadUser(); }
    catch (error) { target.textContent = error.message + ' Recarregue a página para tentar novamente.'; target.hidden = false; }
    finally { busy = false; }
  } });
  const target = document.querySelector('#google-button'); target.innerHTML = '';
  window.google.accounts.id.renderButton(target, { theme: 'outline', size: 'large', shape: 'rectangular', text: 'continue_with', locale: 'pt-BR', width: Math.min(350, target.clientWidth) });
}
async function loadUser() {
  user = await api('/me');
  account.hidden = false;
  account.innerHTML = `<div class="account-info"><span class="avatar">${esc((user.name || user.email).slice(0, 1).toUpperCase())}</span><span class="account-name">${esc(user.name || 'Participante')}<span class="email">${esc(user.email)}</span></span>${user.admin ? '<button class="text-button" data-action="admin">Resultados</button>' : ''}<button class="text-button" data-action="logout">Sair</button></div>`;
  loadDraft(); step = 0;
  if (user.receipt) renderSuccess(); else renderSurvey();
}
const allSteps = () => ['Identificação', ...config.questionnaire.sections.map(s => s.title), 'Revisão'];
function renderSurvey() {
  const steps = allSteps(), last = step === steps.length - 1;
  app.innerHTML = `<div class="survey-layout"><aside class="survey-side"><span class="eyebrow">PESQUISA ACADÊMICA</span><h1>Sua experiência.<br>Novas perspectivas.</h1><p>${esc(config.questionnaire.description)}</p><ol class="steps">${steps.map((title, index) => `<li class="${index === step ? 'active' : index < step ? 'done' : ''}" ${index === step ? 'aria-current="step"' : ''}><span class="step-index">${index < step ? '✓' : `0${index + 1}`}</span>${esc(title)}</li>`).join('')}</ol><p>${icons.shield} Respostas vinculadas à sua conta.<br>${privacyButton()}</p></aside>
    <section class="survey-card" aria-label="Formulário da pesquisa"><div class="progress" role="progressbar" aria-label="Progresso" aria-valuemin="0" aria-valuemax="${steps.length}" aria-valuenow="${step + 1}"><span></span></div>
    <form id="survey-form" novalidate><div class="card-body"><div class="card-top"><span>MEDIÇÃO NA PRÁTICA</span><span>ETAPA ${step + 1} DE ${steps.length}</span></div><h2>${esc(steps[step])}</h2><p class="card-description">${step === 0 ? 'Antes de tudo, vamos conhecer você. Campos com * são obrigatórios.' : last ? 'Confira suas informações antes de concluir a participação.' : esc(config.questionnaire.sections[step - 1].description)}</p>
    ${step === 0 ? identification() : last ? review() : config.questionnaire.sections[step - 1].questions.map(questionField).join('')}
    <div id="form-error" class="error" role="alert" hidden></div></div>
    <div class="card-actions">${step > 0 ? '<button type="button" class="button secondary" data-action="back">← Voltar</button>' : '<span class="autosave">Rascunho salvo nesta aba</span>'}<button class="button" type="submit">${last ? 'Enviar respostas ✓' : 'Continuar →'}</button></div></form></section></div>`;
  document.querySelector('#survey-form').addEventListener('submit', nextStep);
  document.querySelector('.progress span').style.width = `${(step + 1) / steps.length * 100}%`;
  document.querySelector('#survey-form').addEventListener('input', collectDraft);
  document.querySelector('#survey-form').addEventListener('change', collectDraft);
}
function identification() {
  return `${config.questionnaire.notice ? `<p class="callout">${esc(config.questionnaire.notice)}</p>` : ''}
    <label class="field"><span class="field-label">Seu nome <span class="required">*</span></span><input id="name" name="name" type="text" autocomplete="name" maxlength="160" required value="${esc(draft.name)}"></label>
    <label class="field"><span class="field-label">E-mail da conta Google</span><input type="email" readonly value="${esc(user.email)}"><span class="hint">Este é o e-mail associado à sua participação.</span></label>
    <label class="field"><span class="field-label">Empresa <span class="required">*</span></span><input id="company" name="company" type="text" autocomplete="organization" maxlength="200" required placeholder="Nome da empresa em que você atua" value="${esc(draft.company)}"></label>`;
}
function questionField(q) {
  const value = draft.answers[q.id];
  const title = `${esc(q.label)} ${q.required ? '<span class="required">*</span>' : '<span class="optional">(opcional)</span>'}`;
  const hint = q.hint ? `<span class="hint">${esc(q.hint)}</span>` : '';
  if (q.type === 'multiselect') return `<fieldset class="field" id="field-${esc(q.id)}"><legend>${title}</legend>${hint}<div class="checkbox-grid">${q.options.map((option, i) => `<label class="check-option"><input type="checkbox" name="${esc(q.id)}" value="${esc(option)}" ${Array.isArray(value) && value.includes(option) ? 'checked' : ''}>${esc(option)}</label>`).join('')}</div></fieldset>`;
  const attrs = `id="${esc(q.id)}" name="${esc(q.id)}" ${q.required ? 'required' : ''}`;
  let control;
  if (q.type === 'select') control = `<select ${attrs}><option value="">Selecione uma opção</option>${q.options.map(option => `<option ${value === option ? 'selected' : ''}>${esc(option)}</option>`).join('')}</select>`;
  else if (q.type === 'number') control = `<input type="number" ${attrs} min="${q.min}" max="${q.max}" step="${q.integer ? 1 : 'any'}" value="${esc(value ?? '')}">`;
  else if (q.type === 'textarea') control = `<textarea ${attrs} maxlength="${q.maxLength || 2000}" rows="4" placeholder="Compartilhe sua experiência…">${esc(value || '')}</textarea><span class="hint">Até ${q.maxLength || 2000} caracteres.</span>`;
  else control = `<input type="text" ${attrs} maxlength="${q.maxLength || 2000}" value="${esc(value || '')}">`;
  return `<label class="field"><span class="field-label">${title}</span>${hint}${control}</label>`;
}
function collectDraft() {
  const form = document.querySelector('#survey-form'); if (!form) return;
  if (step === 0) { draft.name = form.elements.name.value; draft.company = form.elements.company.value; }
  else if (step < allSteps().length - 1) {
    for (const q of config.questionnaire.sections[step - 1].questions) draft.answers[q.id] = q.type === 'multiselect' ? [...form.querySelectorAll('input[type=checkbox]:checked')].filter(el => el.name === q.id).map(el => el.value) : form.elements[q.id].value;
  } else draft.consent = form.elements.consent.checked;
  saveDraft();
}
function fieldErrors(errors) {
  document.querySelectorAll('.field-error').forEach(el => el.remove());
  document.querySelectorAll('.invalid').forEach(el => { el.classList.remove('invalid'); el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); });
  for (const [id, message] of Object.entries(errors)) {
    const control = document.getElementById(id) || document.getElementById(`field-${id}`);
    if (!control) continue;
    const error = document.createElement('span'); error.className = 'field-error'; error.id = `error-${id}`; error.textContent = message;
    control.classList.add('invalid'); control.setAttribute('aria-invalid', 'true'); control.setAttribute('aria-describedby', error.id);
    (control.closest('.field') || control.parentElement).append(error);
  }
  const first = document.querySelector('.invalid'); if (first) { (first.querySelector('input') || first).focus(); first.scrollIntoView({ block: 'center' }); }
}
function currentErrors() {
  const errors = {};
  if (step === 0) {
    if (!draft.name.trim()) errors.name = 'Informe seu nome.';
    if (!draft.company.trim()) errors.company = 'Informe a empresa.';
  } else if (step < allSteps().length - 1) {
    for (const q of config.questionnaire.sections[step - 1].questions) {
      const value = draft.answers[q.id];
      if (q.required && (!value || Array.isArray(value) && !value.length || typeof value === 'string' && !value.trim())) errors[q.id] = 'Preencha este campo para continuar.';
      if (Array.isArray(value) && value.includes('Nenhuma') && value.length > 1) errors[q.id] = 'Selecione “Nenhuma” sozinha ou escolha as ferramentas utilizadas.';
      if (q.type === 'number' && value !== '' && value != null && (!Number.isFinite(Number(value)) || Number(value) < q.min || Number(value) > q.max || q.integer && !Number.isInteger(Number(value)))) errors[q.id] = `Informe um número ${q.integer ? 'inteiro ' : ''}entre ${q.min} e ${q.max}.`;
    }
  } else if (!draft.consent) errors.consent = 'Confirme sua participação antes de enviar.';
  return errors;
}
async function nextStep(event) {
  event.preventDefault(); if (busy) return;
  collectDraft(); const errors = currentErrors(); fieldErrors(errors);
  if (Object.keys(errors).length) return;
  if (step < allSteps().length - 1) { step++; renderSurvey(); focusHeading(); return; }
  busy = true;
  const button = event.target.querySelector('[type=submit]'); button.disabled = true; button.textContent = 'Enviando…';
  try {
    const response = await api('/responses', { method: 'POST', body: JSON.stringify({ ...draft, version: config.questionnaire.version }) });
    user.receipt = response.receipt; clearDraft(); renderSuccess(); focusHeading();
  } catch (error) {
    if (error.status === 409 && error.receipt) { user.receipt = error.receipt; clearDraft(); renderSuccess(); }
    else {
      if (error.fields) {
        const ids = Object.keys(error.fields);
        if (ids.some(id => ['name', 'company'].includes(id))) step = 0;
        else { const index = config.questionnaire.sections.findIndex(s => s.questions.some(q => ids.includes(q.id))); if (index >= 0) step = index + 1; }
        renderSurvey();
      }
      showError(error);
    }
  } finally { busy = false; if (button.isConnected) { button.disabled = false; button.textContent = 'Enviar respostas ✓'; } }
}
function review() {
  const pair = (label, value) => `<dt>${esc(label)}</dt><dd>${esc(Array.isArray(value) ? value.join(', ') : value === '' || value == null ? 'Não informado' : value)}</dd>`;
  return `<section class="review-group"><h3>Identificação</h3><dl>${pair('Nome', draft.name)}${pair('E-mail', user.email)}${pair('Empresa', draft.company)}</dl></section>${config.questionnaire.sections.map(s => `<section class="review-group"><h3>${esc(s.title)}</h3><dl>${s.questions.map(q => pair(q.label, draft.answers[q.id])).join('')}</dl></section>`).join('')}<label class="consent"><input id="consent" name="consent" type="checkbox" ${draft.consent ? 'checked' : ''}><span>Confirmo minha participação voluntária e entendo que meu nome, empresa e respostas serão associados à minha conta para esta pesquisa acadêmica. Li ${privacyButton()}.</span></label>`;
}
function renderSuccess() {
  app.innerHTML = `<section class="success-card"><div class="success-icon" aria-hidden="true">✓</div><span class="eyebrow">PARTICIPAÇÃO CONCLUÍDA</span><h1>Sua perspectiva<br>faz a diferença.</h1><p>Obrigado por compartilhar sua experiência.<br>Suas respostas foram registradas com sucesso.</p><div class="receipt"><span class="eyebrow">COMPROVANTE DE PARTICIPAÇÃO</span><p>${esc(user.email)}<br>${esc(date(user.receipt.createdAt))}</p><code>${esc(user.receipt.id)}</code></div><p class="small">É permitida uma resposta por conta Google.</p><div class="success-actions"><button class="button secondary" data-action="qr">${icons.qr} Compartilhar pesquisa</button>${user.admin ? '<button class="button" data-action="admin">Ver resultados →</button>' : ''}</div></section>`;
}
async function renderAdmin() {
  app.innerHTML = '<div class="loading">Carregando resultados…</div>';
  try {
    const data = await api('/admin/responses'); adminRows = data.responses;
    const companies = new Set(adminRows.map(r => r.company.toLocaleLowerCase().trim())).size;
    const today = adminRows.filter(r => new Date(r.created_at).toLocaleDateString('pt-BR') === new Date().toLocaleDateString('pt-BR')).length;
    app.innerHTML = `<section class="admin"><div class="admin-head"><div><span class="eyebrow">ÁREA DA EQUIPE</span><h1>Vozes que viram dados.</h1><p class="small">Acompanhe as participações e explore as respostas da pesquisa.</p></div><a class="button" href="${esc(basePath)}/api/admin/export" download>Exportar CSV ↓</a></div><div class="stats"><div class="stat"><strong>${adminRows.length}</strong><span>Participações</span></div><div class="stat"><strong>${companies}</strong><span>Empresas informadas</span></div><div class="stat"><strong>${today}</strong><span>Respostas hoje</span></div></div><div class="toolbar"><label><span class="hint">Buscar participante ou empresa</span><input id="search" type="text" placeholder="Digite um nome, e-mail ou empresa"></label><button class="button secondary" data-action="admin">Atualizar ↻</button></div><div id="results"></div><div class="admin-links"><button class="text-button" data-action="survey">Voltar à pesquisa</button><span class="small">Respostas identificadas · acesso restrito</span></div></section>`;
    const charts = document.createElement('div'); charts.id = 'charts'; charts.innerHTML = renderCharts(adminRows);
    document.querySelector('.stats').after(charts); bindChartControls(charts, adminRows);
    renderRows(''); document.querySelector('#search').addEventListener('input', event => renderRows(event.target.value));
  } catch (error) { app.innerHTML = '<div class="loading">Não foi possível carregar os resultados.</div>'; showError(error); }
}
function renderRows(query) {
  const rows = adminRows.filter(row => `${row.name} ${row.email} ${row.company}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  document.querySelector('#results').innerHTML = rows.length ? `<div class="table-wrap"><table><thead><tr><th>Participante</th><th>Empresa</th><th>Recebida em</th><th><span class="small">Detalhes</span></th></tr></thead><tbody>${rows.map(row => `<tr><td>${esc(row.name)}<span class="small">${esc(row.email)}</span></td><td>${esc(row.company)}</td><td>${esc(date(row.created_at))}</td><td><button class="text-button" data-detail="${esc(row.id)}">Ver resposta ↗</button></td></tr>`).join('')}</tbody></table></div>` : `<div class="table-wrap empty">${query ? 'Nenhum resultado para esta busca.' : 'Ainda não há participações. Compartilhe o QR code para começar.'}</div>`;
}
function showDetail(id) {
  const row = adminRows.find(r => r.id === id); if (!row) return;
  document.querySelector('#detail-dialog')?.remove();
  const dialog = document.createElement('dialog'); dialog.id = 'detail-dialog'; dialog.setAttribute('aria-labelledby', 'detail-title');
  const labels = Object.fromEntries(config.questionnaire.sections.flatMap(s => s.questions.map(q => [q.id, q.label])));
  dialog.innerHTML = `<button class="close icon-button" aria-label="Fechar resposta">×</button><span class="eyebrow">RESPOSTA · VERSÃO ${esc(row.version)}</span><h2 id="detail-title">${esc(row.name)}</h2><p>${esc(row.email)}<br>${esc(row.company)} · ${esc(date(row.created_at))}</p><div class="detail-list review-group"><dl>${Object.entries(row.answers).map(([id, value]) => `<dt>${esc(labels[id] || id)}</dt><dd>${esc(Array.isArray(value) ? value.join(', ') : value || 'Não informado')}</dd>`).join('')}</dl></div><p class="small">Participação confirmada em ${esc(date(row.consent_at))}.<br>Protocolo: ${esc(row.id)}</p>`;
  document.body.append(dialog); dialog.showModal(); dialog.querySelector('.close').onclick = () => dialog.close();
}

document.addEventListener('click', async event => {
  if (event.target.closest('.close')) event.target.closest('dialog').close();
  const detail = event.target.closest('[data-detail]'); if (detail) showDetail(detail.dataset.detail);
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'qr') document.querySelector('#qr-dialog').showModal();
  if (action === 'privacy') document.querySelector('#privacy-dialog').showModal();
  if (action === 'back' && !busy) { collectDraft(); step = Math.max(0, step - 1); renderSurvey(); focusHeading(); }
  if (action === 'admin') { await renderAdmin(); focusHeading(); }
  if (action === 'survey') { if (user.receipt) renderSuccess(); else renderSurvey(); focusHeading(); }
  if (action === 'logout' && !busy) {
    try { await api('/auth/logout', { method: 'POST' }); clearDraft(); user = null; window.google?.accounts.id.disableAutoSelect(); renderLogin(); toast('Você saiu da sua conta.'); } catch (error) { showError(error); }
  }
});
document.querySelector('#copy-link').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(`${config.publicUrl}/`); document.querySelector('#copy-status').textContent = 'Link copiado!'; }
  catch { document.querySelector('#copy-status').textContent = 'Copie o endereço exibido acima.'; }
});

async function init() {
  try {
    config = await api('/config'); basePath = config.basePath;
    if (config.preview) document.querySelector('.header-note').textContent = 'TESTE LOCAL · DADOS FICTÍCIOS';
    document.title = `${config.questionnaire.title} · Pesquisa`;
    document.querySelector('#qr-image').src = `${basePath}/api/qr`;
    const link = document.querySelector('#public-link'); link.href = `${config.publicUrl}/`; link.textContent = `${config.publicUrl}/`;
    try { await loadUser(); } catch (error) { if (error.status === 401) renderLogin(); else throw error; }
  } catch (error) {
    app.innerHTML = `<section class="success-card"><h1>Vamos tentar de novo?</h1><p>${esc(error.message)}</p><a class="button" href="./">Recarregar página</a></section>`;
  } finally { app.setAttribute('aria-busy', 'false'); }
}
init();
