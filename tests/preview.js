// Isolated visual QA only: in-memory records and fake identity, never production.
import express from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { createApp } from '../server/app.js';
import { createStore } from '../server/store.js';

const store = createStore(':memory:');
const token = randomBytes(32).toString('hex');
const hash = value => createHash('sha256').update(value).digest('hex');
store.db.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?, ?, ?)').run(hash(token), 'fixture-participant', 'equipe@example.com', 'Participante de teste', 'fixture-csrf', Date.now() + 3600000);
for (let i = 0; i < 18; i++) {
  const answers = {
    setor: ['Tecnologia', 'Serviços', 'Indústria', 'Comércio'][i % 4], porte: '10 a 49', cargo: 'Analista', experiencia: '1 a 3 anos',
    uso: ['Sim, de forma estruturada', 'Sim, de forma pontual', 'Está começando a utilizar', 'Não utiliza', 'Sim, de forma estruturada'][i % 5],
    frequencia: 'Semanalmente', ferramentas: i % 3 ? ['Planilhas', 'Ferramentas de BI'] : ['Sistema de gestão (ERP)', 'Sistema próprio'],
    clareza: '4', quantidade_indicadores: [3, 7, 5, 11, 18, 9, 5, 4, 15][i % 9], tempo_semanal: [30, 45, 60, 120, 90, 180, 240, 75, 40][i % 9], desafios: 'Exemplo fictício para verificar a interface.', comentarios: ''
  };
  store.db.prepare('INSERT INTO responses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(`fixture-${i}`, `teste-${i}`, `pessoa${i}@example.com`, `Pessoa fictícia ${i + 1}`, `Empresa fictícia ${i % 6 + 1}`, '1', JSON.stringify(answers), '2026-11-05T12:00:00Z', `2026-11-05T12:${String(i).padStart(2, '0')}:00Z`);
}
const { app } = createApp({ store, env: { PUBLIC_URL: 'http://localhost:3016', ADMIN_EMAILS: 'equipe@example.com' } });
const wrapper = express();
wrapper.get('/__fixture__/login', (req, res) => {
  res.cookie(`medicao_${hash('').slice(0, 8)}`, token, { httpOnly: true, sameSite: 'lax' }).redirect('/');
});
wrapper.use((req, res, next) => {
  if (req.path === '/api/config') {
    const send = res.json.bind(res); res.json = value => send({ ...value, preview: true });
  }
  next();
});
wrapper.use(app);
wrapper.listen(3016, '127.0.0.1', () => console.log('QA com dados fictícios: http://localhost:3016/__fixture__/login'));
