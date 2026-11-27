import { drawWhiteboardSketches, fitWhiteboardText, drawWhiteboardConnections } from './whiteboard.js?v=rq-dot-matrix-restaurado';
import { presentationSlides } from './presentation.js?v=fechamento-restaurado';
import { significance } from './research-tests.js?v=rq1-oito-testes';
import { isQuestionVisible } from './questionnaire.js';
import { renderCharts, bindChartControls, renderResearchViolin } from './charts.js?v=sem-descricao-inferior';

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
function date(value, simulated = false) {
  return new Date(value).toLocaleString('pt-BR', {
    dateStyle: 'short', timeStyle: 'short', timeZone: simulated ? 'America/Sao_Paulo' : undefined
  });
}
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
  account.innerHTML = `<div class="account-info"><span class="avatar">${esc((user.name || user.email).slice(0, 1).toUpperCase())}</span><span class="account-name">${esc(user.name || 'Participante')}<span class="email">${esc(user.email)}</span></span>${user.admin ? '<button class="text-button" data-action="admin-presentation">Apresentação</button>' : ''}<button class="text-button" data-action="logout">Sair</button></div>`;
  loadDraft(); step = 0;
  if (user.admin) {
    await openPresentation();
  } else if (user.receipt) {
    renderSuccess();
  } else {
    renderSurvey();
  }
}
const allSteps = () => ['Identificação', ...config.questionnaire.sections.map(s => s.title), 'Revisão'];
function renderSurvey() {
  const steps = allSteps(), last = step === steps.length - 1;
  app.innerHTML = `<div class="survey-layout"><aside class="survey-side"><span class="eyebrow">PESQUISA ACADÊMICA</span><h1>Sua experiência.<br>Novas perspectivas.</h1><p>${esc(config.questionnaire.description)}</p><ol class="steps">${steps.map((title, index) => `<li class="${index === step ? 'active' : index < step ? 'done' : ''}" ${index === step ? 'aria-current="step"' : ''}><span class="step-index">${index < step ? '✓' : `0${index + 1}`}</span>${esc(title)}</li>`).join('')}</ol><p>${icons.shield} Respostas vinculadas à sua conta.<br>${privacyButton()}</p></aside>
    <section class="survey-card" aria-label="Formulário da pesquisa"><div class="progress" role="progressbar" aria-label="Progresso" aria-valuemin="0" aria-valuemax="${steps.length}" aria-valuenow="${step + 1}"><span></span></div>
    <form id="survey-form" novalidate><div class="card-body"><div class="card-top"><span>MEDIÇÃO NA PRÁTICA</span><span>ETAPA ${step + 1} DE ${steps.length}</span></div><h2>${esc(steps[step])}</h2><p class="card-description">${step === 0 ? 'Antes de tudo, vamos conhecer você. Campos com * são obrigatórios.' : last ? 'Confira suas informações antes de concluir a participação.' : esc(config.questionnaire.sections[step - 1].description)}</p>
    ${step === 0 ? identification() : last ? review() : config.questionnaire.sections[step - 1].questions.filter(q => isQuestionVisible(q, draft.answers)).map(questionField).join('')}
    <p id="completion-status" class="completion-status" role="status" aria-live="polite"></p><div id="form-error" class="error" role="alert" hidden></div></div>
    <div class="card-actions">${step > 0 ? '<button type="button" class="button secondary" data-action="back">← Voltar</button>' : '<span class="autosave">Rascunho salvo nesta aba</span>'}<button class="button" type="submit">${last ? 'Enviar respostas ✓' : 'Continuar →'}</button></div></form></section></div>`;
  updateCompletion();
  document.querySelector('#survey-form').addEventListener('submit', nextStep);
  document.querySelector('.progress span').style.width = `${(step + 1) / steps.length * 100}%`;
  document.querySelector('#survey-form').addEventListener('input', collectDraft);
  document.querySelector('#survey-form').addEventListener('change', event => {
    collectDraft();
    const questions = config.questionnaire.sections.flatMap(section => section.questions);
    if (questions.some(q => q.showWhen?.question === event.target.name)) {
      for (const q of questions) {
        if (!isQuestionVisible(q, draft.answers)) delete draft.answers[q.id];
      }
      saveDraft();
      const changedName = event.target.name;
      renderSurvey();
      document.querySelector(`[name="${changedName}"]:checked`)?.focus();
    }
  });
}
function identification() {
  return `${config.questionnaire.notice ? `<p class="callout">${esc(config.questionnaire.notice)}</p>` : ''}
    <label class="field"><span class="field-label">Seu nome <span class="required">*</span></span><input id="name" name="name" type="text" autocomplete="name" maxlength="160" required value="${esc(draft.name)}"></label>
    <label class="field"><span class="field-label">E-mail da conta Google</span><input type="email" readonly value="${esc(user.email)}"><span class="hint">Este é o e-mail associado à sua participação.</span></label>
    <label class="field"><span class="field-label">Empresa <span class="required">*</span></span><input id="company" name="company" type="text" autocomplete="organization" maxlength="200" required placeholder="Nome da empresa em que você atua" value="${esc(draft.company)}"></label>`;
}
function updateCompletion() {
  const target = document.querySelector('#completion-status');
  if (!target || step === 0 || step >= allSteps().length - 1) return;
  const questions = config.questionnaire.sections[step - 1].questions.filter(q => q.required && isQuestionVisible(q, draft.answers));
  const completed = questions.filter(q => {
    const value = draft.answers[q.id];
    return Array.isArray(value) ? value.length > 0 : value != null && String(value).trim() !== '';
  }).length;
  target.textContent = completed === questions.length ? '✓ Etapa preenchida! Você pode continuar.' : completed + ' de ' + questions.length + ' perguntas obrigatórias preenchidas';
}
function questionField(q) {
  const value = draft.answers[q.id];
  const symbol = q.type === 'textarea' ? '✎' : q.type === 'number' ? '#' : q.type === 'multiselect' ? '☑' : '◉';
  const title = `<span class="question-icon" aria-hidden="true">${symbol}</span> ${esc(q.label)} ${q.required ? '<span class="required">*</span>' : '<span class="optional">(opcional)</span>'}`;
  const hint = q.hint ? `<span class="hint">${esc(q.hint)}</span>` : '';
  if (q.type === 'multiselect') return `<fieldset class="field" id="field-${esc(q.id)}"><legend>${title}</legend>${hint}<div class="checkbox-grid">${q.options.map((option, i) => `<label class="check-option"><input type="checkbox" name="${esc(q.id)}" value="${esc(option)}" ${Array.isArray(value) && value.includes(option) ? 'checked' : ''}>${esc(option)}</label>`).join('')}</div></fieldset>`;
  if (q.type === 'select' && q.options[0].startsWith('1 —')) {
    return `<fieldset class="field" id="field-${esc(q.id)}"><legend>${title}</legend>${hint}<div class="rating-options">${q.options.map(option => `<label class="rating-option"><input type="radio" name="${esc(q.id)}" value="${esc(option)}" ${value === option ? 'checked' : ''}><span>${esc(option)}</span></label>`).join('')}</div></fieldset>`;
  }
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
    for (const q of config.questionnaire.sections[step - 1].questions) if (isQuestionVisible(q, draft.answers) && form.elements[q.id]) draft.answers[q.id] = q.type === 'multiselect' ? [...form.querySelectorAll('input[type=checkbox]:checked')].filter(el => el.name === q.id).map(el => el.value) : form.elements[q.id].value;
  } else draft.consent = form.elements.consent.checked;
  saveDraft();
  updateCompletion();
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
      if (!isQuestionVisible(q, draft.answers)) continue;
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
  return `<section class="review-group"><h3>Identificação</h3><dl>${pair('Nome', draft.name)}${pair('E-mail', user.email)}${pair('Empresa', draft.company)}</dl></section>${config.questionnaire.sections.map(s => `<section class="review-group"><h3>${esc(s.title)}</h3><dl>${s.questions.filter(q => isQuestionVisible(q, draft.answers)).map(q => pair(q.label, draft.answers[q.id])).join('')}</dl></section>`).join('')}<label class="consent"><input id="consent" name="consent" type="checkbox" ${draft.consent ? 'checked' : ''}><span>${esc(config.questionnaire.consentText || 'Confirmo minha participação voluntária.')} ${privacyButton()}.</span></label>`;
}
function renderSuccess() {
  app.innerHTML = `<section class="success-card"><div class="success-icon" aria-hidden="true">✓</div><span class="eyebrow">PARTICIPAÇÃO CONCLUÍDA</span><h1>Sua perspectiva<br>faz a diferença.</h1><p>Obrigado por compartilhar sua experiência.<br>Suas respostas foram registradas com sucesso.</p><div class="receipt"><span class="eyebrow">COMPROVANTE DE PARTICIPAÇÃO</span><p>${esc(user.email)}<br>${esc(date(user.receipt.createdAt))}</p><code>${esc(user.receipt.id)}</code></div><p class="small">É permitida uma resposta por conta Google.</p><div class="success-actions"><button class="button secondary" data-action="qr">${icons.qr} Compartilhar pesquisa</button>${user.admin ? '<button class="button" data-action="admin-presentation">Ver resultados →</button>' : ''}</div></section>`;
}
function renderQuestionnaireGroups(groups) {
  return `<div class="presentation-items questionnaire-groups">${groups.map(({ label, format, questions: [example, ...other] }) => {
    const preview = example.type === 'textarea'
      ? '<p class="questionnaire-writing" aria-hidden="true"></p>'
      : example.id === 'clareza'
        ? '<div class="questionnaire-scale" aria-hidden="true"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>'
        : `<ul class="questionnaire-options">${example.options.slice(0, 2).map(option => `<li>${esc(option)}</li>`).join('')}</ul>`;
    return `<section class="questionnaire-group">
      <h3>${esc(label)}</h3>
      <p class="questionnaire-format">${esc(format)}</p>
      <p class="questionnaire-prompt">${esc(example.label)}</p>
      ${preview}
      <details><summary>Mais ${other.length} perguntas</summary><ul>${other.map(question => `<li>${esc(question.label)}</li>`).join('')}</ul></details>
    </section>`;
  }).join('')}</div>`;
}

