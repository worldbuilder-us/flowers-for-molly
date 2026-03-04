#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const CULL_PAD_PX = 320;
const LOAD_HIGH_PRIORITY_PAD_PX = 96;
const LOAD_EAGER_PAD_PX = 224;
const PREFETCH_LOOKAHEAD_PX = 1440;
const PREFETCH_ENQUEUE_PER_STEP = 6;
const PREFETCH_DECODES_PER_STEP = 1;
const STEP_SIZE_LOGICAL = 64;

const ROLE_PARALLAX = {
  FOREGROUND_1: 0.8,
  FOREGROUND_2: 0.85,
  FOREGROUND_3: 0.88,
  MIDDLEGROUND: 0.9,
  BACKGROUND_NEAR: 0.93,
  BACKGROUND_FAR: 0.96,
  SKYBOX: 0.98,
};

const ROOT = process.cwd();
const manifestPaths = [
  "src/app/garden/manifests/meadow.json",
  "src/app/garden/manifests/forest.json",
];

function parsePngDimensions(buffer) {
  if (!buffer || buffer.length < 24) return null;
  if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function distanceToViewport(left, right, visibleLeft, visibleRight) {
  if (right < visibleLeft) return visibleLeft - right;
  if (left > visibleRight) return left - visibleRight;
  return 0;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor(sorted.length * p))
  );
  return sorted[index];
}

function summarizeSeries(series, warmStartCutoff) {
  const sum = series.reduce((acc, v) => acc + v, 0);
  const avg = series.length ? sum / series.length : 0;
  const sliced = series.slice(Math.min(warmStartCutoff, series.length));
  const warmSum = sliced.reduce((acc, v) => acc + v, 0);
  const warmAvg = sliced.length ? warmSum / sliced.length : 0;
  return {
    avg,
    max: series.length ? Math.max(...series) : 0,
    p95: percentile(series, 0.95),
    warmAvg,
    warmMax: sliced.length ? Math.max(...sliced) : 0,
    warmP95: percentile(sliced, 0.95),
  };
}

function loadWorldData() {
  const manifests = manifestPaths.map((relPath) =>
    JSON.parse(fs.readFileSync(path.join(ROOT, relPath), "utf8"))
  );

  let worldWidth = 0;
  const manifestsWithOffsets = manifests.map((manifest) => {
    const biomeWidth = manifest.segmentWidth * manifest.lengthInSegments;
    const withOffset = { manifest, offset: worldWidth, biomeWidth };
    worldWidth += biomeWidth;
    return withOffset;
  });

  const decodedMBBySrc = new Map();
  const decodedMBForSrc = (src) => {
    if (decodedMBBySrc.has(src)) return decodedMBBySrc.get(src);
    const relPath = path.join("public", src.replace(/^\/+/, ""));
    const absPath = path.join(ROOT, relPath);
    let decodedMB = 0;
    if (fs.existsSync(absPath)) {
      const dims = parsePngDimensions(fs.readFileSync(absPath));
      if (dims) {
        decodedMB = (dims.width * dims.height * 4) / (1024 * 1024);
      }
    }
    decodedMBBySrc.set(src, decodedMB);
    return decodedMB;
  };

  const instances = [];
  const uniqueSources = new Set();

  manifestsWithOffsets.forEach(({ manifest, offset }) => {
    manifest.groups.forEach((group) => {
      const parallax =
        typeof group.parallax === "number"
          ? group.parallax
          : ROLE_PARALLAX[group.role] ?? 0.9;
      const groupScale = group.scale ?? 1;
      group.assets.forEach((asset) => {
        if (group.repeatX) return;
        const scale = groupScale * (asset.scaleMultiplier ?? 1);
        const width = asset.width * scale;
        const src = `${manifest.assetBasePath.replace(/\/$/, "")}/${
          group.folder
        }/${asset.name}_${asset.index}.png`;
        uniqueSources.add(src);
        (asset.xPositions ?? []).forEach((xPos) => {
          const baseWorldX = xPos + offset;
          for (let segmentIndex = 0; segmentIndex < 3; segmentIndex += 1) {
            instances.push({
              id: `${src}|${baseWorldX}|${segmentIndex}`,
              src,
              width,
              parallax,
              worldX: baseWorldX + segmentIndex * worldWidth,
            });
          }
        });
      });
    });
  });

  return { worldWidth, instances, uniqueSources, decodedMBForSrc };
}

