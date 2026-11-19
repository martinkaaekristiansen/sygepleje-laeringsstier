import * as T from './three.module.min.js';
// Small, non-interactive in-scene labels support the unfamiliar internal views.
export function anatomicalLabel(text, position, width = 2) {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(39,18,27,.86)';
  ctx.beginPath();
  ctx.roundRect(2, 2, 636, 92, 20);
  ctx.fill();
  ctx.fillStyle = '#ffeadb';
  ctx.font = '500 36px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 320, 48, 600);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  const material = new T.SpriteMaterial({
    map: texture,
    transparent: true,
    sizeAttenuation: false,
    depthTest: true,
    depthWrite: false,
  });
  const sprite = new T.Sprite(material);
  sprite.position.fromArray(position);
  sprite.scale.set(width * 0.14, (width * 0.14 * 96) / 640, 1);
  sprite.userData.anatomicalLabel = text;
  sprite.userData.ownedTexture = texture;
  return sprite;
}
