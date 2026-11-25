import { freshState, restoreState } from './dose-engine.js';
export const saveKey = (id) => 'doedelig-dosis:v1:' + id;
export function openCaseStore(data, storage) {
  const key = saveKey(data.id);
  let blocked = false,
    warning = '',
    original = null,
    state;
  try {
    original = storage.getItem(key);
    state = original ? restoreState(data, JSON.parse(original)) : freshState(data);
    if (original && JSON.parse(original).version !== data.version)
      warning =
        'Sagen er opdateret. Dine noter er bevaret; gennemgå fundene og afslut rapporten igen.';
  } catch {
    blocked = true;
    state = freshState(data);
    warning = original
      ? 'Det gemte spil kunne ikke læses. Originalen er bevaret. Eksportér den eller nulstil denne sag for at gemme igen.'
      : 'Browserlageret er utilgængeligt. Spillet virker, men gemmes ikke. Eksportér dine noter.';
  }
  let revision = state.revision;
  return {
    state,
    get warning() {
      return warning;
    },
    original,
    save() {
      if (blocked) return false;
      try {
        const raw = storage.getItem(key),
          latest = raw ? JSON.parse(raw) : null;
        if ((latest?.revision || 0) !== revision) {
          blocked = true;
          warning =
            'Sagen er ændret i en anden fane. Genindlæs før du fortsætter, så du undgår at overskrive noter.';
          return false;
        }
        state.revision = revision + 1;
        state.updatedAt = Date.now();
        storage.setItem(key, JSON.stringify(state));
        revision = state.revision;
        warning = '';
        return true;
      } catch {
        warning =
          'Ændringerne kunne ikke gemmes. Eksportér dine noter, og frigør plads eller giv adgang til browserlageret.';
        return false;
      }
    },
    reset() {
      storage.removeItem(key);
    },
  };
}