function makeStepStateFn({ worldWidth, instances }) {
  return ({ offset, viewportWidth, prefetchPad = PREFETCH_LOOKAHEAD_PX }) => {
    const visibleLeft = worldWidth + offset;
    const visibleRight = visibleLeft + viewportWidth;
    const parallaxBase = offset;
    const visible = [];
    const prefetchCandidates = [];

    for (const item of instances) {
      const renderedCenter = item.worldX - parallaxBase * (1 - item.parallax);
      const left = renderedCenter - item.width * 0.5;
      const right = renderedCenter + item.width * 0.5;
      const distance = distanceToViewport(left, right, visibleLeft, visibleRight);

      if (!(right < visibleLeft - CULL_PAD_PX || left > visibleRight + CULL_PAD_PX)) {
        visible.push({
          id: item.id,
          src: item.src,
          distance,
        });
      }

      if (
        !(right < visibleLeft - prefetchPad || left > visibleRight + prefetchPad) &&
        distance > 0
      ) {
        prefetchCandidates.push({
          src: item.src,
          distance,
        });
      }
    }

    const nearestBySrc = new Map();
    for (const candidate of prefetchCandidates) {
      const prev = nearestBySrc.get(candidate.src);
      if (prev == null || candidate.distance < prev) {
        nearestBySrc.set(candidate.src, candidate.distance);
      }
    }

    const sortedPrefetchCandidates = [...nearestBySrc.entries()]
      .sort((a, b) => a[1] - b[1])
      .map(([src, distance]) => ({ src, distance }));

    return { visible, sortedPrefetchCandidates };
  };
}

