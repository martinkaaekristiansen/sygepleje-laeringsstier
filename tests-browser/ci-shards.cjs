// Default invocation retains every device. Invalid selectors must never pass
// silently with zero cases. CI schedules the complete disjoint set of devices.
function devices(legacy = undefined) {
  const device = process.env.CI_DEVICE || legacy;
  if (device === undefined || device === '') return [false, true];
  if (!['desktop', 'mobile'].includes(device)) throw Error('Invalid device selector: ' + device);
  return [device === 'mobile'];
}
function levels() {
  const level = process.env.CI_LEVEL;
  if (!level) return ['easy', 'medium', 'hard'];
  if (!['easy', 'medium', 'hard'].includes(level)) throw Error('Invalid level selector: ' + level);
  return [level];
}
module.exports = { devices, levels };
