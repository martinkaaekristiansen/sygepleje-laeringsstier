import { execFileSync } from 'node:child_process';
import path from 'node:path';
// A container can have a different UID/HOME than actions/checkout. This trusts
// only its explicitly selected workspace for this command, never '*' globally.
export function git(args, { root = process.cwd(), ...options } = {}) {
  return execFileSync('git', ['-c', `safe.directory=${path.resolve(root)}`, ...args], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    ...options,
  });
}
export function validSHA(value) {
  return (
    typeof value === 'string' && /^[a-f\d]{40}(?:[a-f\d]{24})?$/i.test(value) && !/^0+$/.test(value)
  );
}