function simulateProfile({
  worldWidth,
  getStepState,
  decodedMBForSrc,
  viewportWidth,
  usePrefetch,
}) {
  const offsets = [];
  for (let offset = 0; offset <= worldWidth; offset += STEP_SIZE_LOGICAL) {
    offsets.push(offset);
  }

  const decodedSources = new Set();
  const queuedSources = new Set();
  const prefetchQueue = [];
  let prevVisibleIds = new Set();

  const decodeBurstSeries = [];
  const newlyVisibleSourceSeries = [];
  const renderedSpriteSeries = [];
  const highPrioritySeries = [];
  const eagerSeries = [];
  const lazySeries = [];

  let prefetchDecodeMB = 0;
  let onDemandDecodeMB = 0;

  offsets.forEach((offset) => {
    const { visible, sortedPrefetchCandidates } = getStepState({
      offset,
      viewportWidth,
    });

    if (usePrefetch) {
      let enqueued = 0;
      for (const candidate of sortedPrefetchCandidates) {
        if (decodedSources.has(candidate.src) || queuedSources.has(candidate.src)) {
          continue;
        }
        prefetchQueue.push(candidate.src);
        queuedSources.add(candidate.src);
        enqueued += 1;
        if (enqueued >= PREFETCH_ENQUEUE_PER_STEP) break;
      }

      let decodedThisStep = 0;
      while (decodedThisStep < PREFETCH_DECODES_PER_STEP && prefetchQueue.length > 0) {
        const src = prefetchQueue.shift();
        queuedSources.delete(src);
        if (decodedSources.has(src)) continue;
        decodedSources.add(src);
        prefetchDecodeMB += decodedMBForSrc(src);
        decodedThisStep += 1;
      }
    }

    const currentVisibleIds = new Set(visible.map((entry) => entry.id));
    const newlyVisible = visible.filter((entry) => !prevVisibleIds.has(entry.id));
    const newlyVisibleSources = new Set(newlyVisible.map((entry) => entry.src));

    let stepBurstMB = 0;
    for (const src of newlyVisibleSources) {
      if (decodedSources.has(src)) continue;
      decodedSources.add(src);
      const decodedMB = decodedMBForSrc(src);
      stepBurstMB += decodedMB;
      onDemandDecodeMB += decodedMB;
    }

    decodeBurstSeries.push(stepBurstMB);
    newlyVisibleSourceSeries.push(newlyVisibleSources.size);
    renderedSpriteSeries.push(visible.length);

    if (usePrefetch) {
      const high = visible.filter((entry) => entry.distance <= LOAD_HIGH_PRIORITY_PAD_PX)
        .length;
      const eager = visible.filter((entry) => entry.distance <= LOAD_EAGER_PAD_PX).length;
      highPrioritySeries.push(high);
      eagerSeries.push(eager);
      lazySeries.push(Math.max(0, visible.length - eager));
    } else {
      highPrioritySeries.push(visible.length);
      eagerSeries.push(visible.length);
      lazySeries.push(0);
    }

    prevVisibleIds = currentVisibleIds;
  });

  const warmStartCutoff = 3;
  const burstStats = summarizeSeries(decodeBurstSeries, warmStartCutoff);
  const visibleSourceStats = summarizeSeries(
    newlyVisibleSourceSeries,
    warmStartCutoff
  );
  const renderedStats = summarizeSeries(renderedSpriteSeries, warmStartCutoff);
  const highPriorityStats = summarizeSeries(highPrioritySeries, warmStartCutoff);
  const eagerStats = summarizeSeries(eagerSeries, warmStartCutoff);
  const lazyStats = summarizeSeries(lazySeries, warmStartCutoff);

  return {
    viewportWidth,
    steps: offsets.length,
    decodeBurstMB: {
      avg: Number(burstStats.avg.toFixed(2)),
      p95: Number(burstStats.p95.toFixed(2)),
      max: Number(burstStats.max.toFixed(2)),
      warmAvg: Number(burstStats.warmAvg.toFixed(2)),
      warmP95: Number(burstStats.warmP95.toFixed(2)),
      warmMax: Number(burstStats.warmMax.toFixed(2)),
      stepsOver8MB: decodeBurstSeries.filter((value) => value > 8).length,
      warmStepsOver8MB: decodeBurstSeries
        .slice(warmStartCutoff)
        .filter((value) => value > 8).length,
    },
    newlyVisibleSourcesPerStep: {
      avg: Number(visibleSourceStats.avg.toFixed(2)),
      p95: Number(visibleSourceStats.p95.toFixed(2)),
      max: Number(visibleSourceStats.max.toFixed(2)),
      warmAvg: Number(visibleSourceStats.warmAvg.toFixed(2)),
      warmP95: Number(visibleSourceStats.warmP95.toFixed(2)),
      warmMax: Number(visibleSourceStats.warmMax.toFixed(2)),
    },
    renderedSpritesPerStep: {
      avg: Number(renderedStats.avg.toFixed(2)),
      p95: Number(renderedStats.p95.toFixed(2)),
      max: Number(renderedStats.max.toFixed(2)),
    },
    priorityBucketsPerStep: {
      high: {
        avg: Number(highPriorityStats.avg.toFixed(2)),
        p95: Number(highPriorityStats.p95.toFixed(2)),
        max: Number(highPriorityStats.max.toFixed(2)),
      },
      eager: {
        avg: Number(eagerStats.avg.toFixed(2)),
        p95: Number(eagerStats.p95.toFixed(2)),
        max: Number(eagerStats.max.toFixed(2)),
      },
      lazy: {
        avg: Number(lazyStats.avg.toFixed(2)),
        p95: Number(lazyStats.p95.toFixed(2)),
        max: Number(lazyStats.max.toFixed(2)),
      },
    },
    decodedMB: {
      onDemand: Number(onDemandDecodeMB.toFixed(2)),
      prefetched: Number(prefetchDecodeMB.toFixed(2)),
      total: Number((onDemandDecodeMB + prefetchDecodeMB).toFixed(2)),
    },
  };
}