function renderChestMap(nodes, total) {
  return `<div class="chest-map" aria-label="Mapa de contagens">${nodes.map(({ label, detail, items }) => `
    <details class="chest-node" open>
      <summary><strong>${esc(label)}</strong><span>${esc(detail)}</span></summary>
      <dl>${items.map(([name, count, withoutRating = []]) => `<div>
        <dt>${esc(name)}</dt><dd>${count} de ${total}</dd>
        ${withoutRating.map(([category, quantity]) => `<dd class="chest-note">${esc(category)} · ${quantity} de ${total}</dd>`).join('')}
      </div>`).join('')}</dl>
    </details>`).join('')}</div>`;
}

function renderPerceptionMatrix(pairs) {
  const order = [1, 2, 3, 4, 5, 0];
  const peak = Math.max(1, ...pairs.flat());
  const label = score => score || 'Sem nota';
  return `<div class="table-wrap research-matrix-wrap">
    <table class="research-matrix">
      <caption class="research-note">O número em cada célula indica quantos registros têm essa combinação de notas.</caption>
      <thead><tr><th scope="col" rowspan="2">Justiça ↓</th><th scope="colgroup" colspan="6">Satisfação →</th></tr>
      <tr>${order.map(score => `<th scope="col">${label(score)}</th>`).join('')}</tr></thead>
      <tbody>${order.map(justice => `<tr><th scope="row">${label(justice)}</th>${order.map(satisfaction => {
        const count = pairs[justice][satisfaction];
        const size = count ? 40 + 52 * Math.sqrt(count / peak) : 0;
        return `<td class="${justice && satisfaction ? '' : 'matrix-missing'}">
          <span class="matrix-count" style="--bubble-size:${size}%">${count}</span></td>`;
      }).join('')}</tr>`).join('')}</tbody>
    </table>
  </div>`;
}

