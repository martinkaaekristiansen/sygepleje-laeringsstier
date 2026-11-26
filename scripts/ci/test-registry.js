// Every existing browser entrypoint has an explicit role. Fixtures are listed
// separately; adding a new test without classifying it fails the registry test.
export const GROUPS = {
  'dose-investigation': {
    domains: ['dose'],
    tags: ['journey', 'layout', 'storage'],
    files: ['dose-investigation', 'dose-ux'],
  },
  core: {
    domains: ['platform'],
    tags: ['smoke'],
    core: true,
    files: ['acceptance', 'quality-fixes', 'oxygen-build', 'smoke-games'],
  },
  'blood-controls': {
    domains: ['blood', 'platform'],
    tags: ['layout', 'navigation', 'audio'],
    files: [
      'review',
      'circulation',
      'journey-guide',
      'journey-3d',
      'journey-audio',
      'game-viewport',
    ],
  },
  'blood-journey': { domains: ['blood'], tags: ['journey'], files: ['blood-game'] },
  'blood-anatomy': { domains: ['blood'], tags: ['anatomy'], files: ['journey-anatomy'] },
  'digestion-layout': {
    domains: ['digestion'],
    tags: ['layout'],
    files: ['digestion-phase-a', 'digestion-oral-mobile', 'digestion-labels'],
  },
  'digestion-physiology': {
    domains: ['digestion'],
    tags: ['anatomy'],
    files: ['digestion-hcl', 'digestion-enzyme-continuity', 'digestion-microbiota'],
  },
  'digestion-audio': { domains: ['digestion'], tags: ['audio'], files: ['digestion-audio'] },
  'digestion-journeys': { domains: ['digestion'], tags: ['journey'], files: ['digestion'] },
  'digestion-resume': { domains: ['digestion'], tags: ['storage'], files: ['digestion-v2'] },
  'digestion-world': {
    domains: ['digestion'],
    tags: ['anatomy'],
    files: ['digestion-continuous', 'digestion-continuous-state'],
  },
  'oxygen-functional': {
    domains: ['oxygen'],
    tags: ['anatomy', 'audio', 'storage'],
    files: ['oxygen-physiology', 'oxygen-visibility', 'oxygen-audio', 'oxygen-state'],
  },
  'oxygen-layout': { domains: ['oxygen'], tags: ['layout'], files: ['oxygen-layout'] },
  'oxygen-journeys': { domains: ['oxygen'], tags: ['journey'], files: ['oxygen-journeys'] },
};
export const OPTIONAL = {
  performance: [
    'digestion-performance',
    'digestion-continuous-performance',
    'digestion-continuous-occlusion',
    'digestion-anatomy-performance',
    'oxygen-performance',
  ],
  visual: [
    'digestion-phase-b',
    'digestion-phase-c',
    'digestion-anatomy-visual',
    'digestion-v2-visuals',
    'oxygen-visual',
  ],
};
export const HELPERS = ['digestion-fixtures', 'oxygen-fixtures', 'oxygen-inspection', 'ci-shards'];
export const LEGACY = [
  'digestion-phase-a',
  'digestion-oral-mobile',
  'digestion-labels',
  'digestion-hcl',
  'digestion-enzyme-continuity',
  'digestion-microbiota',
  'digestion',
  'digestion-audio',
  'digestion-v2',
  'review',
  'acceptance',
  'blood-game',
  'journey-audio',
  'journey-anatomy',
  'journey-guide',
  'journey-3d',
  'circulation',
  'quality-fixes',
  'game-viewport',
];
export function selectGroups({ full = false, domains = [], layout = false } = {}) {
  return Object.entries(GROUPS)
    .filter(
      ([, group]) =>
        !group.core &&
        (full ||
          (layout
            ? group.tags.includes('layout')
            : group.domains.some((d) => domains.includes(d)))),
    )
    .map(([id]) => id);
}
export function allBrowserFiles() {
  return [
    ...Object.values(GROUPS).flatMap((g) => g.files),
    ...Object.values(OPTIONAL).flat(),
    ...HELPERS,
  ].map((f) => `tests-browser/${f}.cjs`);
}
