// Fill the visible browser viewport on iOS/Android too, without requiring the
// gesture-only Fullscreen API. Only menus/settings may scroll internally.
export function lockGameViewport(root) {
  const y = window.scrollY,
    x = window.scrollX,
    bodyTop = document.body.style.top;
  const background = [
    ...document.querySelectorAll('#app > header,#app > footer,#app > .skip-link'),
  ].map((el) => [el, el.inert]);
  background.forEach(([el]) => (el.inert = true));
  document.documentElement.classList.add('blood-viewport-active');
  document.body.style.top = `-${y}px`;
  const viewport = window.visualViewport;
  const resize = () => {
    root.style.setProperty('--game-height', `${viewport?.height || window.innerHeight}px`);
    root.style.setProperty('--game-top', `${viewport?.offsetTop || 0}px`);
  };
  resize();
  window.addEventListener('resize', resize);
  viewport?.addEventListener('resize', resize);
  viewport?.addEventListener('scroll', resize);
  return () => {
    window.removeEventListener('resize', resize);
    viewport?.removeEventListener('resize', resize);
    viewport?.removeEventListener('scroll', resize);
    background.forEach(([el, inert]) => (el.inert = inert));
    document.documentElement.classList.remove('blood-viewport-active');
    document.body.style.top = bodyTop;
    window.scrollTo(x, y);
  };
}
