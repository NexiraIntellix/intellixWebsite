import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { BakeShadows, useProgress } from "@react-three/drei";
import { fade } from "../hooks/useZoomProgress.js";
import { cameraAt, FLY_END, WIDE_POS, HERO_VH, SEQ_START } from "./three/cameraPath.js";
import Macbook from "./three/Macbook.jsx";
import Studio from "./three/Studio.jsx";
import ScreenPage from "./ScreenPage.jsx";
import SpinBadge from "./SpinBadge.jsx";

/**
 * The resting wordmark: NEXIRA INTELLIX on one line, set in the site's display
 * face, with the laptop standing IN FRONT of it.
 *
 * The mark and the machine share the shot rather than taking turns in it -- the
 * name is read against the thing it belongs to, and the fly-in is then a move
 * toward something already on screen rather than a reveal of something that was
 * not.
 *
 * What changed is the depth order. Laid over the render the word was a sticker:
 * it cut straight across the display, so the screen artwork and the letters
 * spoiled each other and neither read. Behind it, the two occupy one space --
 * the machine occludes the middle of the word the way an object in a room
 * occludes a sign on the wall, and that occlusion is the only thing in the shot
 * that says the two are at different distances.
 *
 * The size is not a separate decision from that. Behind the laptop at its old
 * measure the word would have been almost entirely hidden, so it has to run
 * wide enough that both ends clear the chassis and the eye completes the word
 * across it.
 */
