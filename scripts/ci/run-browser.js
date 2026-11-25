import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir as mkdirAsync, writeFile as writeAsync } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { startStaticServer } from '../static-server.js';
import { GROUPS } from './test-registry.js';
import { tasksFor } from './browser-tasks.js';

export function runChild(command, args, { env = process.env, log, timeout = 30 * 60 * 1000 } = {}) {
  return new Promise((resolve, reject) => {
    const output = log ? createWriteStream(log) : null;
    const child = spawn(command, args, { env, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      process.kill(-child.pid, 'SIGKILL');
    }, timeout);
    timer.unref();
    for (const [input, target] of [
      [child.stdout, process.stdout],
      [child.stderr, process.stderr],
    ])
      input.on('data', (chunk) => {
        target.write(chunk);
        output?.write(chunk);
      });
    const finish = () => {
      clearTimeout(timer);
      output?.end();
    };
    child.once('error', (error) => {
      finish();
      reject(error);
    });
    child.once('close', (code, signal) => {
      finish();
      code === 0 && !timedOut
        ? resolve()
        : reject(
            Error(
              `Child failed: ${command} ${args.join(' ')} (exit ${code}, signal ${signal}, timeout ${timedOut})`,
            ),
          );
    });
  });
}
export async function runTask(task) {
  const files = task.files || GROUPS[task.group]?.files;
  if (!files || !/^[\w-]+$/.test(task.id)) throw Error('Invalid browser task');
  const output = path.resolve('artifacts/browser', task.id);
  await mkdirAsync(output, { recursive: true });
  const server = await startStaticServer({ root: 'dist', prefix: '/sygepleje-laeringsstier/' });
  const env = {
    ...process.env,
    APP_URL: server.url,
    CI_DEVICE: task.device || '',
    CI_LEVEL: task.level || '',
    CI_V2_SECTION: task.section || '',
    OXYGEN_TEST_SPEED: '1',
  };
  for (const key of [
    'ANATOMY_OUTPUT',
    'ORAL_OUTPUT',
    'V2_OUTPUT',
    'CONTINUOUS_OUTPUT',
    'DIGEST_SCREENSHOTS',
    'OXYGEN_OUTPUT',
    'PERF_OUTPUT',
  ])
    env[key] = output;
  env.OXYGEN_JOURNEY_RESULTS = path.join(output, 'oxygen-journeys.json');
  const results = [];
  try {
    for (const file of files) {
      const started = Date.now(),
        result = { file, started: new Date(started).toISOString() };
      try {
        await runChild(process.execPath, ['tests-browser/' + file + '.cjs'], {
          env,
          log: path.join(output, file + '.log'),
        });
        result.passed = true;
      } catch (e) {
        result.passed = false;
        result.error = e.message;
        throw e;
      } finally {
        result.seconds = (Date.now() - started) / 1000;
        results.push(result);
      }
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await writeAsync(
      path.join(output, 'timings.json'),
      JSON.stringify({ task, results }, null, 2) + '\n',
    );
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [mode = 'core', id] = process.argv.slice(2);
  let tasks;
  if (mode === 'task') tasks = [JSON.parse(id)];
  else if (mode === 'core') tasks = [{ id: 'core', group: 'core' }];
  else if (mode === 'full') tasks = tasksFor(Object.keys(GROUPS).filter((k) => !GROUPS[k].core));
  else throw Error('Use core, full, or task with JSON');
  for (const task of tasks) await runTask(task);
}
