import { useMemo } from "react";
import useZoomProgress, { fade } from "./hooks/useZoomProgress.js";
import useLenis from "./hooks/useLenis.js";
import { SEQ_START } from "./components/three/cameraPath.js";
import AnimationLoader from "./components/AnimationLoader.jsx";
import Header from "./components/Header.jsx";
import Hero3D from "./components/Hero3D.jsx";
import About from "./components/About.jsx";
import Inversion from "./components/Inversion.jsx";
import Capabilities from "./components/Capabilities.jsx";
import Approach from "./components/Approach.jsx";
import Skills from "./components/Skills.jsx";
import TextVideoMask from "./components/TextVideoMask.jsx";
import Contact from "./components/Contact.jsx";
import Footer from "./components/Footer.jsx";

export default function App() {
  useLenis();
  const [zoomRef, { p, exit, vw, vh }] = useZoomProgress();

  // Nav fades in once the laptop hands off to the sequence. It used to key off
  // p 0.90->0.98, which on the longer hero would leave the nav hidden for five
  // viewports of scrolling.
  const chrome = fade(p, SEQ_START + 0.01, SEQ_START + 0.15);

  const sections = useMemo(
    () => (
      <>
        <About />
        <Inversion />
        <Capabilities />
        <Approach />
        <Skills />
        <Contact />
        {/* Sign-off band, and it comes after the contact section rather than
            before it. The name is the only thing on it, and it is cut out of
            moving footage rather than set in ink -- so the page ends on the
            subject moving through the mark, after the ask, instead of putting
            a second full-height statement between the work and the ask. */}
        <section style={{ borderTop: "1px solid var(--hairline)" }}>
          <TextVideoMask
            src="/video/mancoding.mp4"
            text={"NEXIRA\nINTELLIX"}
            style={{ height: "clamp(280px,48vh,520px)" }}
          />
        </section>
        <Footer />
      </>
    ),
    []
  );

  return (
    <div style={{ minHeight: "100vh", overflowX: "clip", position: "relative" }}>
      {/* Above everything, including the fixed header, and outside the hero's
          sticky box -- scoped in there it could only ever cover the hero, and
          the nav painted straight over the top of it. */}
      <AnimationLoader />
      <Header navOpacity={chrome} solid={exit} />
      <Hero3D sectionRef={zoomRef} p={p} exit={exit} vw={vw} vh={vh} />
      {sections}
    </div>
  );
}
