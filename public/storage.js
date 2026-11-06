import { migrateLegacy, validateState, addNewBuiltins } from './model.js';
export const DB_NAME = 'laeringsstier-v2';
const keys = ['paths', 'progress', 'drafts', 'installed', 'dismissedUpdates'];
const request = (req) =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
const completed = (tx) =>
  new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error || Error('Lagringen blev afbrudt.'));
    tx.onerror = () => {};
  });
export class StorageFailure extends Error {
  constructor(message, raw, backup) {
    super(message);
    this.raw = raw;
    this.backup = backup;
  }
}
export async function openStorage() {
  let db;
  try {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('records');
    db = await request(req);
    db.onversionchange = () => db.close();
  } catch {
    throw new StorageFailure(
      'Browseren giver ikke adgang til lokal lagring. Tillad webstedsdata, og prøv igen.',
      null,
      null,
    );
  }
  let cache = null;
  async function snapshot() {
    const tx = db.transaction('records', 'readonly'),
      store = tx.objectStore('records');
    const values = await Promise.all(['meta', ...keys, 'backup'].map((k) => request(store.get(k))));
    return {
      state: values[0]
        ? { ...values[0], ...Object.fromEntries(keys.map((k, i) => [k, values[i + 1]])) }
        : null,
      backup: values.at(-1),
    };
  }
  return {
    async load() {
      const { state, backup } = await snapshot();
      if (state) {
        if (!validateState(state))
          throw new StorageFailure(
            'De gemte data har et ukendt eller beskadiget format. Dine data er ikke overskrevet.',
            state,
            backup,
          );
        cache = structuredClone(state);
        const updated = addNewBuiltins(state);
        return JSON.stringify(updated) !== JSON.stringify(state) ? this.save(updated) : state;
      }
      let raw;
      try {
        raw = {
          paths: localStorage.getItem('paths-v1'),
          progress: localStorage.getItem('progress-v1'),
          installed: localStorage.getItem('builtin-paths-v1'),
        };
      } catch {
        throw new StorageFailure(
          'De tidligere browserdata kunne ikke læses. Tillad lokal lagring, og prøv igen.',
          null,
          backup,
        );
      }
      let migrated;
      try {
        migrated = addNewBuiltins(migrateLegacy(raw));
        if (!validateState(migrated)) throw Error();
      } catch {
        throw new StorageFailure(
          'De tidligere browserdata kan ikke flyttes automatisk. Hent en kopi, før du vælger at starte forfra.',
          raw,
          backup,
        );
      }
      // Original localStorage keys remain untouched as an additional migration backup.
      return this.save(migrated, { initial: true, legacy: raw });
    },
    async save(state, { initial = false, legacy = null, replace = false } = {}) {
      if (!validateState(state))
        throw Error('Data kunne ikke valideres. De tidligere data er bevaret.');
      const tx = db.transaction('records', 'readwrite'),
        done = completed(tx),
        store = tx.objectStore('records');
      // A single transaction commits content, progress and draft together. The revision
      // check prevents one browser tab from silently overwriting another tab's changes.
      let conflict = false;
      const meta = store.get('meta');
      let next;
      meta.onsuccess = () => {
        try {
          const revision = meta.result?.revision || 0;
          if (!replace && (initial ? Boolean(meta.result) : revision !== state.revision)) {
            conflict = true;
            tx.abort();
            return;
          }
          next = { ...state, revision: revision + 1 };
          if (cache && JSON.stringify(cache.paths) !== JSON.stringify(state.paths))
            store.put(cache, 'backup');
          for (const key of keys)
            if (replace || !cache || JSON.stringify(cache[key]) !== JSON.stringify(state[key]))
              store.put(state[key], key);
          store.put({ schemaVersion: state.schemaVersion, revision: next.revision }, 'meta');
          if (legacy) store.put(legacy, 'legacy');
        } catch {
          tx.abort();
        }
      };
      try {
        await done;
      } catch (error) {
        if (conflict)
          throw Error(
            'En anden fane har gemt ændringer. Kopiér eventuel ugemt tekst til et dokument, og genindlæs siden, før du fortsætter.',
          );
        throw Error(
          'Browseren kunne ikke gemme. Dit arbejde er stadig åbent. Frigør plads uden at slette dette websteds data, og prøv at gemme igen.',
        );
      }
      cache = structuredClone(next);
      return next;
    },
    async snapshot() {
      return structuredClone(await snapshot());
    },
    async backup() {
      return (await snapshot()).backup;
    },
    close() {
      db.close();
    },
  };
}
