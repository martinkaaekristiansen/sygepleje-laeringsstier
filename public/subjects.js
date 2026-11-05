import {subjects as defaults} from './data.js';

export const ALL_SUBJECTS = defaults[0];
export const MAX_SUBJECT_LENGTH = 80;
export const cleanSubject = value => typeof value === 'string' ? value.normalize('NFC').trim().replace(/\s+/gu, ' ') : '';
export const subjectKey = value => cleanSubject(value).toLocaleLowerCase('da-DK');
export const validSubject = value => typeof value === 'string' && cleanSubject(value).length > 0 && cleanSubject(value).length <= MAX_SUBJECT_LENGTH && subjectKey(value) !== subjectKey(ALL_SUBJECTS);

export function uniqueSubjects(values) {
  const result = new Map();
  for (const value of values) {
    if (!validSubject(value)) continue;
    const key = subjectKey(value);
    const name = defaults.slice(1).find(s => subjectKey(s) === key) || cleanSubject(value);
    if (!result.has(key)) result.set(key, name);
  }
  return [...result.values()];
}

// Existing paths and drafts with a single `subject` remain readable without
// rewriting their IDs, content or student progress. New edits store `subjects`.
export function pathSubjects(path) {
  return uniqueSubjects(Array.isArray(path.subjects) ? path.subjects : [path.subject]);
}
export function validPathSubjects(path, allowEmpty = false) {
  if (path.subjects === undefined) return validSubject(path.subject);
  return Array.isArray(path.subjects) && (allowEmpty || path.subjects.length > 0) && path.subjects.every(validSubject);
}
export function subjectLabel(path) {return pathSubjects(path).join(' · ');}
export function hasSubject(path, subject) {return pathSubjects(path).some(s => subjectKey(s) === subjectKey(subject));}

// Student filters only include subjects attached to saved paths on this semester.
export function semesterSubjects(paths, semester) {
  return [ALL_SUBJECTS, ...uniqueSubjects(paths.filter(p => p.semester === semester).flatMap(pathSubjects))];
}
export function filterPaths(paths, semester, subject) {
  return paths.filter(p => p.semester === semester && (subject === ALL_SUBJECTS || hasSubject(p, subject)));
}
