"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

import { createRenderer } from "./agent-radiance-cascades-utils/renderer";

export type RadianceCascadesProps = {
  /** Load progress in [0, 1], read every animation frame. Omit for a self-running loop. */
  getProgress?: () => number;
  /** Freeze ambient motion (orbiting occluders, shimmer); the progress fill still animates. */
  reducedMotion?: boolean;
  /** Caption under the letter. Pass an empty string to hide it. */
  label?: string;
  className?: string;
};

export function Example({
  getProgress,
  reducedMotion = false,
  label = "radiance cascade loading field",
  className,
}: RadianceCascadesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* Read through a ref so a parent passing a fresh arrow function every render
     does not tear down and rebuild the WebGL context each time. */
  const progressRef = useRef(getProgress);
  progressRef.current = getProgress;
  const hasProgress = getProgress !== undefined;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createRenderer({
      canvas,
      getProgress: hasProgress ? () => progressRef.current?.() ?? 0 : undefined,
      reducedMotion,
    });
    void renderer.ready;
    return () => renderer.dispose();
  }, [hasProgress, reducedMotion]);

  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-black", className)}>
      <canvas ref={canvasRef} className="block h-full w-full" />
      {label && (
        <div
          className={
            "pointer-events-none absolute bottom-[18px] left-1/2 z-[2] " +
            "-translate-x-1/2 text-[10px] font-medium uppercase tracking-[.16em] text-white/45"
          }
        >
          {label}
        </div>
      )}
    </div>
  );
}

export default Example;
