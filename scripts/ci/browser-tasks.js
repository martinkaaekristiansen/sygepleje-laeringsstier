import { GROUPS, OPTIONAL } from './test-registry.js';
export function tasksFor(groups, extras = []) {
  const tasks = [];
  for (const group of groups) {
    if (!GROUPS[group]) throw Error('Unknown test group: ' + group);
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
  return tasks;
}