const fmtPercent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 }).format;
const fmtDecimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format;
const fmtP = value => value < .001 ? '< 0,001' : value.toFixed(3).replace('.', ',');

function renderHypothesisGraph(test) {
  if (!test.n) return '<p class="research-note">Sem respostas válidas para calcular o teste e a margem.</p>';
  const { label, n, count, estimate, lower, upper, nullBars, p, adjusted } = test;
  const max = Math.max(...nullBars.map(bar => bar.probability));
  const baseline = 129;
  const x = k => 24 + 592 * k / n;
  const y = probability => baseline - 110 * probability / max;
  const points = nullBars.map(({ probability }, k) => [x(k), y(probability)]);
  const pointList = coordinates => coordinates.map(([px, py]) => `${px.toFixed(2)},${py.toFixed(2)}`).join(' ');
  const area = coordinates => pointList([[coordinates[0][0], baseline], ...coordinates, [coordinates.at(-1)[0], baseline]]);
  const tail = nullBars.findLastIndex(({ reject }, k) => reject && k < n / 2);
  const tails = tail < 0 ? '' : (() => {
    const cut = (points[tail][1] + points[tail + 1][1]) / 2;
    const left = [...points.slice(0, tail + 1), [x(tail + .5), cut]];
    const right = [[x(n - tail - .5), cut], ...points.slice(n - tail)];
    return `<polygon class="bell-reject" points="${area(left)}"/><polygon class="bell-reject" points="${area(right)}"/>
      <path class="bell-tail-mark" d="M 24 ${baseline} H ${left.at(-1)[0]} M ${right[0][0]} ${baseline} H 616"/>`;
  })();
  const rejection = tail < 0 ? 'Sem região de rejeição para esta base.'
    : tail === 0 ? `Rejeição em 0 ou ${n}.` : `Rejeição até ${tail} ou a partir de ${n - tail}.`;
  return `<figure class="hypothesis-bell">
    <svg class="bell-plot" viewBox="0 0 640 154" role="img" aria-label="Distribuição binomial sob H₀. ${esc(label)}. Contagem observada ${count} de ${n}. ${esc(rejection)}">
      <polygon class="bell-area" points="${area(points)}"/>
      <line class="bell-axis" x1="24" x2="616" y1="${baseline}" y2="${baseline}"/>
      ${tails}
      <polyline class="bell-curve" points="${pointList(points)}"/>
      <line class="bell-reference" x1="${x(n / 2)}" x2="${x(n / 2)}" y1="19" y2="${baseline}"/>
      <line class="bell-observed" x1="${x(count)}" x2="${x(count)}" y1="13" y2="${baseline}"/>
      <circle class="bell-point" cx="${x(count)}" cy="${points[count][1]}" r="4"/>
      <text x="24" y="150">0</text>
      <text x="320" y="150" text-anchor="middle">${fmtDecimal(n / 2)} (H₀ de 50%)</text>
      <text x="616" y="150" text-anchor="end">${n}</text>
    </svg>
    <p class="research-note"><strong class="null-key">Azul · ${count}/${n} observado</strong>${tail >= 0 ? ' · Vermelho · ' : ' · '}${esc(rejection)}</p>
  </figure>
  <dl class="hypothesis-metrics">
    <div><dt>Efeito frente a 50%</dt><dd>${fmtDecimal((estimate-.5)*100)} p.p.</dd></div>
    <div><dt>p ajustado</dt><dd>${esc(fmtP(adjusted))} <small>p bruto ${esc(fmtP(p))}</small></dd></div>
    <div><dt>IC 95%</dt><dd>${fmtPercent(lower)} a ${fmtPercent(upper)}</dd></div>
    <div><dt>Margem de erro</dt><dd>−${fmtDecimal((estimate - lower) * 100)} / +${fmtDecimal((upper - estimate) * 100)} p.p.</dd></div>
  </dl>`;
}

