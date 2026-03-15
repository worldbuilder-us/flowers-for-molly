import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = process.cwd();

const NEXT_WAVE = [
  {
    file: "public/garden/meadow_background/scenery/rocksflowers_0.png",
    bucket: "midground-small",
    maxRenderAt1024: 252,
  },
  {
    file: "public/garden/meadow_background/scenery/willow_0.png",
    bucket: "midground-small",
    maxRenderAt1024: 240,
  },
  {
    file: "public/garden/meadow_background/scenery/floral_cluster_5.png",
    bucket: "midground-small",
    maxRenderAt1024: 307,
  },
  {
    file: "public/garden/meadow_background/scenery/rock_4.png",
    bucket: "midground-small",
    maxRenderAt1024: 168,
  },
  {
    file: "public/garden/meadow_background/scenery/butterfly_0.png",
    bucket: "midground-small",
    maxRenderAt1024: 180,
  },
  {
    file: "public/garden/meadow_background/scenery/bumblebee_0.png",
    bucket: "midground-small",
    maxRenderAt1024: 180,
  },
];

function readPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.toString("ascii", 1, 4) !== "PNG") {
    throw new Error(`Expected PNG: ${filePath}`);
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function roundUpToGrid(value, grid = 64) {
  return Math.ceil(value / grid) * grid;
}

function factorForBucket(bucket) {
  switch (bucket) {
    case "foreground-small":
    case "midground-small":
      return 4;
    case "foreground-medium":
    case "midground-medium":
      return 3;
    default:
      return 2.5;
  }
}

function targetLongEdge(asset) {
  const minFloor = asset.bucket.includes("small") ? 384 : 768;
  const scaled = asset.maxRenderAt1024 * factorForBucket(asset.bucket);
  return roundUpToGrid(Math.max(minFloor, scaled));
}

function formatMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(2);
}

function optimizeAsset(asset) {
  const absolute = path.join(ROOT, asset.file);
  const beforeStat = fs.statSync(absolute);
  const beforeDims = readPngDimensions(absolute);
  const tmpFile = `${absolute}.tmp`;
  const longEdge = targetLongEdge(asset);

  execFileSync("magick", [
    absolute,
    "-filter",
    "Lanczos",
    "-resize",
    `${longEdge}x${longEdge}>`,
    "-strip",
    "-define",
    "png:compression-level=9",
    "-define",
    "png:compression-filter=5",
    "-define",
    "png:compression-strategy=1",
    tmpFile,
  ]);

  fs.renameSync(tmpFile, absolute);

  const afterStat = fs.statSync(absolute);
  const afterDims = readPngDimensions(absolute);

  return {
    file: asset.file,
    bucket: asset.bucket,
    targetLongEdge: longEdge,
    before: {
      dimensions: `${beforeDims.width}x${beforeDims.height}`,
      mb: formatMB(beforeStat.size),
    },
    after: {
      dimensions: `${afterDims.width}x${afterDims.height}`,
      mb: formatMB(afterStat.size),
    },
    savedMB: formatMB(beforeStat.size - afterStat.size),
  };
}

const results = NEXT_WAVE.map(optimizeAsset);
console.log(JSON.stringify({ optimized: results }, null, 2));
