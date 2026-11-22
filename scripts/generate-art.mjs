#!/usr/bin/env node
// Generates Visper's decorative watercolor art with the Venice image API.
//
//   VENICE_API_KEY=... node scripts/generate-art.mjs            # all assets
//   VENICE_API_KEY=... node scripts/generate-art.mjs bg-mobile   # just one
//
// Raw outputs land in public/art/_raw/ (git-ignored); run
// `python3 scripts/optimize-art.py` afterwards to produce the small WebP files
// the app actually loads from public/art/.
import fs from "node:fs/promises";
import path from "node:path";

const API = "https://api.venice.ai/api/v1/image/generate";
const MODEL = process.env.VENICE_IMAGE_MODEL || "flux-3-image";
const OUT_DIR = path.join(process.cwd(), "public", "art", "_raw");

// Shared style so every asset matches the existing logo.
const STYLE =
  "soft watercolor illustration on textured cold-press paper, pastel mint, aqua, " +
  "lavender and blush pink washes, delicate gold ink accents and tiny gold stars, " +
  "airy and dreamy, gentle bleeding edges, lots of clean white space, calm and cozy";
const NEGATIVE =
  "text, letters, words, watermark, signature, logo, harsh shadows, photorealistic, " +
  "dark colors, neon, cluttered, frame, border";

export const ASSETS = [
  {
    name: "bg-mobile",
    aspect_ratio: "9:16",
    prompt:
      "Abstract background wash, very light and mostly white paper, soft mint and aqua " +
      "watercolor blooms drifting from the top corners, lavender and blush pink blooms near " +
      "the bottom, a few scattered tiny gold specks, no objects, " + STYLE,
  },
  {
    name: "bg-desktop",
    aspect_ratio: "16:9",
    prompt:
      "Abstract wide background wash, very light and mostly white paper, soft mint and aqua " +
      "watercolor blooms on the left, lavender and blush pink blooms on the right, a few " +
      "scattered tiny gold specks, no objects, " + STYLE,
  },
  {
    name: "hero",
    aspect_ratio: "4:5",
    prompt:
      "An open journal resting on a windowsill at dawn, little clouds and a crescent moon " +
      "floating out of its pages, a feather quill beside it, a small steaming cup of tea, " +
      "centered composition, " + STYLE,
  },
  {
    name: "empty-journal",
    aspect_ratio: "1:1",
    prompt:
      "A single blank open notebook with a feather quill and a tiny sprig of eucalyptus, " +
      "centered small vignette on plain white paper, " + STYLE,
  },
  {
    name: "empty-gallery",
    aspect_ratio: "1:1",
    prompt:
      "Three loose instant photographs gently scattered, each showing a simple pastel " +
      "landscape (a hill, the sea, a flower), centered small vignette on plain white paper, " +
      STYLE,
  },
  {
    name: "ask",
    aspect_ratio: "1:1",
    prompt:
      "A small glowing paper lantern with a soft cloud of tiny stars and thought bubbles " +
      "rising from it, centered small vignette on plain white paper, " + STYLE,
  },
  {
    name: "reflect",
    aspect_ratio: "1:1",
    prompt:
      "A crescent moon and a rising sun sharing the same pastel sky over calm water, a " +
      "tiny paper boat, centered small vignette on plain white paper, " + STYLE,
  },
  {
    name: "offline",
    aspect_ratio: "1:1",
    prompt:
      "A tiny paper airplane resting on a soft cloud, waiting, a few small stars, centered " +
      "small vignette on plain white paper, " + STYLE,
  },
  {
    name: "link",
    aspect_ratio: "1:1",
    prompt:
      "An open book with a ribbon bookmark and a few loose pages gently floating upward, " +
      "centered small vignette on plain white paper, " + STYLE,
  },
];

async function generate(asset) {
  const res = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.VENICE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      prompt: asset.prompt,
      negative_prompt: NEGATIVE,
      aspect_ratio: asset.aspect_ratio,
      format: "png",
      safe_mode: true,
      hide_watermark: true,
      return_binary: true,
    }),
  });
  if (!res.ok) {
    throw new Error(`${asset.name}: ${res.status} ${await res.text()}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const file = path.join(OUT_DIR, `${asset.name}.png`);
  await fs.writeFile(file, buf);
  console.log(`✓ ${asset.name} -> ${path.relative(process.cwd(), file)} (${buf.length} bytes)`);
}

async function main() {
  if (!process.env.VENICE_API_KEY) {
    console.error("Set VENICE_API_KEY first.");
    process.exit(1);
  }
  await fs.mkdir(OUT_DIR, { recursive: true });
  const only = process.argv.slice(2);
  const todo = only.length ? ASSETS.filter((a) => only.includes(a.name)) : ASSETS;
  const results = await Promise.allSettled(todo.map(generate));
  const failed = results.filter((r) => r.status === "rejected");
  failed.forEach((r) => console.error("✗", r.reason?.message || r.reason));
  process.exit(failed.length ? 1 : 0);
}

main();
