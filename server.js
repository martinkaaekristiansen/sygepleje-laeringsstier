import { startStaticServer } from './scripts/static-server.js';
const port = Number(process.env.PORT) || 3000;
await startStaticServer({ root: 'public', port, host: '0.0.0.0' });
console.log('Læringsstier kører på port ' + port);
