import { createApp } from './app.js';

const { app, store, config } = createApp();
const port = Number(process.env.PORT || 3015);
const server = app.listen(port, '127.0.0.1', () => {
  console.log(`Medição na prática: http://localhost:${port}`);
  console.log(`Endereço público: ${config.publicUrl}`);
  if (!config.googleClientId) console.log('Configure GOOGLE_CLIENT_ID para habilitar o login real.');
});
function stop() { server.close(() => { store.close(); process.exit(0); }); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
