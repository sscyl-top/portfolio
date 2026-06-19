export type PointerInteraction = {
  radial: number;
  tangential: number;
  wake: number;
  proximity: number;
};

type PanelBounds = {
  top: number;
  bottom: number;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

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
