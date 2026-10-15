// Renders index.html frame by frame into hikari-pub.mp4 (1080p30 + music).
// Usage: node promo/hikari/render.mjs   (needs playwright + ffmpeg)
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "playwright");
const FPS = 30;
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
const browser = await chromium.launch({ proxy, args: ["--ignore-certificate-errors"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto(pathToFileURL(join(here, "index.html")).href + "?render");
await page.evaluate(() => window.__film.fontsReady);
await page.evaluate(() => document.fonts.ready);

const tmp = mkdtempSync(join(tmpdir(), "hikari-"));
const wav = join(tmp, "music.wav");
writeFileSync(wav, Buffer.from(await page.evaluate(async () => window.__film.wavBase64(await window.__film.renderMusic())), "base64"));

const dur = await page.evaluate(() => window.__film.DUR);
const out = join(here, "hikari-pub.mp4");
const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", "-i", wav,
  "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", out], { stdio: ["pipe", "inherit", "inherit"] });
const total = dur * FPS;
for (let f = 0; f < total; f++) {
  const b64 = await page.evaluate(t => { window.__film.draw(t); return document.getElementById("film").toDataURL("image/jpeg", 0.92).split(",")[1]; }, f / FPS);
  if (!ff.stdin.write(Buffer.from(b64, "base64"))) await new Promise(r => ff.stdin.once("drain", r));
  if (f % 150 === 0) console.log(`frame ${f}/${total}`);
}
ff.stdin.end();
await new Promise(r => ff.on("close", r));
await browser.close();
console.log("wrote", out);
