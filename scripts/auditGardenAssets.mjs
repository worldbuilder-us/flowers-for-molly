import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST_FILES = [
  "src/app/garden/manifests/meadow.json",
  "src/app/garden/manifests/forest.json",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, filePath), "utf8"));
}

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

function formatRatio(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

function relative(filePath) {
  return path.relative(ROOT, filePath);
}

function deliveryBucket(role, repeatX, renderMax) {
  if (repeatX) return "repeat-strip";
  if (role === "SKYBOX") return "skybox";
  if (role === "BACKGROUND_FAR") return "background-far";
  if (role === "BACKGROUND_NEAR" || role === "MIDDLEGROUND") {
    if (renderMax <= 320) return "midground-small";
    if (renderMax <= 640) return "midground-medium";
    return "midground-large";
  }
  if (renderMax <= 256) return "foreground-small";
  if (renderMax <= 768) return "foreground-medium";
  return "foreground-large";
}

const manifests = MANIFEST_FILES.map(readJson);
const assetRows = [];

for (const manifest of manifests) {
  for (const group of manifest.groups) {
    const groupScale = group.scale ?? 1;
    const repeatX = group.repeatX ?? false;

    for (const asset of group.assets) {
      const filePath = path.join(
        ROOT,
        "public",
        manifest.assetBasePath.replace(/^\/+/, ""),
        group.folder,
        `${asset.name}_${asset.index}.png`,
      );

      const stats = fs.statSync(filePath);
      const source = readPngDimensions(filePath);
      const effectiveScale = groupScale * (asset.scaleMultiplier ?? 1);
      const renderWidthAt1024 = asset.width * effectiveScale;
      const renderHeightAt1024 = asset.height * effectiveScale;
      const renderMax = Math.max(renderWidthAt1024, renderHeightAt1024);

      assetRows.push({
        file: relative(filePath),
        role: group.role,
        groupId: group.id,
        repeatX,
        sourceWidth: source.width,
        sourceHeight: source.height,
        sourcePixels: source.width * source.height,
        bytes: stats.size,
        manifestWidth: asset.width,
        manifestHeight: asset.height,
        effectiveScale,
        renderWidthAt1024,
        renderHeightAt1024,
        renderPixelsAt1024: renderWidthAt1024 * renderHeightAt1024,
        oversupplyRatio:
          (source.width * source.height) /
          Math.max(1, renderWidthAt1024 * renderHeightAt1024),
        bucket: deliveryBucket(group.role, repeatX, renderMax),
      });
    }
  }
}

assetRows.sort((a, b) => b.oversupplyRatio - a.oversupplyRatio);

const byBucket = new Map();
const byRole = new Map();

for (const row of assetRows) {
  const bucketStats =
    byBucket.get(row.bucket) ??
    {
      count: 0,
      totalBytes: 0,
      sourcePixels: 0,
      renderPixelsAt1024: 0,
      files: new Set(),
    };
  bucketStats.count += 1;
  bucketStats.totalBytes += row.bytes;
  bucketStats.sourcePixels += row.sourcePixels;
  bucketStats.renderPixelsAt1024 += row.renderPixelsAt1024;
  bucketStats.files.add(row.file);
  byBucket.set(row.bucket, bucketStats);

  const roleStats =
    byRole.get(row.role) ??
    {
      count: 0,
      totalBytes: 0,
      sourcePixels: 0,
      renderPixelsAt1024: 0,
      files: new Set(),
    };
  roleStats.count += 1;
  roleStats.totalBytes += row.bytes;
  roleStats.sourcePixels += row.sourcePixels;
  roleStats.renderPixelsAt1024 += row.renderPixelsAt1024;
  roleStats.files.add(row.file);
  byRole.set(row.role, roleStats);
}

const bucketSummary = [...byBucket.entries()]
  .map(([bucket, stats]) => ({
    bucket,
    count: stats.count,
    uniqueFiles: stats.files.size,
    compressedMB: (stats.totalBytes / 1024 / 1024).toFixed(2),
    oversupplyRatio: formatRatio(
      stats.sourcePixels / Math.max(1, stats.renderPixelsAt1024),
    ),
  }))
  .sort((a, b) => Number(b.oversupplyRatio) - Number(a.oversupplyRatio));

const roleSummary = [...byRole.entries()]
  .map(([role, stats]) => ({
    role,
    count: stats.count,
    uniqueFiles: stats.files.size,
    compressedMB: (stats.totalBytes / 1024 / 1024).toFixed(2),
    oversupplyRatio: formatRatio(
      stats.sourcePixels / Math.max(1, stats.renderPixelsAt1024),
    ),
  }))
  .sort((a, b) => Number(b.oversupplyRatio) - Number(a.oversupplyRatio));

const recommendations = assetRows
  .filter((row) => !row.repeatX)
  .slice(0, 30)
  .map((row) => ({
    file: row.file,
    role: row.role,
    bucket: row.bucket,
    compressedMB: (row.bytes / 1024 / 1024).toFixed(2),
    source: `${row.sourceWidth}x${row.sourceHeight}`,
    renderAt1024: `${row.renderWidthAt1024.toFixed(0)}x${row.renderHeightAt1024.toFixed(0)}`,
    oversupplyRatio: formatRatio(row.oversupplyRatio),
  }));

console.log("\n## AssetAuditSummary");
console.log(
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      totalRows: assetRows.length,
      bucketSummary,
      roleSummary,
    },
    null,
    2,
  ),
);

console.log("\n## TopOptimizationCandidates");
console.log(JSON.stringify(recommendations, null, 2));
