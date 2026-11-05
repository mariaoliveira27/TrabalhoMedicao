import { renderNetwork, bindNetwork } from './network.js';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(n);
const densityFmt = n => new Intl.NumberFormat('pt-BR', { maximumSignificantDigits: 3 }).format(n);
const metrics = {
  tempo_semanal: { label: 'Tempo de acompanhamento', unit: 'min/semana' },
  quantidade_indicadores: { label: 'Quantidade de indicadores', unit: 'indicadores' }
};
export function quantile(sorted, fraction) {
  if (!sorted.length) return null;
  const index = (sorted.length - 1) * fraction, lower = Math.floor(index);
  return sorted[lower] + (sorted[Math.ceil(index)] - sorted[lower]) * (index - lower);
}
export function numericValues(rows, key) {
  return rows.map(row => row.answers[key]).filter(v => typeof v === 'number' && Number.isFinite(v) && v >= 0).sort((a, b) => a - b);
}
export function estimateDensity(values) {
  if (values.length < 5 || new Set(values).size < 2) return null;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const deviation = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1));
  const iqr = quantile(values, .75) - quantile(values, .25);
  const scale = iqr > 0 ? Math.min(deviation, iqr / 1.34) : deviation;
  const bandwidth = .9 * scale * values.length ** (-.2);
  if (!bandwidth) return null;
  const max = values.at(-1) + 3 * bandwidth;
  const points = Array.from({ length: 181 }, (_, i) => {
    const x = max * i / 180;
    // Reflect at zero so smoothing respects the nonnegative measurement scale.
    const density = values.reduce((sum, v) => sum + Math.exp(-.5 * ((x - v) / bandwidth) ** 2) + Math.exp(-.5 * ((x + v) / bandwidth) ** 2), 0) / (values.length * bandwidth * Math.sqrt(2 * Math.PI));
    return { x, y: density };
  });
  return { points, bandwidth, max, peak: Math.max(...points.map(p => p.y)) };
}
const svg = (label, body, width = 480, height = 260) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(label)}" font-family="Segoe UI, Arial, sans-serif">${body}</svg>`;
const text = (x, y, value, extra = '') => `<text x="${x}" y="${y}" fill="#687671" font-size="10" ${extra}>${escape(value)}</text>`;
const empty = message => `<div class="chart-empty"><span aria-hidden="true">↗</span><p>${escape(message)}</p><small>Os gráficos usam apenas respostas recebidas.</small></div>`;
const exportButton = '<button class="text-button chart-export" type="button">Baixar SVG ↓</button>';

