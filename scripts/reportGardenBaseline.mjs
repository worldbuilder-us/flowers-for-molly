import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST_FILES = [
  "src/app/garden/manifests/meadow.json",
  "src/app/garden/manifests/forest.json",
];
const GARDEN_ROOT = path.join(ROOT, "public", "garden");
const SOUND_ROOT = path.join(ROOT, "public", "sound");

function readJsonFile(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 100 || unit === 0 ? 0 : 2)} ${units[unit]}`;
}

function walk(dirPath, collector = []) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walk(entryPath, collector);
    } else {
      collector.push(entryPath);
    }
  }
  return collector;
}

function pngDimensions(filePath) {
  const file = fs.readFileSync(filePath);
  if (file.toString("ascii", 1, 4) !== "PNG") {
    throw new Error(`Expected PNG: ${filePath}`);
  }

  return {
    width: file.readUInt32BE(16),
    height: file.readUInt32BE(20),
  };
}

function relativeFromRoot(filePath) {
  return path.relative(ROOT, filePath) || ".";
}

function collectReferencedAssets(manifests) {
  const seen = new Map();
  const repeating = new Set();
  const nonRepeating = new Set();
  let positionedInstancesPerWorld = 0;

  for (const manifest of manifests) {
    for (const group of manifest.groups) {
      for (const asset of group.assets) {
        const publicPath = path.join(
          ROOT,
          "public",
          manifest.assetBasePath.replace(/^\/+/, ""),
          group.folder,
          `${asset.name}_${asset.index}.png`,
        );

        if (!seen.has(publicPath)) {
          const stats = fs.statSync(publicPath);
          const { width, height } = pngDimensions(publicPath);
          seen.set(publicPath, {
            file: relativeFromRoot(publicPath),
            compressedBytes: stats.size,
            decodedBytes: width * height * 4,
            width,
            height,
          });
        }

        if (group.repeatX) {
          repeating.add(publicPath);
        } else {
          nonRepeating.add(publicPath);
          positionedInstancesPerWorld += asset.xPositions?.length ?? 0;
        }
      }
    }
  }

  return {
    assets: [...seen.values()].sort(
      (left, right) => right.decodedBytes - left.decodedBytes,
    ),
    nonRepeatingSources: nonRepeating.size,
    repeatingSources: repeating.size,
    positionedInstancesPerWorld,
    renderedNonRepeatingNodesAcrossThreeSegments:
      positionedInstancesPerWorld * 3,
  };
}

function summarizeDirectory(dirPath, exts) {
  const files = walk(dirPath).filter((filePath) =>
    exts.has(path.extname(filePath).toLowerCase()),
  );

  let totalBytes = 0;
  for (const filePath of files) {
    totalBytes += fs.statSync(filePath).size;
  }

  return { count: files.length, totalBytes };
}

function summarizeAudio(dirPath) {
  return walk(dirPath)
    .filter((filePath) => /\.(mp3|wav|ogg)$/i.test(filePath))
    .map((filePath) => ({
      file: relativeFromRoot(filePath),
      bytes: fs.statSync(filePath).size,
    }))
    .sort((left, right) => right.bytes - left.bytes)
    .map((item) => ({
      file: item.file,
      size: formatBytes(item.bytes),
    }));
}

function printSection(title, data) {
  console.log(`\n## ${title}`);
  console.log(JSON.stringify(data, null, 2));
}

function main() {
  const manifests = MANIFEST_FILES.map((filePath) =>
    readJsonFile(path.join(ROOT, filePath)),
  );

  const worldSegmentWidth = manifests.reduce(
    (total, manifest) =>
      total + manifest.segmentWidth * (manifest.lengthInSegments ?? 1),
    0,
  );
  const totalGroups = manifests.reduce(
    (total, manifest) => total + manifest.groups.length,
    0,
  );

  const referenced = collectReferencedAssets(manifests);
  const gardenSummary = summarizeDirectory(
    GARDEN_ROOT,
    new Set([".png", ".jpg", ".jpeg", ".webp"]),
  );
  const soundSummary = summarizeDirectory(
    SOUND_ROOT,
    new Set([".mp3", ".wav", ".ogg"]),
  );

  printSection("World", {
    biomeIds: manifests.map((manifest) => manifest.id),
    worldSegmentWidth,
    totalGroups,
    totalReferencedSources: referenced.assets.length,
    nonRepeatingSources: referenced.nonRepeatingSources,
    repeatingSources: referenced.repeatingSources,
    positionedInstancesPerWorld: referenced.positionedInstancesPerWorld,
    renderedNonRepeatingNodesAcrossThreeSegments:
      referenced.renderedNonRepeatingNodesAcrossThreeSegments,
  });

  printSection("ReferencedAssetFootprint", {
    compressed: formatBytes(
      referenced.assets.reduce((sum, asset) => sum + asset.compressedBytes, 0),
    ),
    decodedRGBA: formatBytes(
      referenced.assets.reduce((sum, asset) => sum + asset.decodedBytes, 0),
    ),
    largestDecoded: referenced.assets.slice(0, 15).map((asset) => ({
      file: asset.file,
      dimensions: `${asset.width}x${asset.height}`,
      compressed: formatBytes(asset.compressedBytes),
      decodedRGBA: formatBytes(asset.decodedBytes),
    })),
  });

  printSection("PublicDirectoryFootprint", {
    gardenFiles: gardenSummary.count,
    gardenCompressed: formatBytes(gardenSummary.totalBytes),
    soundFiles: soundSummary.count,
    soundCompressed: formatBytes(soundSummary.totalBytes),
  });

  printSection("AudioAssets", {
    files: summarizeAudio(SOUND_ROOT),
  });

  printSection("Environment", {
    cwd: ROOT,
    node: process.version,
    generatedAt: new Date().toISOString(),
  });
}

main();
