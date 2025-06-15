import dotenv from 'dotenv';
import { startWorker } from './lib/worker';
import next from 'next';
import http from 'http'; // Import http for type annotations

dotenv.config({ path: '.env.local' });

const app = next({ dev: false });
const handle = app.getRequestHandler();

startWorker();

app.prepare().then(() => {
  const server = http.createServer((req: http.IncomingMessage, res: http.ServerResponse) => {
    handle(req, res);
  });
  server.listen(3000, () => {
    console.log('Next.js server running on port 3000');
  });
});