function thermometer(rows) {
  const known = rows.filter(r => ['Sim, de forma estruturada', 'Sim, de forma pontual', 'Está começando a utilizar', 'Não utiliza'].includes(r.answers.uso));
  const yes = known.filter(r => r.answers.uso.startsWith('Sim,')).length;
  const pct = known.length ? yes / known.length * 100 : 0;
  if (!known.length) return empty('O medidor aparecerá após as primeiras respostas válidas.');
  const height = 124 * pct / 100;
  return svg(`Adoção de indicadores: ${fmt(pct)}%. ${yes} de ${known.length} respostas válidas.`, `<rect x="76" y="25" width="32" height="146" rx="16" fill="#edf2e6" stroke="#cdd9c1"/><rect x="83" y="${160 - height}" width="18" height="${height + 20}" rx="9" fill="#65915c"/><circle cx="92" cy="179" r="26" fill="#dcecc5" stroke="#cdd9c1"/><circle cx="92" cy="179" r="17" fill="#65915c"/>${[0, 25, 50, 75, 100].map(v => `<path d="M116 ${160 - v * 1.24}h8" stroke="#a2b394"/>${text(132, 164 - v * 1.24, `${v}%`)}`).join('')}<text x="213" y="112" font-size="53" fill="#163c37" letter-spacing="-2">${fmt(pct)}%</text>${text(216, 139, `${yes} de ${known.length} participantes`)}${text(216, 159, 'declaram utilizar indicadores')}${text(76, 237, 'Base: respostas sobre uso, excluindo “Não sei informar”.')}`);
}
function heatmap(rows) {
  if (!rows.length) return empty('O mapa de calor será formado conforme as empresas participarem.');
  const categories = ['Sim, de forma estruturada', 'Sim, de forma pontual', 'Está começando a utilizar', 'Não utiliza', 'Não sei informar'];
  const sectors = [...new Set(rows.map(r => r.answers.setor).filter(Boolean))].sort();
  if (!sectors.length) return empty('Ainda não há respostas com setor informado.');
  const counts = sectors.map(sector => categories.map(use => rows.filter(r => r.answers.setor === sector && r.answers.uso === use).length));
  const peak = Math.max(1, ...counts.flat());
  const height = 82 + sectors.length * 29;
  const labels = ['Estruturado', 'Pontual', 'Iniciando', 'Não usa', 'Não sabe'];
  const body = labels.map((label, i) => text(156 + i * 62, 20, label, 'text-anchor="middle" font-size="9"')).join('') + sectors.map((sector, j) => text(117, 48 + j * 29, sector, 'text-anchor="end"') + counts[j].map((count, i) => {
    const alpha = count ? .13 + .82 * count / peak : .04;
    return `<g><title>${escape(sector)} · ${escape(categories[i])}: ${count}</title><rect x="${128 + i * 62}" y="${30 + j * 29}" width="56" height="24" rx="4" fill="rgba(36,87,76,${alpha})"/><text x="${156 + i * 62}" y="${46 + j * 29}" font-size="10" text-anchor="middle" fill="${count / peak > .55 ? '#fff' : '#24574c'}">${count}</text></g>`;
  }).join('')).join('') + text(128, height - 8, 'Mais claro: menos respostas · Mais escuro: mais respostas');
  return svg('Mapa de calor: quantidade de respostas por setor e uso de indicadores.', body, 480, height) + `<details class="chart-data"><summary>Ver tabela de contagens</summary><div class="table-wrap"><table><thead><tr><th>Setor</th>${labels.map(v => `<th>${v}</th>`).join('')}</tr></thead><tbody>${sectors.map((sector, i) => `<tr><td>${escape(sector)}</td>${counts[i].map(v => `<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
}
function distribution(rows, key, kind) {
  const values = numericValues(rows, key), metric = metrics[key], n = values.length;
  const model = estimateDensity(values);
  if (!model) return empty(n < 5 ? `${n} de 5 valores numéricos necessários para exibir esta distribuição.` : 'Os valores recebidos são iguais. Ainda não é possível estimar uma distribuição.');
  const { points, max, peak, bandwidth } = model;
  const q1 = quantile(values, .25), median = quantile(values, .5), q3 = quantile(values, .75);
  let body;
  if (kind === 'density') {
    const x = value => 47 + value / max * 409, y = value => 199 - value / peak * 143;
    const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.x).toFixed(2)},${y(p.y).toFixed(2)}`).join(' ');
    body = [0, .5, 1].map(v => `<path d="M47 ${y(peak * v)}H456" stroke="#e0e7d8"/>${text(40, y(peak * v) + 3, densityFmt(peak * v), 'text-anchor="end"')}`).join('');
    body += `<path d="${line} L456,199 L47,199 Z" fill="#d9e9c5"/><path d="${line}" fill="none" stroke="#376b56" stroke-width="2"/><path d="M${x(median)} 50V201" stroke="#547e46" stroke-dasharray="4 4"/>`;
    body += values.map(v => `<path d="M${x(v)} 204v6" stroke="#7f9d67" opacity=".65"><title>${fmt(v)} ${metric.unit}</title></path>`).join('');
    body += Array.from({ length: 5 }, (_, i) => text(x(max * i / 4), 227, fmt(max * i / 4), 'text-anchor="middle"')).join('');
    body += text(47, 23, 'Densidade estimada') + text(456, 249, metric.unit, 'text-anchor="end"');
  } else {
    const y = value => 210 - value / max * 175;
    const left = points.map((p, i) => `${i ? 'L' : 'M'}${(250 - p.y / peak * 105).toFixed(2)},${y(p.x).toFixed(2)}`).join(' ');
    const right = points.toReversed().map(p => `L${(250 + p.y / peak * 105).toFixed(2)},${y(p.x).toFixed(2)}`).join(' ');
    body = Array.from({ length: 5 }, (_, i) => `<path d="M62 ${y(max * i / 4)}H424" stroke="#e4eadb"/>${text(54, y(max * i / 4) + 3, fmt(max * i / 4), 'text-anchor="end"')}`).join('');
    body += `<path d="${left} ${right} Z" fill="#d5e5b8" stroke="#6b8f56" stroke-width="1.5"/><path d="M250 ${y(values[0])}V${y(values.at(-1))}" stroke="#42653e"/><path d="M250 ${y(q1)}V${y(q3)}" stroke="#42653e" stroke-width="8"/><circle cx="250" cy="${y(median)}" r="4" fill="white" stroke="#42653e"/>`;
    body += values.map((v, i) => `<circle cx="${378 + i % 7 * 4}" cy="${y(v)}" r="2" fill="#648b53" opacity=".55"><title>${fmt(v)} ${metric.unit}</title></circle>`).join('');
    body += text(250, 239, metric.unit, 'text-anchor="middle"') + text(390, 258, 'Valores observados', 'text-anchor="middle"');
  }
  return svg(`${kind === 'density' ? 'Densidade' : 'Violino'} de ${metric.label}. ${n} valores; mediana ${fmt(median)} ${metric.unit}.`, body) + `<div class="distribution-summary"><span>n = <strong>${n}</strong></span><span>Mediana <strong>${fmt(median)}</strong></span><span>Q1–Q3 <strong>${fmt(q1)}–${fmt(q3)}</strong></span></div><p class="chart-method">KDE gaussiana, largura ${fmt(bandwidth)}; correção no limite zero. ${kind === 'violin' ? 'Largura = densidade; traço = intervalo interquartil; ponto branco = mediana.' : 'Os traços inferiores são observações; a linha pontilhada indica a mediana.'} A curva é uma estimativa suavizada, não novos dados.</p><details class="chart-data"><summary>Ver valores (${n})</summary><p>${values.map(fmt).join(' · ')} ${escape(metric.unit)}</p></details>`;
}
function distributionCard(rows, kind, key) {
  return `<section class="chart-card" data-chart="${kind}"><div class="chart-title"><div><span class="eyebrow">${kind === 'violin' ? 'FORMA E DISPERSÃO' : 'CONCENTRAÇÃO DOS VALORES'}</span><h2>${kind === 'violin' ? 'Gráfico de violino' : 'Curva de densidade'}</h2></div>${exportButton}</div><label class="metric-select"><span class="small">Variável numérica</span><select data-kind="${kind}" aria-label="Variável do gráfico de ${kind === 'violin' ? 'violino' : 'densidade'}">${Object.entries(metrics).map(([id, m]) => `<option value="${id}" ${id === key ? 'selected' : ''}>${m.label} (${m.unit})</option>`).join('')}</select></label><div class="distribution-content">${distribution(rows, key, kind)}</div></section>`;
}
export function renderCharts(rows) {
  return `<div class="analytics-heading"><h2>Um olhar sobre as respostas</h2><span class="small">Amostra de conveniência · resultados descritivos</span></div><div class="charts-grid"><section class="chart-card" data-chart="adocao"><div class="chart-title"><div><span class="eyebrow">TERMÔMETRO DA PESQUISA</span><h2>Adoção de indicadores</h2></div>${exportButton}</div><p class="chart-subtitle">Uso estruturado ou pontual, entre quem soube informar.</p>${thermometer(rows)}</section><section class="chart-card" data-chart="calor"><div class="chart-title"><div><span class="eyebrow">SETOR × ADOÇÃO</span><h2>Mapa de calor</h2></div>${exportButton}</div><p class="chart-subtitle">Contagens absolutas. Cores representam volume, não desempenho.</p>${heatmap(rows)}</section>${distributionCard(rows, 'violin', 'quantidade_indicadores')}${distributionCard(rows, 'density', 'tempo_semanal')}</div><p class="analytics-note">Perguntas numéricas são opcionais; cada gráfico pode ter uma base diferente. Violino e densidade exigem pelo menos 5 valores e alguma variação. Não representam toda a população de empresas e não indicam causalidade.</p>`;
}
export function bindChartControls(container, rows) {
  const network = document.createElement('div'); network.innerHTML = renderNetwork(); container.append(network); bindNetwork(network, rows);
  container.querySelectorAll('select[data-kind]').forEach(select => select.addEventListener('change', () => {
    select.closest('.chart-card').querySelector('.distribution-content').innerHTML = distribution(rows, select.value, select.dataset.kind);
  }));
  container.querySelectorAll('.chart-export').forEach(button => button.addEventListener('click', () => {
    const card = button.closest('.chart-card'), chart = card.querySelector('svg');
    if (!chart) { button.textContent = 'Aguardando dados'; setTimeout(() => { button.textContent = 'Baixar SVG ↓'; }, 2000); return; }
    const clone = chart.cloneNode(true);
    const metric = card.querySelector('select');
    const title = card.querySelector('h2').textContent;
    const original = chart.viewBox.baseVal;
    clone.setAttribute('viewBox', `0 -65 ${original.width} ${original.height + 95}`);
    const caption = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    caption.setAttribute('x', '15'); caption.setAttribute('y', '-37'); caption.setAttribute('font-size', '14'); caption.setAttribute('fill', '#163c37'); caption.textContent = title;
    clone.prepend(caption);
    const note = document.createElementNS('http://www.w3.org/2000/svg', 'text'); note.setAttribute('x', '15'); note.setAttribute('y', '-15'); note.setAttribute('font-size', '9'); note.setAttribute('fill', '#687671');
    note.textContent = metric ? `${metric.selectedOptions[0].textContent} · n = ${numericValues(rows, metric.value).length} · KDE suavizada` : 'Medição na prática · amostra de conveniência'; clone.append(note);
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
    const link = document.createElement('a'); link.href = url; link.download = `medicao-${card.dataset.chart}.svg`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }));
}