function renderHypotheses(tests, total, note) {
  return `<div class="hypothesis-body"><p class="research-note">Teste binomial exato bilateral · referência de 50% · ajuste de Bonferroni.${note ? " " + esc(note) : ""}</p>
    ${tests.length > 1 ? `<label class="hypothesis-select">Indicador <select>${tests.map(({ label }, index) => `<option value="${index}">${esc(label)}</option>`).join('')}</select></label>` : ''}
    ${tests.map((test, index) => `<div data-hypothesis-graph="${index}" ${index ? 'hidden' : ''}><p class="research-note"><strong>${esc(test.label)}</strong><br>H₀: a proporção ${test.nullDescription || (test.label === 'Uso estruturado ou pontual declarado' ? 'de uso estruturado ou pontual' : 'de notas favoráveis (4 ou 5) neste indicador')} é 50%.<br>H₁: essa proporção é diferente de 50%.</p>${renderHypothesisGraph(test)}</div>`).join('')}
  </div>`;
}

function renderResearchResults(result, rows) {
  const total = rows.length;
  const format = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
  if (result.ratings) {
    const faces = ['M18 36 Q30 20 42 36', 'M19 34 Q30 26 41 34', 'M19 31 H41', 'M19 28 Q30 39 41 28', 'M17 27 Q30 46 43 27'];
    return `<div class="perception-faces">${result.ratings.map(({ label, distribution, missing }) => `<section class="perception-face-row"><h3>${esc(label)}</h3><div class="perception-face-scale">${distribution.map((count, i) => `<div class="perception-face-score" style="--face-color:${['#aa383c','#bd7041','#8a8060','#558874','#22745c'][i]}"><span class="face-rating">Nota ${i + 1}</span><svg viewBox="0 0 60 60" role="img" aria-label="${['Muito triste','Triste','Neutra','Feliz','Muito feliz'][i]}"><circle cx="30" cy="30" r="26"/><circle class="face-eye" cx="21" cy="22" r="2"/><circle class="face-eye" cx="39" cy="22" r="2"/><path d="${faces[i]}"/></svg><strong>${count}</strong><span class="face-count-label">${count === 1 ? 'resposta' : 'respostas'}</span></div>`).join('')}</div><p class="research-note">Sem nota válida: ${missing}</p></section>`).join('')}</div>`;
  }
  const scores = ['1', '2', '3', '4', '5', 'Sem nota'];
  const charts = result.bars ? `<div class="research-counts">${result.bars.map(({ title, values, note }) => `
    <section class="research-plot">
      <h3>${esc(title)}</h3>
      <dl>${values.map(([label, count]) => `
        <div class="research-bar"><dt>${esc(label)}</dt><dd>${count} de ${total}</dd>
        <meter aria-hidden="true" min="0" max="${total || 1}" value="${count}"></meter></div>`).join('')}</dl>
      ${note ? `<p class="research-note">${esc(note)}</p>` : ''}
    </section>`).join('')}</div>` : result.numeric ? `
    <div class="research-numeric">${result.numeric.map(({ key, label, median, q1, q3, n, unit, values }) => `
      <figure class="research-violin">
        <figcaption><strong>${esc(label)}</strong>
          <span>${n ? `Mediana ${format.format(median)} ${esc(unit)} · Q1–Q3 ${format.format(q1)}–${format.format(q3)} · ${n} de ${total} respostas` : 'Sem valores numéricos'}</span>
        </figcaption>
        ${n >= 5 && values[0] !== values.at(-1) ? renderResearchViolin(rows, key) : n ? `<p class="research-note">Valores observados · ${values.map(value => format.format(value)).join(' · ')}</p>` : ''}
      </figure>`).join('')}</div>
    <p class="research-note">Nos violinos, a largura indica densidade estimada, o traço marca Q1–Q3 e o ponto branco marca a mediana.</p>` : result.ratings.map(({label, distribution, n, missing, summary}) => {
    const colors = ['#a34930','#d78e70','#b3b6af','#72a4b5','#236779'];
    const widths = distribution.map(v => n ? 100*v/n : 0);
    let x = 100 - widths[0] - widths[1] - widths[2]/2;
    const rects = widths.map((width,i) => {
      const rect = '<rect x="'+x+'" width="'+width+'" height="9" fill="'+colors[i]+'"/>';
      x += width;
      return rect;
    }).join('');
    return '<figure class="research-plot"><strong>'+esc(label)+'</strong><svg width="100%" height="26" viewBox="0 0 200 9" preserveAspectRatio="none" aria-hidden="true">'+rects+'<path d="M100 0v9" stroke="#333" stroke-width=".4"/></svg><figcaption>'+distribution.map((v,i) => 'Nota '+(i+1)+' · '+v).join(' | ')+' · Sem nota: '+missing+'<br>'+esc(summary)+'</figcaption></figure>';
  }).join('') + (result.pairs ? renderPerceptionMatrix(result.pairs) : '');
  return charts;

}

