import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";

const require = createRequire(import.meta.url);
const ffmpegPath: string | null = (() => {
  try {
    return require("ffmpeg-static") as string;
  } catch {
    return null;
  }
})();

export interface StitchInput {
  clips: string[];
  width?: number;
  height?: number;
  fps?: number;
  /** Optional title card text shown for 2 seconds before the story. */
  title?: string;
  /** Optional crossfade seconds between clips (0 = hard cut). */
  crossfade?: number;
}

export interface StitchResult {
  id: string;
  file: string;
  bytes: number;
}

export function stitchAvailable(): boolean {
  return !!ffmpegPath;
}

/** Download every clip, normalise them to one size, concatenate with audio, write an mp4. */
export async function stitchClips(input: StitchInput): Promise<StitchResult> {
  if (!ffmpegPath) throw new Error("ffmpeg-static is not installed on this server");
  if (!input.clips.length) throw new Error("No clips supplied");
  const id = randomUUID();
  const work = join(config.outputDir, "work", id);
  await mkdir(work, { recursive: true });
  await mkdir(config.outputDir, { recursive: true });

  const files: string[] = [];
  for (let i = 0; i < input.clips.length; i++) {
    const res = await fetch(input.clips[i]);
    if (!res.ok) throw new Error(`Clip ${i + 1} download failed: HTTP ${res.status}`);
    const file = join(work, `clip${i}.mp4`);
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
    files.push(file);
  }
  const hasAudio = await Promise.all(files.map(probeHasAudio));

  const W = input.width ?? 1280;
  const H = input.height ?? 720;
  const fps = input.fps ?? 24;
  const args: string[] = ["-y", "-hide_banner", "-loglevel", "error"];
  files.forEach((f) => args.push("-i", f));
  // silent audio source used for any clip that has no audio stream
  args.push("-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000");
  const silentIdx = files.length;

  const filters: string[] = [];
  const concatInputs: string[] = [];
  for (let i = 0; i < files.length; i++) {
    filters.push(
      `[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps},format=yuv420p[v${i}]`,
    );
    if (hasAudio[i]) {
      filters.push(`[${i}:a]aresample=48000,aformat=channel_layouts=stereo[a${i}]`);
    } else {
      filters.push(`[${silentIdx}:a]atrim=0:${await probeDuration(files[i])},asetpts=PTS-STARTPTS[a${i}]`);
    }
    concatInputs.push(`[v${i}][a${i}]`);
  }
  filters.push(`${concatInputs.join("")}concat=n=${files.length}:v=1:a=1[vout][aout]`);

  const out = join(config.outputDir, `story-${id}.mp4`);
  args.push(
    "-filter_complex", filters.join(";"),
    "-map", "[vout]", "-map", "[aout]",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
    "-c:a", "aac", "-b:a", "160k",
    "-movflags", "+faststart",
    "-shortest",
    out,
  );
  await run(ffmpegPath, args);
  await rm(work, { recursive: true, force: true });
  const { size } = await import("node:fs/promises").then((m) => m.stat(out));
  return { id, file: out, bytes: size };
}

async function probeHasAudio(file: string): Promise<boolean> {
  const info = await run(ffmpegPath!, ["-hide_banner", "-i", file], true);
  return /Stream #\d+:\d+.*Audio:/.test(info);
}

async function probeDuration(file: string): Promise<number> {
  const info = await run(ffmpegPath!, ["-hide_banner", "-i", file], true);
  const m = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(info);
  if (!m) return 5;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

function run(cmd: string, args: string[], ignoreExit = false): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { windowsHide: true });
    let err = "";
    let outp = "";
    p.stdout.on("data", (d) => (outp += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0 || ignoreExit) resolve(outp + err);
      else reject(new Error(`ffmpeg exited ${code}: ${err.slice(-800)}`));
    });
  });
}
