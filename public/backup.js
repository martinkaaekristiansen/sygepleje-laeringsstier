import { validateState, migrateLegacy } from './model.js';
export function backupFile(state) {
  if (!validateState(state))
    throw Error('Data kunne ikke valideres. Hent de oprindelige data fra gendannelsessiden.');
  return {
    format: 'laeringsstier-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    state: structuredClone(state),
  };
}
export function restoreFile(data) {
  let state =
    data?.format === 'laeringsstier-backup'
      ? data.state
      : data?.format === 'laeringsstier-recovery'
        ? data.raw
        : null;
  if (
    state &&
    !state.schemaVersion &&
    ['paths', 'progress', 'installed'].every((k) => Object.hasOwn(state, k))
  )
    state = migrateLegacy(state);
  if (!validateState(state))
    throw Error(
      'Filen indeholder ikke en gyldig sikkerhedskopi. Beskadigede rådata skal undersøges, før de kan gendannes.',
    );
  return structuredClone(state);
}
