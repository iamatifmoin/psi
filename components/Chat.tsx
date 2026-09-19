"use client";

import { useEffect, useRef, useState } from "react";
import { ToastProvider, useToast } from "@/components/Toast";

type Transcript = { start: number; end: number; text: string };
type Clip = { start_time: number; end_time: number; result_start_time: number; label?: string };
const STEPS = ["Preparing media", "Analyzing audio", "Scanning visuals", "Consulting AI director", "Writing narration", "Rendering highlight"];

export default function Chat() { return <ToastProvider><Studio /></ToastProvider>; }

function Studio() {
  const toast = useToast();
  const sourceRef = useRef<HTMLVideoElement>(null);
  const resultRef = useRef<HTMLVideoElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [transcript, setTranscript] = useState<Transcript[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [scripts, setScripts] = useState({ intro: "", outro: "" });
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => () => { if (sourceUrl) URL.revokeObjectURL(sourceUrl); }, [sourceUrl]);
  useEffect(() => { if (!busy) return; const timer = setInterval(() => setStep((current) => Math.min(current + 1, STEPS.length - 1)), 4500); return () => clearInterval(timer); }, [busy]);

  function choose(next: File | undefined) {
    if (!next) return;
    if (next.type !== "video/mp4" && !next.name.toLowerCase().endsWith(".mp4")) { toast({ title: "MP4 required", message: "Choose a short MP4 gameplay video.", variant: "info" }); return; }
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setFile(next); setSourceUrl(URL.createObjectURL(next)); setResultUrl(""); setTranscript([]); setClips([]); setScripts({ intro: "", outro: "" });
  }

  async function generate() {
    if (!file || busy) return;
    setBusy(true); setStep(0);
    try {
      const form = new FormData(); form.append("video", file);
      const response = await fetch("/api/generate-video", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Video generation failed.");
      setResultUrl(data.videoUrl); setTranscript(data.transcript || []); setClips(data.clips || []); setScripts({ intro: data.introNarration || "", outro: data.outroNarration || "" });
    } catch (error) { toast({ title: "Generation failed", message: error instanceof Error ? error.message : "Try another short MP4.", variant: "app" }); }
    finally { setBusy(false); }
  }

  function seek(video: HTMLVideoElement | null, time: number) { if (!video) return; video.currentTime = time; video.play().catch(() => undefined); }

  return <main className="relative min-h-dvh overflow-hidden px-3 py-3 sm:px-6 sm:py-6"><div className="pointer-events-none absolute left-[-5rem] top-[-5rem] h-64 w-64 rounded-full bg-sun/35 blur-3xl" /><div className="pointer-events-none absolute right-[-5rem] top-20 h-72 w-72 rounded-full bg-sky/25 blur-3xl" /><div className="relative mx-auto max-w-6xl">
    <header className="mb-5 flex flex-col gap-3 rounded-3xl border border-black/10 bg-white/70 p-5 shadow-[0_16px_48px_rgba(60,35,15,0.1)] backdrop-blur-xl sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] uppercase tracking-[0.3em] text-ink-soft">AI Director&apos;s Cut</p><h1 className="mt-2 font-display text-4xl leading-none sm:text-6xl">Find the moment.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-ink-soft">Drop in gameplay. The director listens, watches, and cuts a short highlight reel with its own narration.</p></div><div className="flex flex-wrap gap-2 text-[10px] font-medium"><span className="rounded-full bg-mint/60 px-3 py-1.5">Transcript-aware</span><span className="rounded-full bg-sun/70 px-3 py-1.5">Local studio</span><span className="rounded-full bg-sky/40 px-3 py-1.5">AI narrated</span></div></header>
    <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]"><div className="rounded-3xl border border-black/10 bg-paper/80 p-4 shadow-[0_16px_48px_rgba(60,35,15,0.08)] sm:p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.25em] text-ink-soft">01 / Source</p><h2 className="mt-1 text-xl font-semibold">Upload gameplay</h2></div><span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] text-ink-soft">MP4 only</span></div><label onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files?.[0]); }} className={`mt-5 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-5 text-center transition ${dragging ? "border-punch bg-punch/10" : "border-black/20 bg-white/55 hover:border-punch/60 hover:bg-white/80"}`}><input type="file" accept="video/mp4,.mp4" className="sr-only" onChange={(event) => choose(event.target.files?.[0])} /><span className="text-3xl">⌁</span><span className="mt-3 text-sm font-medium">{file ? file.name : "Drop a gameplay MP4 here or choose a file"}</span><span className="mt-1 text-xs text-ink-soft">Keep it short for a fast demo</span></label>{sourceUrl && <video ref={sourceRef} controls className="mt-4 aspect-video w-full rounded-2xl bg-black" src={sourceUrl} />}<button type="button" onClick={generate} disabled={!file || busy} className="mt-4 w-full rounded-2xl bg-[#111] px-4 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40">{busy ? STEPS[step] + "..." : "Generate highlight"}</button>{busy && <div className="mt-4 flex gap-1.5">{STEPS.map((label, index) => <span key={label} title={label} className={`h-1.5 flex-1 rounded-full ${index <= step ? "bg-punch" : "bg-black/10"}`} />)}</div>}</div>
      <div className="rounded-3xl border border-black/10 bg-white/70 p-4 shadow-[0_16px_48px_rgba(60,35,15,0.08)] sm:p-5"><div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-[0.25em] text-ink-soft">02 / Result</p><h2 className="mt-1 text-xl font-semibold">Director&apos;s cut</h2></div>{resultUrl && <a href={resultUrl} download className="rounded-full bg-punch px-3 py-1.5 text-[10px] font-semibold text-white">Download MP4</a>}</div>{resultUrl ? <video ref={resultRef} controls className="mt-5 aspect-video w-full rounded-2xl bg-black" src={resultUrl} /> : <div className="mt-5 flex aspect-video items-center justify-center rounded-2xl bg-black/[0.04] text-center text-sm text-ink-soft">Your finished reel will land here.</div>}{(scripts.intro || scripts.outro) && <div className="mt-5 grid gap-3 sm:grid-cols-2"><ScriptCard title="Intro narration" text={scripts.intro} /><ScriptCard title="Outro narration" text={scripts.outro} /></div>}{clips.length > 0 && <div className="mt-5"><p className="text-[10px] uppercase tracking-[0.25em] text-ink-soft">Selected moments</p><div className="mt-2 flex flex-wrap gap-2">{clips.map((clip, index) => <button key={`${clip.start_time}-${index}`} type="button" onClick={() => seek(resultRef.current, clip.result_start_time)} className="rounded-full border border-black/10 bg-paper px-3 py-1.5 text-xs transition hover:border-punch/50">{formatTime(clip.start_time)}–{formatTime(clip.end_time)}{clip.label ? ` · ${clip.label}` : ` · Clip ${index + 1}`}</button>)}</div></div>}</div></section>
    {transcript.length > 0 && <section className="mt-5 rounded-3xl border border-black/10 bg-paper/80 p-4 shadow-[0_16px_48px_rgba(60,35,15,0.08)] sm:p-5"><div><p className="text-[10px] uppercase tracking-[0.25em] text-ink-soft">03 / Timeline</p><h2 className="mt-1 text-xl font-semibold">Transcript</h2></div><div className="mt-4 grid max-h-72 gap-1 overflow-y-auto pr-1 sm:grid-cols-2">{transcript.map((segment, index) => <button key={`${segment.start}-${index}`} type="button" onClick={() => seek(sourceRef.current, segment.start)} className="flex gap-3 rounded-xl p-2 text-left transition hover:bg-white"><span className="shrink-0 font-mono text-[10px] text-punch">{formatTime(segment.start)}</span><span className="text-xs leading-5 text-foreground/80">{segment.text}</span></button>)}</div></section>}
  </div></main>;
}

function ScriptCard({ title, text }: { title: string; text: string }) { return <div className="rounded-2xl bg-paper p-3"><p className="text-[10px] uppercase tracking-[0.18em] text-ink-soft">{title}</p><p className="mt-2 text-xs leading-5">{text}</p></div>; }
function formatTime(seconds: number) { const value = Math.max(0, Math.floor(seconds)); return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`; }
