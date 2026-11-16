import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTE } from '../public/digestion-data.js';
import {
  synthesizeDigestSound,
  chewingPose,
  chewBeat,
  ORGAN_SOUND,
  createDigestAudio,
} from '../public/digestion-audio.js';
test('every station has an organic sound profile and transients are bounded with quiet edges', () => {
  for (const s of ROUTE) assert.ok(ORGAN_SOUND[s.id]);
  const buffers = [];
  for (const kind of [
    'chew',
    'swallow',
    'cough',
    'peristalsis',
    'rumble',
    'secretion',
    'binding',
    'cleave',
    'absorption',
    'splash',
  ]) {
    const b = synthesizeDigestSound(kind, 22050);
    assert.ok([...b].every(Number.isFinite));
    assert.ok(b.some((v) => Math.abs(v) > 0.001));
    assert.ok(Math.max(...b.map(Math.abs)) <= 0.7);
    assert.ok(Math.abs(b[0]) < 1e-6 && Math.abs(b.at(-1)) < 1e-6);
    buffers.push(b.length);
  }
  assert.ok(new Set(buffers).size > 5);
});
test('chewing sound beats occur at the jaw closing peak of the shared physiological clock', () => {
  const peak = Math.PI / (2 * 2.7);
  assert.ok(chewingPose(peak) > 0.999);
  assert.equal(chewBeat(peak - 0.001), -1);
  assert.equal(chewBeat(peak + 0.001), 0);
});
test('audio never opens a context without an enabled user unlock, and unsupported audio remains optional', async () => {
  let opens = 0;
  const a = createDigestAudio({
    contextFactory() {
      opens++;
      throw Error('unavailable');
    },
  });
  a.locate('mouth', 'intro');
  a.configure({ enabled: true, volume: 0.2 });
  assert.equal(opens, 0);
  assert.equal(a.effect('chew'), false);
  assert.equal(await a.unlock(), false);
  assert.equal(opens, 1);
  assert.equal(a.snapshot().blocked, true);
  a.dispose();
});