function makeComparison(before, after) {
  const delta = (a, b) => Number((b - a).toFixed(2));
  const percent = (a, b) => {
    if (a === 0) return 0;
    return Number((((b - a) / a) * 100).toFixed(1));
  };
  return {
    decodeBurstMB: {
      warmP95: {
        before: before.decodeBurstMB.warmP95,
        after: after.decodeBurstMB.warmP95,
        delta: delta(before.decodeBurstMB.warmP95, after.decodeBurstMB.warmP95),
        deltaPct: percent(before.decodeBurstMB.warmP95, after.decodeBurstMB.warmP95),
      },
      warmMax: {
        before: before.decodeBurstMB.warmMax,
        after: after.decodeBurstMB.warmMax,
        delta: delta(before.decodeBurstMB.warmMax, after.decodeBurstMB.warmMax),
        deltaPct: percent(before.decodeBurstMB.warmMax, after.decodeBurstMB.warmMax),
      },
      warmStepsOver8MB: {
        before: before.decodeBurstMB.warmStepsOver8MB,
        after: after.decodeBurstMB.warmStepsOver8MB,
        delta:
          after.decodeBurstMB.warmStepsOver8MB -
          before.decodeBurstMB.warmStepsOver8MB,
      },
    },
    priorityBucketsPerStep: {
      highAvg: {
        before: before.priorityBucketsPerStep.high.avg,
        after: after.priorityBucketsPerStep.high.avg,
        delta: delta(
          before.priorityBucketsPerStep.high.avg,
          after.priorityBucketsPerStep.high.avg
        ),
        deltaPct: percent(
          before.priorityBucketsPerStep.high.avg,
          after.priorityBucketsPerStep.high.avg
        ),
      },
      lazyAvg: {
        before: before.priorityBucketsPerStep.lazy.avg,
        after: after.priorityBucketsPerStep.lazy.avg,
        delta: delta(
          before.priorityBucketsPerStep.lazy.avg,
          after.priorityBucketsPerStep.lazy.avg
        ),
      },
    },
    decodedMB: {
      onDemand: {
        before: before.decodedMB.onDemand,
        after: after.decodedMB.onDemand,
        delta: delta(before.decodedMB.onDemand, after.decodedMB.onDemand),
        deltaPct: percent(before.decodedMB.onDemand, after.decodedMB.onDemand),
      },
      prefetched: {
        before: before.decodedMB.prefetched,
        after: after.decodedMB.prefetched,
      },
    },
  };
}

const worldData = loadWorldData();
const getStepState = makeStepStateFn(worldData);

const profiles = [
  { id: "mobile", viewportWidth: 480 },
  { id: "desktop", viewportWidth: 1280 },
];

const profileResults = profiles.map((profile) => {
  const before = simulateProfile({
    worldWidth: worldData.worldWidth,
    getStepState,
    decodedMBForSrc: worldData.decodedMBForSrc,
    viewportWidth: profile.viewportWidth,
    usePrefetch: false,
  });
  const after = simulateProfile({
    worldWidth: worldData.worldWidth,
    getStepState,
    decodedMBForSrc: worldData.decodedMBForSrc,
    viewportWidth: profile.viewportWidth,
    usePrefetch: true,
  });
  return {
    profile: profile.id,
    viewportWidth: profile.viewportWidth,
    before,
    after,
    comparison: makeComparison(before, after),
  };
});

const output = {
  generatedAt: new Date().toISOString(),
  assumptions: {
    cullPadPx: CULL_PAD_PX,
    loadHighPriorityPadPx: LOAD_HIGH_PRIORITY_PAD_PX,
    loadEagerPadPx: LOAD_EAGER_PAD_PX,
    prefetchLookaheadPx: PREFETCH_LOOKAHEAD_PX,
    prefetchEnqueuePerStep: PREFETCH_ENQUEUE_PER_STEP,
    prefetchDecodesPerStep: PREFETCH_DECODES_PER_STEP,
    stepSizeLogical: STEP_SIZE_LOGICAL,
    note:
      "Proxy simulation over meadow+forest non-repeat sprites; decoded memory uses PNG w*h*4 estimates.",
  },
  world: {
    segmentWidth: worldData.worldWidth,
    uniqueNonRepeatSources: worldData.uniqueSources.size,
  },
  profiles: profileResults,
};

const outPath = path.join(ROOT, "perf-07-loading-metrics.json");
fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
