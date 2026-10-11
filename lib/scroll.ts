// Shared, mutable scroll state. Lenis writes it every frame and the WebGL scene
// reads it inside useFrame, so scrolling never triggers React re-renders.
export const scrollState = {
  /** 0..1 over the whole page */
  progress: 0,
  /** px per frame, smoothed */
  velocity: 0,
  /** pixels scrolled */
  y: 0,
  /** viewport heights scrolled (y / innerHeight) */
  screens: 0,
};

/** Pointer position in -1..1, also written outside React. */
export const pointer = { x: 0, y: 0 };
