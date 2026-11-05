const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function networkData(rows, minimum = 1) {
  const edges = new Map(), counts = new Map();
  for (const row of rows) {
    const sector = row.answers.setor, tools = row.answers.ferramentas;
    if (!sector || !Array.isArray(tools)) continue;
    const source = `s:${sector}`;
    const valid = [...new Set(tools)].filter(tool => tool !== 'Nenhuma');
    if (!valid.length) continue;
    counts.set(source, (counts.get(source) || 0) + 1);
    for (const tool of valid) {
      const target = `t:${tool}`, key = JSON.stringify([source, target]);
      counts.set(target, (counts.get(target) || 0) + 1);
      const edge = edges.get(key) || { source, target, count: 0 }; edge.count++; edges.set(key, edge);
    }
  }
  const links = [...edges.values()].filter(edge => edge.count >= minimum);
  const ids = [...new Set(links.flatMap(edge => [edge.source, edge.target]))];
  return { nodes: ids.map(id => ({ id, label: id.slice(2), kind: id[0] === 's' ? 'sector' : 'tool', count: counts.get(id) })), links };
}
export function renderNetwork() {
  return `<section class="chart-card network-card"><div class="chart-title"><div><span class="eyebrow">RELAÇÕES ENTRE RESPOSTAS</span><h2>Como os setores se conectam às ferramentas</h2></div><span class="network-badge">INTERATIVO</span></div><p class="chart-subtitle">Cada conexão representa participantes de um setor que usam uma ferramenta. Linhas mais espessas indicam mais respostas; os nós crescem com a participação.</p><div class="network-controls"><label>Conexão mínima: <strong id="network-threshold-label">1 resposta</strong><input id="network-threshold" type="range" min="1" max="10" value="1" aria-label="Mínimo de respostas por conexão"></label><div class="network-buttons"><button class="button secondary" data-zoom="in" aria-label="Aproximar grafo">+</button><button class="button secondary" data-zoom="out" aria-label="Afastar grafo">−</button><button class="button secondary" data-zoom="reset">Restaurar</button></div></div><div class="network-legend"><span><i class="sector-key"></i> Setor</span><span><i class="tool-key"></i> Ferramenta</span><span>Arraste os nós · clique para destacar · use as setas no teclado</span></div><span class="network-mobile-hint">Deslize a área do grafo para ver os dois lados da rede.</span><div id="network-canvas" tabindex="0" aria-label="Área do grafo com rolagem horizontal"></div><p id="network-status" role="status" class="network-status">Selecione um nó para explorar suas conexões.</p><details class="chart-data"><summary>Ver conexões em tabela</summary><div id="network-table"></div></details><p class="chart-method">Uma pessoa pode usar várias ferramentas; por isso, as conexões não somam o total de participantes. “Nenhuma” é excluída. Relações indicam uso declarado, sem inferir causalidade ou desempenho.</p></section>`;
}
export function bindNetwork(container, rows) {
  const slider = container.querySelector('#network-threshold');
  const canvas = container.querySelector('#network-canvas');
  const status = container.querySelector('#network-status');
  let zoom = 1, selected = null;
  const positions = new Map();
  const max = Math.max(1, ...networkData(rows).links.map(l => l.count));
  slider.max = String(max);
  function draw() {
    const minimum = Number(slider.value), data = networkData(rows, minimum);
    container.querySelector('#network-threshold-label').textContent = `${minimum} resposta${minimum === 1 ? '' : 's'}`;
    container.querySelector('#network-table').innerHTML = data.links.length ? `<div class="table-wrap"><table><thead><tr><th>Setor</th><th>Ferramenta</th><th>Respostas</th></tr></thead><tbody>${data.links.map(l => `<tr><td>${esc(l.source.slice(2))}</td><td>${esc(l.target.slice(2))}</td><td>${l.count}</td></tr>`).join('')}</tbody></table></div>` : '<p>Nenhuma conexão para exibir.</p>';
    if (!data.nodes.length) { canvas.innerHTML = '<div class="chart-empty"><span aria-hidden="true">⤴</span><p>Nenhuma conexão disponível para este filtro.</p><small>A rede se forma com respostas sobre setor e ferramentas.</small></div>'; status.textContent = 'Aguardando conexões.'; return; }
    const width = 960, height = 430;
    const sectors = data.nodes.filter(n => n.kind === 'sector'), tools = data.nodes.filter(n => n.kind === 'tool');
    for (const list of [sectors, tools]) list.forEach((node, index) => {
      if (!positions.has(node.id)) positions.set(node.id, { x: node.kind === 'sector' ? 240 + Math.sin(index * 1.7) * 65 : 705 + Math.sin(index * 1.5) * 65, y: (index + 1) * height / (list.length + 1) });
    });
    canvas.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="group" aria-label="Grafo interativo de setores e ferramentas"><g class="network-viewport"><g class="network-edges">${data.links.map((link, index) => `<line data-edge="${index}" stroke="#92ae82" stroke-width="${1 + 7 * link.count / max}" opacity=".45"><title>${esc(link.source.slice(2))} ↔ ${esc(link.target.slice(2))}: ${link.count} respostas</title></line>`).join('')}</g><g class="network-nodes">${data.nodes.map((node, index) => {
      const radius = 12 + Math.sqrt(node.count / Math.max(...data.nodes.map(n => n.count))) * 14;
      return `<g data-node="${index}" class="network-node" tabindex="0" role="button" aria-label="${esc(node.label)}, ${node.count} participantes. Enter para destacar; setas para mover." aria-pressed="false"><title>${esc(node.label)} · ${node.count} participantes</title>${node.kind === 'sector' ? `<circle r="${radius}" fill="#285b4e" stroke="#fafff4" stroke-width="3"/>` : `<rect x="${-radius}" y="${-radius}" width="${2 * radius}" height="${2 * radius}" rx="9" fill="#d6e8b5" stroke="#64834f" stroke-width="1.5"/>`}<text y="${radius + 18}" text-anchor="middle" font-size="12" fill="#23483c">${esc(node.label)}</text><text y="4" text-anchor="middle" font-size="10" fill="${node.kind === 'sector' ? '#fff' : '#365230'}">${node.count}</text></g>`;
    }).join('')}</g></g></svg>`;
    const svg = canvas.querySelector('svg'), viewport = svg.querySelector('.network-viewport');
    const nodeElements = [...svg.querySelectorAll('[data-node]')], lines = [...svg.querySelectorAll('[data-edge]')];
    function update() {
      viewport.setAttribute('transform', `translate(${width / 2} ${height / 2}) scale(${zoom}) translate(${-width / 2} ${-height / 2})`);
      data.nodes.forEach((node, index) => {
        const p = positions.get(node.id); nodeElements[index].setAttribute('transform', `translate(${p.x} ${p.y})`);
        const related = !selected || node.id === selected || data.links.some(l => (l.source === selected && l.target === node.id) || (l.target === selected && l.source === node.id));
        nodeElements[index].style.opacity = related ? '1' : '.2';
        nodeElements[index].setAttribute('aria-pressed', String(node.id === selected));
      });
      data.links.forEach((link, index) => {
        const a = positions.get(link.source), b = positions.get(link.target), line = lines[index];
        line.setAttribute('x1', a.x); line.setAttribute('y1', a.y); line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
        line.style.opacity = selected && link.source !== selected && link.target !== selected ? '.06' : '.5';
      });
    }
    function highlight(node) {
      selected = selected === node.id ? null : node.id;
      const related = data.links.filter(l => l.source === node.id || l.target === node.id);
      status.textContent = selected ? `${node.label}: ${node.count} participantes · ${related.length} conexões neste filtro. Clique novamente para limpar.` : 'Selecione um nó para explorar suas conexões.';
      update();
    }
    nodeElements.forEach((element, index) => {
      const node = data.nodes[index]; let drag = null, moved = false;
      element.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        drag = { x: event.clientX, y: event.clientY }; moved = false;
        element.setPointerCapture(event.pointerId); event.preventDefault(); element.focus({ preventScroll: true });
      });
      element.addEventListener('pointermove', event => {
        if (!drag) return;
        const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
        const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(viewport.getScreenCTM().inverse());
        positions.set(node.id, { x: Math.max(95, Math.min(width - 100, point.x)), y: Math.max(35, Math.min(height - 55, point.y)) }); update();
      });
      element.addEventListener('pointerup', () => { if (drag && !moved) highlight(node); drag = null; });
      element.addEventListener('pointercancel', () => { drag = null; });
      element.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); highlight(node); }
        if (event.key.startsWith('Arrow')) {
          event.preventDefault(); const p = positions.get(node.id);
          if (event.key === 'ArrowLeft') p.x -= 10; if (event.key === 'ArrowRight') p.x += 10;
          if (event.key === 'ArrowUp') p.y -= 10; if (event.key === 'ArrowDown') p.y += 10;
          p.x = Math.max(95, Math.min(width - 100, p.x)); p.y = Math.max(35, Math.min(height - 55, p.y)); update();
        }
      });
    });
    container.querySelectorAll('[data-zoom]').forEach(button => { button.onclick = () => {
      if (button.dataset.zoom === 'reset') { zoom = 1; selected = null; positions.clear(); status.textContent = 'Selecione um nó para explorar suas conexões.'; draw(); return; }
      zoom = Math.max(.65, Math.min(1.8, zoom * (button.dataset.zoom === 'in' ? 1.15 : 1 / 1.15))); update();
    }; });
    update(); status.textContent = `${data.nodes.length} nós · ${data.links.length} conexões. Selecione um nó para explorar.`;
  }
  slider.addEventListener('input', () => { selected = null; draw(); });
  draw();
}