function HeroCompanyTitle({ boxRef, wordLRef, wordRRef }) {
  const { active } = useProgress();

  return (
    <>
      <style>{`
        /* Which side of the laptop the name sits on, and it has to be a
           breakpoint rather than a constant.

           The machine is framed by a fixed-FOV camera, so it takes a roughly
           constant share of the WIDTH -- around 56vw on a wide window, but very
           nearly the whole frame on a phone, where the viewport is narrow and
           tall. Behind it at that size the word is reduced to "NE": the
           occlusion stops reading as depth and just reads as the name being
           broken. So below 1100px the name comes back in front, where it is
           simply legible, and the depth trick is spent only where there is
           enough width for both ends of the word to clear the chassis. */
        .nx-hero-markbox { z-index: 1; }
        @media (max-width: 1100px) {
          .nx-hero-markbox { z-index: 5; }
        }
        /* The fill sits on the words, not on the h1.
           background-clip: text paints only where the element's OWN glyphs
           are, and the h1 has none of its own now that the mark is two child
           spans -- which is why NEXIRA rendered and INTELLIX vanished
           entirely. Each word carries the ramp itself. */
        .nx-hero-word { overflow: hidden; }

        /* Outlined, not filled: the machine and the ground read straight
           through the letters, which is what makes the occlusion legible --
           you can see the lid passing behind the strokes rather than merely
           interrupting them.

           No fill at all, so there is no gradient and nothing to animate. The
           rise is the only thing left on this element, which is also what keeps
           the entrance from colliding with the scroll transform on its parent.

           The stroke is set in em so it tracks the type, but clamped at both
           ends: 0.0095em is 2.3px against a 242px cap on a desktop and 0.47px
           on a phone, which would vanish. The floor holds it at 1.2px. */
        .nx-hero-rise {
          display: block;
          animation: nx-hero-rise 1.35s cubic-bezier(.16, 1, .3, 1) .15s both;
          color: transparent;
          -webkit-text-stroke-color: var(--text-strong);
          -webkit-text-stroke-width: clamp(1.2px, 0.0095em, 3px);
          /* An outline on a near-black ground has nothing to separate it from
             the ground; this gives the strokes their own edge without filling
             them. */
          paint-order: stroke fill;
          filter: drop-shadow(0 0 14px color-mix(in srgb, var(--a-6) 22%, transparent));
        }

        .nx-hero-rise-2 { animation-delay: .27s; }

        @keyframes nx-hero-rise {
          from { transform: translateY(115%); }
          to   { transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .nx-hero-rise { animation: none; }
        }
      `}</style>
      <div
        ref={boxRef}
        className="nx-hero-markbox"
        style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 24px",
          pointerEvents: "none",
          /* First-paint values only. Every frame after mount the opacity and
             the lift are written straight to this node by the loop in the
             parent -- see the note there. */
          opacity: active ? 0 : 1,
          transform: "translateY(-50%)",
        }}
      >
        <h1
          className="nx-hero-title"
          style={{
            margin: 0,
            // The only element on the site set in the XL display role.
            fontFamily: "var(--display-xl)",
            // Clash Display ships 200-700, so 800 would be synthesised -- a
            // browser-smeared bold rather than a drawn one.
            fontWeight: 700,
            /* Set nowrap, this line measures 4.07em wide in Humane -- measured
               off the render, not estimated -- so the size is really a width
               decision, and 20.6vw is that factor solved for ~84% of the
               window. Wide enough that both ends clear the laptop and read as
               one word across it; short of the edges, so the viewport is never
               the thing doing the cropping.
               Humane sets at well under half the width of the face before it,
               which is the whole character of an ultra-condensed cut: it has
               to run far larger to occupy the same measure, and the height
               that buys is the point.
               Brought down from 20.6vw: at that size the line ran 84vw and the
               two halves had nowhere to go except behind the machine. At 13.8
               it sets ~51vw, which leaves ground either side of the laptop for
               the second half to actually clear it -- and, at a 6vw margin
               rather than 3, keeps both halves off the frame's edges. Pinned to
               the corners they stopped reading as flanking the machine and
               started reading as having been pushed out of its way. */
            fontSize: "var(--nx-hero-fs)",
            lineHeight: 1.1,
            letterSpacing: "0.08em",
            whiteSpace: "nowrap",
            /* Real ground between the halves, and the gap centred on the
               MACHINE rather than on the frame.

               Set as one ordinary line the word space is about 2vw, which left
               INTELLIX almost entirely behind the chassis -- no step small
               enough to look calm could free it. A 23.4vw gap starts each half
               partly hidden instead, which is the composition, and leaves the
               reveal within reach of a short move.

               The translate is the other half of it. The two words are not the
               same width -- 22.5vw against 26.5 -- so centring the block puts
               the gap's centre 2vw left of the frame's, and the machine, whose
               own centre sits off the frame's, then took nearly all its
               overlap out of one half. This nudge carries the whole correction
               now that the camera carries none, and is set a little short of
               dead centre on the lid so NEXIRA sits further out and keeps only
               a light overlap, with INTELLIX taking the deeper one.

               The gap is 18vw against a lid that reads about 25vw wide, which
               is what makes the overlap possible at all: a gap wider than the
               lid leaves the words either side of it, touching nothing. */
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "18vw",
            /* A token so the small side can zero it -- an inline style cannot
               be overridden by a media query. The nudge exists to cancel the
               open lid's lean on a wide frame, where the mark stands BEHIND
               the machine and the gap has to land on the lid. On a phone the
               mark is in front, centred, and the camera now centres the
               machine itself, so there is nothing left to cancel: all the
               nudge did there was sit the name 33px right of centre. */
            transform: "translateX(var(--nx-hero-nudge, 4.2vw))",
          }}
        >
          {/* Two layers, so the entrance and the scroll never own the same
              transform. The outer span is the clip and carries the parting
              written per frame by the loop; the inner one carries only the
              rise, once, out of that clip. */}
          <span ref={wordLRef} className="nx-hero-word">
            <span className="nx-hero-rise">NEXIRA</span>
          </span>
          <span ref={wordRRef} className="nx-hero-word">
            <span className="nx-hero-rise nx-hero-rise-2">INTELLIX</span>
          </span>
        </h1>
      </div>
    </>
  );
}

