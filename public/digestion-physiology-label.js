import * as T from './three.module.min.js';
// Tight text bounds keep short physiological labels readable at the same font
// size as longer captions. Size follows the CSS viewport, independently of DPR.
export function physiologyLabel(text, position, _width, avoidMap = false) {
  const canvas = document.createElement('canvas'),
    measure = canvas.getContext('2d');
  measure.font = '500 48px system-ui';
  canvas.width = Math.ceil(measure.measureText(text).width) + 40;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(39,18,27,.93)';
  ctx.beginPath();
  ctx.roundRect(0, 0, canvas.width, 80, 16);
  ctx.fill();
  ctx.font = '500 48px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff0df';
  ctx.fillText(text, canvas.width / 2, 40);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.minFilter = T.LinearFilter;
  texture.generateMipmaps = false;
  const sprite = new T.Sprite(
    new T.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      sizeAttenuation: false,
    }),
  );
  sprite.position.fromArray(position);
  sprite.userData.ownedTexture = texture;
  const size = new T.Vector2();
  let viewportWidth = 0,
    viewportHeight = 0;
  const resize = (width, height) => {
    if (height === viewportHeight && width === viewportWidth) return;
    viewportHeight = height;
    viewportWidth = width;
    sprite.center.x = avoidMap && width <= 600 && height <= 650 ? 0.32 : 0.5;
    const scale = (0.042 * 800) / Math.max(1, height);
    sprite.scale.set((scale * canvas.width) / 80, scale, 1);
    sprite.updateMatrixWorld(true);
  };
  resize(window.innerWidth, window.innerHeight);
  sprite.onBeforeRender = (renderer) => {
    renderer.getSize(size);
    resize(size.x, size.y);
  };
  return sprite;
}
