/**
 * GLSL for the ghostly raymarched smoke orb, kept as a shared chunk so the
 * shader that draws the laptop's display can include it.
 *
 * A sphere SDF displaced by drifting 3D fbm noise, marched front-to-back with
 * absorption. Two things keep it affordable: pixels outside the orb's radius
 * skip the march entirely (the branch is spatially coherent, so neighbouring
 * pixels take the same path), and the noise is three octaves — a fourth is not
 * visible through this much absorption but costs eight more hashes at every
 * one of the march's steps.
 */
export const ORB_GLSL = /* glsl */ `
  const vec3 ORB_VIOLET = vec3(0.486, 0.361, 1.000);
  const vec3 ORB_CYAN   = vec3(0.133, 0.827, 0.933);
  const vec3 ORB_CORE   = vec3(0.870, 0.890, 1.000);

  const float ORB_RADIUS = 0.80;
  // High turbulence relative to the radius is what makes it read as smoke
  // rather than a lit sphere — the noise has to dominate the surface, not
  // merely ripple it.
  const float ORB_TURB = 1.05;

  float orbHash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float orbNoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(orbHash(i + vec3(0,0,0)), orbHash(i + vec3(1,0,0)), f.x),
          mix(orbHash(i + vec3(0,1,0)), orbHash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(orbHash(i + vec3(0,0,1)), orbHash(i + vec3(1,0,1)), f.x),
          mix(orbHash(i + vec3(0,1,1)), orbHash(i + vec3(1,1,1)), f.x), f.y),
      f.z);
  }

  // Two octaves. A third is barely distinguishable through this much
  // absorption but costs another eight hashes at every step of the march.
  float orbFbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 2; i++) {
      v += a * orbNoise(p);
      p = p * 2.03 + vec3(1.7, 9.2, 3.1);
      a *= 0.5;
    }
    return v;
  }

  float orbDensity(vec3 p, float t) {
    float d = length(p) - ORB_RADIUS;
    float n = orbFbm(p * 2.3 + vec3(0.0, -t * 0.10, t * 0.06));
    d += (n - 0.5) * ORB_TURB;
    // A thin shell rather than a filled ball: a wide falloff accumulates to
    // saturation along every ray and flattens the smoke into a solid blob.
    return smoothstep(0.24, -0.10, d);
  }

  /** \`sp\` is aspect-corrected screen position, centred on the orb. */
  vec3 smokeOrb(vec2 sp, float t) {
    float r = length(sp);
    vec3 col = mix(ORB_VIOLET, ORB_CYAN, 0.45) * exp(-r * 2.1) * 0.045;

    if (r < 1.35) {
      vec3 ro = vec3(0.0, 0.0, 3.0);
      vec3 rd = normalize(vec3(sp, -2.4));

      vec4 acc = vec4(0.0);

      // Eighteen coarse steps instead of twenty-eight fine ones, with the start
      // point dithered per pixel. Coarse steps alone would band the smoke into
      // visible shells; jittering trades that banding for a faint grain, which
      // the absorption hides. Roughly a third of the march's cost, for the same
      // look.
      float jitter = fract(sin(dot(sp, vec2(12.9898, 78.233))) * 43758.5453);
      float march = 1.7 + jitter * 0.148;

      for (int i = 0; i < 18; i++) {
        vec3 p = ro + rd * march;
        float dens = orbDensity(p, t);

        if (dens > 0.01) {
          float core = 1.0 - smoothstep(0.0, 1.35, length(p));
          vec3 c = mix(ORB_VIOLET, ORB_CYAN, core * 0.75) + ORB_CORE * core * core * 0.38;
          float a = dens * 0.088;
          acc.rgb += c * a * (1.0 - acc.a);
          acc.a += a * (1.0 - acc.a);
          if (acc.a > 0.97) break;
        }

        march += 0.148;
      }

      col += acc.rgb;
    }

    return col;
  }
`;
