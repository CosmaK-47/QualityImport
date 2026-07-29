"use client";

import { useEffect, useRef, useState } from "react";

type AnimationConfig = {
  enabled: boolean;
  poster: string | null;
  video: string | null;
  frames: string[];
  scrollLength: number;
  alt: string;
};

function StageChrome() {
  return <>
    <div className="stage-grid" />
    <span className="stage-label stage-label-top">QI INSPECTED</span>
    <span className="stage-label stage-label-right">IN STOCK</span>
    <span className="stage-label stage-label-bottom">SELECTED PREORDER</span>
    <span className="stage-number">01</span>
    <span className="stage-orbit" />
  </>;
}

function StaticGarment() {
  return <div className="garment garment-jacket" aria-hidden="true">
    <span className="garment-body" /><span className="garment-sleeve garment-sleeve-left" />
    <span className="garment-sleeve garment-sleeve-right" /><span className="garment-zip" />
    <span className="garment-tag">QI</span>
  </div>;
}

export default function ScrollHeroStage({ animation }: { animation: AnimationConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadedFrames = useRef<Array<HTMLImageElement | null>>([]);
  const raf = useRef(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!animation.enabled) return;
    const videoElement = videoRef.current;
    const stage = canvasRef.current?.closest(".hero") ?? videoElement?.closest(".hero");
    if (!stage) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || window.matchMedia("(max-width: 800px)").matches) return;

    const progress = () => {
      const rect = stage.getBoundingClientRect();
      return Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height - window.innerHeight)));
    };
    const drawCover = (context: CanvasRenderingContext2D, image: CanvasImageSource, sourceWidth: number, sourceHeight: number) => {
      const canvas = context.canvas; const scale = Math.max(canvas.width / sourceWidth, canvas.height / sourceHeight);
      const width = sourceWidth * scale; const height = sourceHeight * scale;
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    };
    const render = () => {
      raf.current = 0;
      if (animation.frames.length > 1 && canvasRef.current) {
        const canvas = canvasRef.current; const ratio = Math.min(2, window.devicePixelRatio || 1);
        const width = Math.max(1, Math.round(canvas.clientWidth * ratio)); const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
        if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
        const wanted = Math.round(progress() * (animation.frames.length - 1));
        let frame = loadedFrames.current[wanted];
        if (!frame) for (let offset = 1; offset < animation.frames.length && !frame; offset++) frame = loadedFrames.current[Math.max(0, wanted - offset)] ?? loadedFrames.current[Math.min(animation.frames.length - 1, wanted + offset)];
        const context = canvas.getContext("2d"); if (context && frame) drawCover(context, frame, frame.naturalWidth, frame.naturalHeight);
      } else if (videoElement && videoElement.duration) {
        const target = progress() * Math.max(0, videoElement.duration - 0.04);
        if (Math.abs(videoElement.currentTime - target) > 0.025) videoElement.currentTime = target;
      }
    };
    const requestRender = () => { if (!raf.current) raf.current = window.requestAnimationFrame(render); };

    let videoReadyHandler: (() => void) | null = null;
    if (animation.frames.length > 1) {
      loadedFrames.current = Array(animation.frames.length).fill(null);
      animation.frames.forEach((source, index) => {
        const image = new Image(); image.decoding = "async"; image.src = source;
        image.onload = () => { loadedFrames.current[index] = image; if (index === 0) setReady(true); requestRender(); };
      });
    } else if (videoElement) {
      videoReadyHandler = () => { setReady(true); requestRender(); };
      videoElement.addEventListener("loadedmetadata", videoReadyHandler); videoElement.load();
    }
    window.addEventListener("scroll", requestRender, { passive: true }); window.addEventListener("resize", requestRender);
    requestRender();
    return () => { window.removeEventListener("scroll", requestRender); window.removeEventListener("resize", requestRender); if (videoReadyHandler && videoElement) videoElement.removeEventListener("loadedmetadata", videoReadyHandler); if (raf.current) cancelAnimationFrame(raf.current); };
  }, [animation]);

  if (!animation.enabled) return <div className="hero-stage" aria-label={animation.alt}><StageChrome /><StaticGarment /></div>;
  const style = animation.poster ? { backgroundImage: `url(${animation.poster})` } : undefined;
  return <div className={`hero-stage hero-stage-cinematic ${ready ? "is-ready" : ""}`} aria-label={animation.alt} style={style}>
    {animation.frames.length > 1 ? <canvas ref={canvasRef} className="hero-sequence" aria-hidden="true" /> : animation.video ? <video ref={videoRef} className="hero-sequence" src={animation.video} muted playsInline preload="auto" aria-hidden="true" /> : null}
    <StageChrome />
    {!animation.poster && !ready && <StaticGarment />}
    <span className="scroll-cue" aria-hidden="true">SCROLL TO INSPECT <i>↓</i></span>
  </div>;
}
