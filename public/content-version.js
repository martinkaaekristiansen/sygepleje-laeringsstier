// A deterministic content fingerprint for detecting local edits, not authentication.
export function contentFingerprint(path) {
  const ordered = (value) =>
    Array.isArray(value)
      ? value.map(ordered)
      : value && typeof value === 'object'
        ? Object.fromEntries(
            Object.keys(value)
              .sort()
              .filter(
                (key) =>
                  ![
                    'contentVersion',
                    'builtinVersion',
                    'builtinId',
                    'baselineFingerprint',
                  ].includes(key),
              )
              .map((key) => [key, ordered(value[key])]),
          )
        : value;
  const text = JSON.stringify(ordered(path));
  let a = 2166136261,
    b = 5381;
  for (let i = 0; i < text.length; i++) {
    a = Math.imul(a ^ text.charCodeAt(i), 16777619);
    b = Math.imul(b, 33) ^ text.charCodeAt(i);
  }
  return `${text.length}:${a >>> 0}:${b >>> 0}`;
}
