// Offline registration helper. Run --apply only after stopping A.R.S.E.N.A.L.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const configPath = path.join('C:/Users/Leandro Alencar/AppData/Roaming/arsenal', 'arsenal.json');
const sourcePath = 'C:/Users/Leandro Alencar/Projetos/A.R.S.E.N.A.L/electron';
const { validateApp } = require(path.join(sourcePath, 'validation.cjs'));
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const existing = config.apps.find(app => path.resolve(app.cwd) === root || app.slug === 'medicao');
if (existing && path.resolve(existing.cwd) !== root) throw new Error('A rota já pertence a outro projeto.');
const app = validateApp({
  id: existing?.id || crypto.randomUUID(),
  name: 'Medição na prática',
  description: 'Pesquisa acadêmica sobre medição e indicadores, com login Google e painel de resultados.',
  slug: 'medicao', cwd: root, command: 'npm start', port: 3015,
  pathMode: 'strip', autoStart: true, visibleInHub: true,
  gitAutomationEnabled: true,
  env: { PUBLIC_URL: 'https://arsenal.dev.br/medicao', NODE_ENV: 'production' }
}, config.apps);
if (config.settings.proxyPort === app.port) throw new Error('Porta reservada ao gateway.');
if (process.argv.includes('--apply')) {
  const processes = execFileSync('tasklist.exe', ['/FI', 'IMAGENAME eq A.R.S.E.N.A.L.exe', '/FO', 'CSV', '/NH'], { encoding: 'utf8', windowsHide: true });
  if (processes.toLowerCase().includes('"a.r.s.e.n.a.l.exe"')) throw new Error('Encerre o A.R.S.E.N.A.L antes de aplicar para evitar sobrescrita da configuração em uso.');
  const backup = `${configPath}.before-medicao-${Date.now()}.bak`;
  fs.copyFileSync(configPath, backup);
  const index = config.apps.findIndex(item => item.id === app.id);
  if (index >= 0) config.apps[index] = app; else config.apps.push(app);
  const temporary = `${configPath}.medicao.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(config, null, 2), 'utf8');
  fs.renameSync(temporary, configPath);
  console.log(JSON.stringify({ applied: true, backup, url: app.env.PUBLIC_URL, autoStart: app.autoStart }));
} else {
  console.log(JSON.stringify({ dryRun: true, name: app.name, route: app.slug, port: app.port, autoStart: app.autoStart, existingAppsPreserved: config.apps.length, url: app.env.PUBLIC_URL }));
}