async function openPresentation(filters = {}, cached = null, mode = 'mixed') {
  app.innerHTML = '<div class="loading">Carregando apresentação…</div>';
  try {
    const sources = cached || await Promise.all([api('/admin/responses'), api('/admin/demonstration')]);
    const [official, demonstration] = sources;
    const population = mode === 'mixed' ? demonstration.responses : official.responses;
    const simulated = population.filter(row => row.simulated).length;
    const segmentFields = { experiencia: 'Experiência', setor: 'Setor', porte: 'Porte', cargo: 'Cargo' };
    const selected = population.filter(row => Object.entries(filters).every(([key,value]) => !value || row.answers[key] === value));
    const slides = presentationSlides(official.responses, config.questionnaire, selected);
    const sample = official.sample;
    const controls = Object.entries(segmentFields).map(([key,label]) => {
      const options = [...new Set(population.map(row => row.answers[key]).filter(Boolean))].sort();
      return '<label>' + label + ' <select data-segment="' + key + '"><option value="">Todos</option>' + options.map(v => '<option' + (filters[key] === v ? ' selected' : '') + '>' + esc(v) + '</option>').join('') + '</select></label>';
    }).join(' ');
    const profile = '<div class="segment-filters">' + controls + '</div><p>No segmento: ' + selected.length + '</p>';
    app.innerHTML = `<section class="presentation" aria-label="Apresentação dos resultados">
      <div class="presentation-top">
        <div class="presentation-brand"></div>
        <div class="presentation-account">
          <button class="text-button" data-action="admin">Gerenciar respostas ↗</button>
        </div>
      </div>
      <div class="presentation-track" tabindex="0" aria-label="Roteiro horizontal. Use as setas para rolar.">
        ${slides.map((slide, index) => `<article class="presentation-slide" id="slide-${index}" aria-labelledby="slide-title-${index}">
          <canvas class="board-outline" aria-hidden="true"></canvas>
          <div class="board-content${slide.layout ? ' board-questions' : ''}${slide.layout === 'methodology' ? ' board-methodology' : ''}${slide.layout === 'response' ? ' board-response' : ''}${slide.result ? ' board-results' : ''}${slide.hypotheses ? ' board-hypothesis' : ''}">
          <div class="presentation-lead">
            ${slide.label ? `<p class="presentation-label">${esc(slide.label)}</p>` : ''}
            <h2 id="slide-title-${index}">${esc(slide.title)}</h2>
            ${slide.intro ? `<p class="presentation-intro">${esc(slide.intro)}</p>` : ''}
          </div>
          ${slide.hypotheses ? '' : '<canvas class="board-sketch" width="660" height="250" aria-hidden="true"></canvas>'}
          <div class="presentation-content">${slide.hypotheses ? renderHypotheses(slide.hypotheses, selected.length, slide.testNote) : slide.result ? renderResearchResults(slide.result, selected) : slide.nodes ? profile + renderChestMap(slide.nodes, selected.length) : slide.groups ? renderQuestionnaireGroups(slide.groups) : slide.members ? `
            <h3>Integrantes</h3>
            <ul class="presentation-members">${slide.members.map(name => `<li>${esc(name)}</li>`).join('')}</ul>` : `
            <dl class="presentation-items">${slide.items.map(([label, value, fraction, sampleProgress]) =>
              `<div><dt>${esc(label)}</dt><dd>${sampleProgress ? `<strong class="sample-progress" aria-label="${sampleProgress.analyzed} registros analisados para uma meta de ${sampleProgress.target} respostas">${sampleProgress.analyzed} / ${sampleProgress.target} <span aria-hidden="true">☹︎</span></strong>` : ''}${esc(value)}${fraction == null ? '' : `<meter aria-hidden="true" min="0" max="1" value="${fraction}"></meter>`}</dd></div>`).join('')}</dl>`}</div>
          </div>
        </article>`).join('')}
      </div>
    </section>`;
    app.querySelector('.presentation-brand').append(document.querySelector('.header .brand').cloneNode(true));
    app.querySelector('.presentation-account').prepend(...Array.from(account.children, item => item.cloneNode(true)));
    const presentation = app.querySelector('.presentation');
    const track = presentation.querySelector('.presentation-track');
    track.querySelectorAll('.hypothesis-select select').forEach(select => {
      select.addEventListener('change', () => {
        select.closest('.hypothesis-body').querySelectorAll('[data-hypothesis-graph]').forEach(graph => {
          graph.hidden = graph.dataset.hypothesisGraph !== select.value;
        });
      });
    });
    for (const control of track.querySelectorAll('[data-segment]')) {
      control.onchange = () => openPresentation({ ...filters, [control.dataset.segment]: control.value }, sources, mode);
    }
    drawWhiteboardSketches(track);
    fitWhiteboardText(track);
    drawWhiteboardConnections(track);
    presentation.addEventListener('wheel', event => {
      if (!event.cancelable || event.altKey || event.ctrlKey || event.metaKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;

      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? track.clientWidth : 1;
      const max = track.scrollWidth - track.clientWidth;
      const next = Math.min(max, Math.max(0, track.scrollLeft + event.deltaY * unit));
      if (Math.abs(next - track.scrollLeft) < 1) return;

      event.preventDefault();
      track.scrollLeft = next;
    }, { passive: false });
    if (cached) {
      track.querySelector('[data-segment]').closest('article').scrollIntoView({inline:'start', block:'nearest'});
      track.querySelector('[data-segment]').focus({preventScroll:true});
    } else focusHeading();
  } catch (error) { showError(error); }
}
async function renderAdmin() {
  app.innerHTML = '<div class="loading">Carregando resultados…</div>';
  try {
    const { responses } = await api('/admin/demonstration');
    adminRows = responses;
    const companies = new Set(adminRows.map(row => row.company.toLocaleLowerCase().trim())).size;
    app.innerHTML = `<section class="admin">
      <div class="stats">
        <div class="stat"><strong>${adminRows.length}</strong><span>Registros exibidos</span></div>
        <div class="stat"><strong>${companies}</strong><span>Empresas exibidas</span></div>
      </div>
      <div class="toolbar">
        <label><span class="hint">Buscar participante ou empresa</span><input id="search" type="text" placeholder="Digite o número ou a empresa"></label>
        <button class="button secondary" data-action="admin">Atualizar ↻</button>
        <a class="button" href="${esc(basePath)}/api/admin/export?dataset=demonstration">Exportar CSV ↓</a>
      </div>
      <div id="results"></div>
      <div class="admin-links"><button class="text-button" data-action="survey">Voltar à pesquisa</button><span class="small">Acesso restrito</span></div>
    </section>`;
    const charts = document.createElement('div');
    charts.id = 'charts';
    charts.innerHTML = '<p class="small">Setor é a atividade principal da empresa. “Registros em papel” é uma opção do campo de ferramentas de avaliação.</p>' + renderCharts(adminRows, { demonstration: true });
    document.querySelector('.stats').after(charts); bindChartControls(charts, adminRows);
    renderRows('');
    document.querySelector('#search').addEventListener('input', event => renderRows(event.target.value));
  } catch (error) { app.innerHTML = '<div class="loading">Não foi possível carregar os resultados.</div>'; showError(error); }
}
function participantLabel(row) {
  return 'Participante ' + (adminRows.indexOf(row) + 1);
}
function renderRows(query) {
  const rows = adminRows.filter(row => `${participantLabel(row)} ${row.company}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  document.querySelector('#results').innerHTML = rows.length ? `<div class="table-wrap"><table><thead><tr><th>Participante</th><th>Empresa</th><th>Setor da empresa</th><th>Data</th><th><span class="small">Detalhes</span></th></tr></thead><tbody>${rows.map(row => `<tr><td>${esc(participantLabel(row))}</td><td>${esc(row.company)}</td><td>${esc(row.answers.setor || 'Não informado')}</td><td>${esc(date(row.created_at, row.simulated))}</td><td><button class="text-button" data-detail="${esc(row.id)}">Ver resposta ↗</button></td></tr>`).join('')}</tbody></table></div>` : `<div class="table-wrap empty">${query ? 'Nenhum resultado para esta busca.' : 'Ainda não há participações. Compartilhe o QR code para começar.'}</div>`;
}
function showDetail(id) {
  const row = adminRows.find(r => r.id === id); if (!row) return;
  document.querySelector('#detail-dialog')?.remove();
  const dialog = document.createElement('dialog'); dialog.id = 'detail-dialog'; dialog.setAttribute('aria-labelledby', 'detail-title');
  const labels = Object.fromEntries(config.questionnaire.sections.flatMap(s => s.questions.map(q => [q.id, q.label])));
  dialog.innerHTML = `<button class="close icon-button" aria-label="Fechar resposta">×</button><span class="eyebrow">${row.simulated ? 'RESPOSTA SIMULADA' : 'RESPOSTA'} · VERSÃO ${esc(row.version)}</span><h2 id="detail-title">${esc(participantLabel(row))}</h2><p>${esc(row.company)}${row.simulated ? ' (referência)' : ''} · ${esc(date(row.created_at, row.simulated))}</p><div class="detail-list review-group"><dl>${Object.entries(row.answers).map(([id, value]) => `<dt>${esc(labels[id] || id)}</dt><dd>${esc(Array.isArray(value) ? value.join(', ') : value || 'Não informado')}</dd>`).join('')}</dl></div><p class="small">${row.simulated ? '' : `Participação confirmada em ${esc(date(row.consent_at))}.<br>`}Protocolo: ${esc(row.id)}</p>`;
  document.body.append(dialog); dialog.showModal(); dialog.querySelector('.close').onclick = () => dialog.close();
}

document.addEventListener('click', async event => {
  if (event.target.closest('.close')) event.target.closest('dialog').close();
  const detail = event.target.closest('[data-detail]'); if (detail) showDetail(detail.dataset.detail);
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'qr') document.querySelector('#qr-dialog').showModal();
  if (action === 'privacy') document.querySelector('#privacy-dialog').showModal();
  if (action === 'back' && !busy) { collectDraft(); step = Math.max(0, step - 1); renderSurvey(); focusHeading(); }
  if (action === 'admin-presentation') await openPresentation();
  if (action === 'admin') {
    await renderAdmin();
    focusHeading();
  }
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
