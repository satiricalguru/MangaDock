export const backgroundVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Full-screen pass over the Gemini video: liquid flow, pointer ripple,
// scroll-driven hue shift, manga halftone and velocity-based chromatic split.
export const backgroundFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uVideo;
  uniform vec2 uRes;
  uniform vec2 uVideoRes;
  uniform vec2 uPointer;
  uniform float uTime;
  uniform float uProgress;
  uniform float uVelocity;
  uniform float uScreens;
  varying vec2 vUv;

  vec2 coverUv(vec2 uv) {
    float sa = uRes.x / uRes.y;
    float va = uVideoRes.x / uVideoRes.y;
    vec2 s = sa > va ? vec2(1.0, va / sa) : vec2(sa / va, 1.0);
    return (uv - 0.5) * s + 0.5;
  }

  vec3 hueShift(vec3 c, float a) {
    const vec3 k = vec3(0.57735);
    float ca = cos(a);
    return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca);
  }

  void main() {
    float aspect = uRes.x / uRes.y;
    vec2 uv = vUv;

    // pointer ripple
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
    vec2 m = uPointer * 0.5 * vec2(aspect, 1.0);
    float d = distance(p, m);
    uv += normalize(p - m + 1e-4) * 0.012 * exp(-d * 5.0) * sin(d * 28.0 - uTime * 3.0);

    // slow liquid flow on top of the video's own motion
    uv += 0.006 * vec2(sin(uv.y * 7.0 + uTime * 0.45), cos(uv.x * 6.0 + uTime * 0.35));

    vec2 cuv = coverUv(uv);
    float split = clamp(0.0015 + abs(uVelocity) * 0.00035, 0.0, 0.018);
    vec3 col;
    col.r = texture2D(uVideo, cuv + vec2(split, 0.0)).r;
    col.g = texture2D(uVideo, cuv).g;
    col.b = texture2D(uVideo, cuv - vec2(split, 0.0)).b;

    // colour journey as you scroll down the page
    col = hueShift(col, uProgress * 2.6);
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(lum), col, 1.3);

    // manga halftone fades in after the hero
    vec2 cell = fract(gl_FragCoord.xy / 7.0) - 0.5;
    float dotMask = smoothstep(0.02, 0.0, length(cell) - (1.0 - lum) * 0.42);
    float halftone = smoothstep(1.2, 3.6, uScreens) * 0.45;
    col = mix(col, col * (1.0 - dotMask * 0.7), halftone);

    // keep text readable: darker as the page goes on, plus vignette
    col *= mix(0.6, 0.22, smoothstep(3.4, 5.4, uScreens));
    col *= smoothstep(1.25, 0.25, length(vUv - 0.5) * 1.5);

    gl_FragColor = vec4(col, 1.0);
  }
`;
