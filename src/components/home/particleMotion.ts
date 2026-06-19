export type PointerInteraction = {
  radial: number;
  tangential: number;
  wake: number;
  proximity: number;
};

export type SatelliteMeshSampleMeta = {
  name: string;
  parentName: string;
  area: number;
};

type PanelBounds = {
  top: number;
  bottom: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const particleSceneRoles = [
  "rocket",
  "satellite",
  "earth",
  "saturn",
  "astronaut",
] as const;

export function getParticleSceneRole(index: number) {
  return particleSceneRoles[index] ?? particleSceneRoles[particleSceneRoles.length - 1];
}

export function getParticleStageX(shapeTravel: number, lastIndex: number) {
  const finalCentering = clamp01(shapeTravel - Math.max(0, lastIndex - 1));
  const saturnCentering = 1 - Math.max(0, 1 - Math.abs(shapeTravel - 3) * 3) * 0.07;
  return (
    Math.cos(shapeTravel * Math.PI) *
    1.72 *
    saturnCentering *
    (1 - finalCentering)
  );
}

export function getSaturnParticleRegion(part: number) {
  return part < 0.38 ? "planet" : "ring";
}

export function getPointerInteraction(
  distance: number,
  radius: number,
  presence: number,
  velocity: number,
  output?: PointerInteraction,
): PointerInteraction {
  const result = output ?? {
    radial: 0,
    tangential: 0,
    wake: 0,
    proximity: 0,
  };
  const pointerPresence = clamp01(presence);

  if (radius <= 0 || distance >= radius || pointerPresence === 0) {
    result.radial = 0;
    result.tangential = 0;
    result.wake = 0;
    result.proximity = 0;
    return result;
  }

  const normalizedDistance = clamp01(1 - Math.max(0, distance) / radius);
  const proximity = normalizedDistance * normalizedDistance * pointerPresence;
  const motion = clamp01(velocity);

  result.radial = proximity * (0.26 + motion * 0.2);
  result.tangential = proximity * (0.08 + motion * 0.15);
  result.wake = proximity * motion * 0.22;
  result.proximity = proximity;
  return result;
}

export function findActivePanelIndex(
  panels: PanelBounds[],
  viewportHeight: number,
) {
  const activationLine = viewportHeight * 0.72;

  return panels.findIndex(
    ({ top, bottom }) => top <= activationLine && bottom > activationLine,
  );
}

export function allocateSatelliteMeshSamples(
  meshes: SatelliteMeshSampleMeta[],
  count: number,
) {
  const groups = meshes.map((mesh) => getSatelliteMeshGroup(mesh));
  const hasKnownSatelliteParts = groups.some((group) => group !== "unknown");

  if (!hasKnownSatelliteParts) {
    return distributeByWeight(
      meshes.map((mesh) => Math.pow(Math.max(mesh.area, 0.000001), 0.72)),
      count,
    );
  }

  const bodyCount = Math.round(count * 0.52);
  const panelCount = Math.round(count * 0.32);
  const antennaCount = count - bodyCount - panelCount;
  const counts = new Array(meshes.length).fill(0);

  applySatelliteGroupCounts(meshes, groups, "body", bodyCount, counts);
  applySatelliteGroupCounts(meshes, groups, "panel", panelCount, counts);
  applySatelliteGroupCounts(meshes, groups, "antenna", antennaCount, counts);

  const assigned = counts.reduce((sum, value) => sum + value, 0);
  if (assigned !== count && counts.length > 0) {
    counts[0] += count - assigned;
  }

  return counts;
}

function applySatelliteGroupCounts(
  meshes: SatelliteMeshSampleMeta[],
  groups: string[],
  targetGroup: string,
  count: number,
  output: number[],
) {
  const indexes = groups
    .map((group, index) => (group === targetGroup ? index : -1))
    .filter((index) => index >= 0);

  if (indexes.length === 0 || count <= 0) {
    return;
  }

  const groupCounts = distributeByWeight(
    indexes.map((index) => {
      const area = Math.max(meshes[index].area, 0.000001);
      return targetGroup === "body" ? Math.pow(area, 0.52) : Math.pow(area, 0.38);
    }),
    count,
  );

  indexes.forEach((meshIndex, index) => {
    output[meshIndex] = groupCounts[index];
  });
}

function getSatelliteMeshGroup(mesh: SatelliteMeshSampleMeta) {
  const name = mesh.name;

  if (name === "Cylinder003" || name === "Cube" || name.includes("圆柱")) {
    return "body";
  }

  if (
    name === "Cylinder" ||
    name === "Cylinder001" ||
    name === "Cylinder002" ||
    name === "Torus" ||
    name.includes("圆盘") ||
    name.includes("管道")
  ) {
    return "antenna";
  }

  if (name.includes("立方体")) {
    return "panel";
  }

  return "unknown";
}

function distributeByWeight(weights: number[], count: number) {
  if (weights.length === 0) {
    return [];
  }

  const minimum = Math.min(8, Math.floor(count / weights.length));
  const reserved = minimum * weights.length;
  const available = Math.max(0, count - reserved);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
  const exact = weights.map((weight) => (weight / totalWeight) * available);
  const counts = exact.map((value) => minimum + Math.floor(value));
  const remainder = count - counts.reduce((sum, value) => sum + value, 0);
  const fractionalOrder = exact
    .map((value, index) => ({ fraction: value - Math.floor(value), index }))
    .sort((a, b) => b.fraction - a.fraction);

  for (let index = 0; index < remainder; index += 1) {
    counts[fractionalOrder[index % fractionalOrder.length].index] += 1;
  }

  return counts;
}
