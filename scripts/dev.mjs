import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createServer, loadEnv } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const env = loadEnv('development', root, '');
let frontend;
let stopping = false;
const backend = fork(fileURLToPath(new URL('../server/index.js', import.meta.url)), [], {
  cwd: root,
  env: { ...process.env, ...env },
  stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
});

async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  backend.kill();
  await frontend?.close();
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
process.on('disconnect', () => void shutdown());

try {
  // Do not show a usable frontend until its API is listening.
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('The API did not start within 15 seconds. Check its configuration.')), 15000);
    backend.once('message', message => {
      if (message?.type === 'ready') {
        clearTimeout(timeout);
        resolve();
      }
    });
    backend.once('error', error => { clearTimeout(timeout); reject(error); });
    backend.once('exit', () => {
      clearTimeout(timeout);
      reject(new Error('The API could not start. Check the server error above and your .env file.'));
      if (!stopping) void shutdown(1);
    });
  });
  if (!stopping) {
    frontend = await createServer({ root, configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)) });
    if (stopping) await frontend.close();
    else {
      await frontend.listen();
      frontend.printUrls();
    }
  }
} catch (error) {
  console.error(error.message);
  await shutdown(1);
}