function CameraRig({ progressRef }) {
  const { camera, size } = useThree();
  const look = useRef([0, 0.09, -0.03]);

  useFrame((_, delta) => {
    const { pos, look: target, fov } = cameraAt(progressRef.current, size.width / size.height);

    /* The camera chases a target; it is never set to one.
       The old factor here worked out at 0.999 per frame at 60fps and exactly
       1.0 at 30 -- arithmetic that reads as smoothing and is a direct binding
       to scroll position. At 0.075 the camera is always arriving, and it keeps
       moving for a beat after the wheel stops, which is the whole feeling.
       Normalised against delta so a 120Hz display is not damped twice as hard
       as a 60Hz one. */
    const k = 1 - Math.pow(1 - 0.075, Math.min(delta, 0.1) * 60);

    camera.position.x += (pos[0] - camera.position.x) * k;
    camera.position.y += (pos[1] - camera.position.y) * k;
    camera.position.z += (pos[2] - camera.position.z) * k;

    look.current[0] += (target[0] - look.current[0]) * k;
    look.current[1] += (target[1] - look.current[1]) * k;
    look.current[2] += (target[2] - look.current[2]) * k;
    camera.lookAt(look.current[0], look.current[1], look.current[2]);

    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov += (fov - camera.fov) * k;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

export default function Hero3D({ sectionRef, p, exit, vw, vh }) {
  /**
   * `p` is progress through the whole hero section, but the 3D choreography --
   * the camera path, the lid, the screen-surface fades in Macbook.jsx and
   * ScreenSurface.jsx -- is all calibrated against the fly-in's own 0->1 scale,
   * where FLY_END is the arrival. Remap rather than retune: this keeps every one
   * of those thresholds exactly where it was while the section itself grows to
   * make room for the frame sequence.
   */
  const flyP = Math.min(1, (p / SEQ_START) * FLY_END);
  const progressRef = useRef(flyP);
  progressRef.current = flyP;

  /**
   * The point cloud's own progress, as a ref. ScreenPage is memo()'d and reads
   * this inside its render loop, so scrolling never re-renders that subtree.
   */
  /**
   * The two things the eye actually tracks across the handoff -- the mark
   * growing past the lens, and the machine coming up behind it -- are written
   * straight to their nodes from a rAF loop rather than rendered from state.
   *
   * useZoomProgress deliberately drops any scroll update smaller than 0.002 of
   * the section, because re-rendering this subtree sixty times a second for a
   * number only the GPU consumes is what it was built to avoid. That threshold
   * is invisible on a fade and brutal on a scale: the push runs over about 0.10
   * of the section, so state can only deliver it in ~50 steps, each one moving
   * a 1300px-wide wordmark by roughly sixteen pixels. Scrolled slowly -- which
   * is exactly when this shot is looked at -- it stair-steps.
   *
   * Reading the section's own rect here costs one getBoundingClientRect per
   * frame and re-renders nothing.
   */
  const titleBoxRef = useRef(null);
  const wordLRef = useRef(null);
  const wordRRef = useRef(null);
  const laptopLayerRef = useRef(null);
  const spinSlotRef = useRef(null);

  useEffect(() => {
    let raf = 0;
    /* Smootherstep: zero velocity at both ends, quickest through the middle.
       The previous curve was an ease-out, so the halves left at full speed and
       crawled into place -- the opposite of how a considered move is paced. */
    const smooth = (x) => x * x * x * (x * (x * 6 - 15) + 10);

    /* What the scroll position asks for, and where the mark has actually got
       to. The gap between the two is the whole point.

       Until now these were the same number: the halves were positioned
       straight from scroll, so every wheel notch snapped them to their new
       place while the machine -- damped at 0.075 in CameraRig -- eased in
       behind them. The type arrived first and the laptop caught up, and that
       mismatch is what reads as jumping. It is not a dropped frame; it is two
       things on the same screen obeying different laws.
       Damped at the same 0.075, the mark and the machine travel together. */
    const live = { l: 0, r: 0, b: 0, x: 0 };
    let last = performance.now();

    /* When the mark has to be gone by, and it is not one answer.

       Above 1100px the mark stands BEHIND the machine, so the machine hides it
       for us as the camera closes in and it only has to be clear before the
       page arrives. Below 1100px it is in front -- see the z-index rule in
       HeroCompanyTitle, which puts it there because a phone frame is almost
       entirely lid and the name would otherwise be reduced to "NE". In front,
       nothing occludes it: it lies straight over the screen artwork, and by
       the time the display fills the frame the outline is sitting on top of
       "Build the future" with both still legible. So on that side of the
       breakpoint it leaves early, while the screen is still small enough that
       losing the name costs nothing.

       Same breakpoint as the z-index, because it is the same fact about the
       composition. Re-read on change so a rotated phone or a dragged window
       gets the window that matches what it is actually showing. */
    const inFront = window.matchMedia("(max-width: 1100px)");
    let exit = { from: 0, to: 0 };
    const setExit = () => {
      exit = inFront.matches
        ? { from: 0.16, to: 0.30 }
        : { from: SEQ_START - 0.14, to: SEQ_START - 0.03 };
    };
    setExit();
    inFront.addEventListener("change", setExit);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      // Seconds since the previous frame, capped so a backgrounded tab does not
      // come back and jump the whole move in one step.
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      // 0.075 per frame at 60fps, held steady on any other refresh rate.
      const k = 1 - Math.pow(1 - 0.075, dt * 60);
      const sec = sectionRef.current;
      if (!sec) return;

      const rect = sec.getBoundingClientRect();
      // Nothing to drive once the hero is off screen.
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;

      const span = Math.max(1, sec.offsetHeight - window.innerHeight);
      const sp = Math.min(1, Math.max(0, -rect.top / span));
      const fp = Math.min(1, (sp / SEQ_START) * FLY_END);

      const box = titleBoxRef.current;
      const wl = wordLRef.current;
      const wr = wordRRef.current;
      if (box && wl && wr) {
        /* The mark starts as one centred line, so both halves begin partly
           behind the machine, and each steps outward to show more of itself.

           A step, not a journey: 7vw each. Flattening the opening pose is what
           bought that -- a lid seen at 26 degrees rather than 42 is narrower on
           screen, so there is less of it to get out from behind. An earlier
           pass sent them 21 and
           24 -- enough to clear the chassis completely -- and clearing it
           completely is the problem, not the goal. From a centred start the
           only fully clear ground is at the frame's edges, so a full reveal
           means crossing most of the frame, and the wordmark ends up performing
           while the machine, which is the subject, sits still in the middle.
           Partly hidden is the composition. The move only has to say the two
           are at different depths.

           They travel on separate curves, INTELLIX marginally earlier, each
           with a small arc off the line that returns to zero on arrival, so
           the step reads as choreography rather than two divs sliding.

           And they stay. The machine keeps coming forward and grows over them,
           which is what should hide a sign standing behind an object. */
        live.l += (smooth(fade(fp, 0.03, 0.22)) - live.l) * k;
        live.r += (smooth(fade(fp, 0.02, 0.20)) - live.r) * k;
        const pl = live.l;
        const pr = live.r;

        const arc = (u) => Math.sin(Math.PI * u);

        /* Barely a fade: 100% down to 80%.
           It was 18%, which was the right number for the mark as it was then
           -- solid ivory letters, which at 18% still read as grey letterforms
           standing behind the machine. The mark is outlined now, and an
           outline has no interior to carry that: all of it is a stroke a pixel
           and a half wide, so at 18% there is nothing left to see and the name
           simply leaves the page halfway through the shot.
           The recession is the machine's job anyway -- it comes forward and
           grows over the type, which is what should hide a sign standing
           behind an object. This only takes the edge off. */

        /* And then it does have to go, all the way, before the page arrives.
           Dimming to 80% is right for the length of the fly-in and wrong for
           its last beat: the machine grows but never fills the frame, so both
           ends of the mark are still standing in clear ground when the screen
           takes over -- and the landing copy then reads through two 260px
           outlined words. That is the "NEXIRA coming back" on the transition.

           So a second factor, timed just ahead of the crossfade rather than
           with it. The layer swaps at SEQ_START - 0.05; the mark is gone by
           SEQ_START - 0.03, which is what makes it read as the wordmark
           leaving and the page arriving rather than the two dissolving through
           each other. */
        live.x += (smooth(fade(sp, exit.from, exit.to)) - live.x) * k;
        const px = live.x;

        wl.style.opacity = ((1 - pl * 0.2) * (1 - px)).toFixed(3);
        wr.style.opacity = ((1 - pr * 0.2) * (1 - px)).toFixed(3);
        /* Spent, not merely transparent -- the same reason as the badge below.
           At this size it is a full-width composited layer with a drop-shadow
           on it, and it stays mounted for several more viewports of scrolling. */
        box.style.visibility = px > 0.995 ? "hidden" : "visible";

        wl.style.transform =
          `translate(${(pl * -7.0).toFixed(3)}vw, ${(arc(pl) * -0.8).toFixed(3)}vh) ` +
          `rotate(${(arc(pl) * -0.55).toFixed(3)}deg) scale(${(1 - pl * 0.06).toFixed(4)})`;
        wr.style.transform =
          `translate(${(pr * 7.0).toFixed(3)}vw, ${(arc(pr) * 0.8).toFixed(3)}vh) ` +
          `rotate(${(arc(pr) * 0.55).toFixed(3)}deg) scale(${(1 - pr * 0.06).toFixed(4)})`;

        const moving = pl > 0.001 && pl < 0.999;
        box.style.willChange = moving ? "transform" : "auto";
      }

      /* The spin badge leaves once the wordmark has finished stepping out.
         It is a label on the opening frame -- it says who this belongs to
         while the name is the whole picture -- and once the machine is the
         subject it is one more thing turning in a shot that already has a
         camera moving in it. So it goes, on the same damping as everything
         else, over the window just after the reveal completes at fp 0.22.

         Ends at display:none rather than at opacity 0. A transparent link is
         still a link: it stays in the tab order, still takes a click over the
         laptop, and -- with a rAF writing a transform to it every frame --
         still a live composited layer for the several viewports this sticky
         hero stays mounted. Dropping the box also parks the badge's own loop
         for free, since the observer inside it stops intersecting. */
      const badge = spinSlotRef.current;
      if (badge) {
        live.b += (smooth(fade(fp, 0.16, 0.36)) - live.b) * k;
        const pb = live.b;
        const spent = pb > 0.995;
        badge.style.opacity = (1 - pb).toFixed(3);
        badge.style.display = spent ? "none" : "";
      }

      const layer = laptopLayerRef.current;
      if (layer) {
        const handoffNow = fade(sp, SEQ_START - 0.05, SEQ_START + 0.015);
        layer.style.opacity = String(1 - handoffNow);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      inFront.removeEventListener("change", setExit);
    };
  }, [sectionRef]);

  const seqRef = useRef(0);
  seqRef.current = fade(p, SEQ_START, 1);

  // Starts *before* SEQ_START on purpose. ScreenSurface's content fade
  // completes at flyP 0.82, which lands just under SEQ_START; beginning the
  // crossfade only at SEQ_START left a stretch where the screen had gone dark
  // and the cloud had not arrived -- a black frame mid-scroll.
  const handoff = fade(p, SEQ_START - 0.05, SEQ_START + 0.015);

  /**
   * Which of the two WebGL contexts is worth running. Both canvases stay
   * mounted -- tearing one down and rebuilding it mid-scroll costs more than
   * parking it -- but only the visible one drives a render loop.
   *
   * The `onScreen` half is not a refinement, it is the whole thing below the
   * hero. `handoff` saturates at 1 the moment the cloud takes over and never
   * comes back down, so `handoff > 0` stayed true for the entire rest of the
   * page: the point cloud kept rendering at 40-60 draws a second behind every
   * section under this one, off-screen, for nobody. `exit` is already measured
   * next door -- 1 once the hero's bottom clears the top of the window -- so
   * parking both loops on it costs nothing to compute.
   */
  const onScreen = exit < 1;
  const cloudLive = handoff > 0 && onScreen;
  const laptopLive = handoff < 1 && onScreen;


  const scene = useMemo(
    () => (
      <>
        <Suspense fallback={null}>
          <Studio />
          <Macbook progressRef={progressRef} />
          <BakeShadows />
        </Suspense>
        <CameraRig progressRef={progressRef} />
      </>
    ),
    []
  );

  return (
    <section ref={sectionRef} id="top" style={{ position: "relative", height: HERO_VH + "vh" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          /* Neutral, ending on --s-1 exactly so the hero and the page under
             it share an edge colour and the fold is seamless.
             There was an accent bloom layered over this. It has gone: tinting
             the ground with the accent is what stopped the accent reading as
             one. The lift behind the machine now comes from the ramp itself --
             --s-3 at the centre falling to --s-0 at the corners -- which
             separates a black chassis from a black ground without spending
             any colour to do it. */
          background:
            "radial-gradient(ellipse 80% 60% at 50% 55%, var(--s-3) 0%, var(--s-2) 38%, var(--s-1) 70%, var(--s-0) 100%)",
        }}
      >
        {/* 3D Scene with 3D Macbook */}
        <div ref={laptopLayerRef} style={{ position: "absolute", inset: 0, opacity: 1 - handoff, zIndex: 2 }}>
          <Canvas
            shadows
            frameloop={laptopLive ? "always" : "never"}
            dpr={[1, 1.75]}
            gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
            camera={{ position: WIDE_POS, fov: 32, near: 0.01, far: 40 }}
          >
            {scene}
          </Canvas>
        </div>

        {/* Main Title on top before scroll */}
        <HeroCompanyTitle boxRef={titleBoxRef} wordLRef={wordLRef} wordRRef={wordRRef} />

        {/* The point cloud half, revealed once the display fills the frame.
            Mounted from the start so its buffers are built and uploaded before
            the viewer arrives; `visible` parks its render loop until then. */}
        <div style={{ position: "absolute", inset: 0, opacity: handoff, visibility: handoff > 0 ? "visible" : "hidden", pointerEvents: handoff > 0.5 ? "auto" : "none", zIndex: 20 }}>
          <ScreenPage width={vw + "px"} height={vh + "px"} scale={1} progressRef={seqRef} visible={cloudLive} />
        </div>


        <div className="nx-spin-slot" ref={spinSlotRef}>
          <SpinBadge />
        </div>

        {/* Scroll hint */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: 1 - fade(flyP, 0.02, 0.16), pointerEvents: "none", zIndex: 10 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--muted)" }}>Scroll to enter</span>
          <span style={{ width: 1, height: 30, background: "linear-gradient(var(--a-6),transparent)", animation: "nx-hint 2.2s ease-in-out infinite" }} />
        </div>
      </div>
    </section>
  );
}

