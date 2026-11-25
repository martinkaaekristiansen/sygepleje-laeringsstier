import { GROUPS, OPTIONAL } from './test-registry.js';
export function tasksFor(groups, extras = []) {
  const tasks = [];
  for (const group of groups) {
    if (!GROUPS[group]) throw Error('Unknown test group: ' + group);
    if (group === 'oxygen-journeys') {
      for (const device of ['desktop', 'mobile'])
        for (const level of ['easy', 'medium', 'hard'])
          tasks.push({ id: group + '-' + device + '-' + level, group, device, level });
      continue;
    }
    if (
      ['digestion-journeys', 'digestion-audio', 'digestion-resume', 'oxygen-journeys'].includes(
        group,
      )
    ) {
      for (const device of ['desktop', 'mobile'])
        tasks.push({
          id: group + '-' + device,
          group,
          device,
          section: group === 'digestion-resume' ? 'checkpoints' : '',
        });
      if (group === 'digestion-resume')
        tasks.push({ id: group + '-shared', group, section: 'shared' });
    } else tasks.push({ id: group, group });
  }
  for (const extra of extras) {
    if (!OPTIONAL[extra]) throw Error('Unknown optional suite');
    for (const file of OPTIONAL[extra]) tasks.push({ id: file, extra, files: [file] });
  }
  // Schedule the measured long real-time journeys first. Each task still has a
  // separate runner; this does not run competing WebGL browsers on one machine.
  const cost = {
    'digestion-journeys': 100,
    'oxygen-journeys': 90,
    'digestion-resume': 80,
    'digestion-physiology': 70,
    'digestion-layout': 65,
    'digestion-audio': 60,
    'blood-anatomy': 50,
  };
  return tasks.sort((a, b) => (cost[b.group] || 0) - (cost[a.group] || 0));
}
