# Hero 3D model

The hero loads `public/models/macbook.glb` (3.1 MB) — the optimized build of
`model-source/macbook-pro-14-inch-m5/`.

**Nothing but the built `.glb` may live under `public/`.** Vite copies that
directory verbatim into `dist/`, so a source folder parked there ships the raw
54 MB to every visitor. That is why the sources sit in `model-source/`, which is
not served and not part of the build.

## ⚠️ Licence — unresolved

The MacBook download shipped **no licence file**. Confirm its terms and put the
required credit in the footer (there is a placeholder line there now) before this
goes live. Apple hardware likenesses also carry trademark considerations
independent of whatever the model's own licence says.

`model-source/focused_student_with_laptop/` is the superseded student model
(CC BY 4.0, restore50). Nothing references it any more — safe to delete.

## Rebuilding the optimized GLB

Geometry is **not** simplified: the whole point of this model is the detailing,
and Draco alone does the heavy lifting (10.85 MB → 3.15 MB, no vertices lost).
Textures stay at source resolution for the same reason — they are only 2.6 MB of
the result.

Pin the CLI to 4.x; the current release requires Node 22 and this project is on 20.

```bash
npx @gltf-transform/cli@4.1.1 optimize \
  model-source/macbook-pro-14-inch-m5/source/macbook_pro_14_inch_M5.glb \
  public/models/macbook.glb \
  --simplify false --compress draco --texture-compress false
```

`--texture-compress webp` **fails** on these files with
`colourspace: parameter space not set` — libvips, which backs that flag, chokes
on them. Leave it off.

The Draco decoder is self-hosted in `public/draco/gltf/` (copied from
`three/examples/jsm/libs/draco/gltf/`) and wired up via `DRACO_PATH` in
`src/components/three/Macbook.jsx`. drei's default is a CDN fetch, which adds a
round-trip to first paint.

## Screen geometry — where the camera path's numbers come from

The display mesh is identified as *the one whose material carries an emissive
map* (the stock wallpaper). Everything in the model is hash-named, so there is
nothing semantic to match on. Measured off the GLB:

| | value |
|---|---|
| world centre | `[0, 0.1053, -0.1514]` |
| world normal | `[0, 0.3421, 0.9397]` (faces the viewer, 20° up) |
| size | 0.3008 × 0.1956 m |

Those are `SCREEN_CENTER` / `SCREEN_NORMAL` / `SCREEN_W` / `SCREEN_H` in
`src/components/three/cameraPath.js`. Sanity check: the diagonal works out to
14.1″, which is the machine it claims to be, and the model is at real-world
scale in metres.

The closing camera distance is **computed at runtime**, not hard-coded — which
axis limits the framing flips with viewport aspect (a wide window is bound by
the screen's width, a tall one by its height), so a fixed distance would leave
background visible at some sizes.
