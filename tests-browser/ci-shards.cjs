// Default invocation retains every device. Invalid selectors must never pass
// silently with zero cases. CI schedules the complete disjoint set of devices.
function devices(legacy = undefined) {
  const device = process.env.CI_DEVICE || legacy;
  if (device === undefined || device === '') return [false, true];
  if (!['desktop', 'mobile'].includes(device)) throw Error('Invalid device selector: ' + device);
  return [device === 'mobile'];
}
module.exports = { devices };
