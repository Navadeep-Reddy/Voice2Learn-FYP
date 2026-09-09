import { useState } from "react";

function useReducedMotion() {
  const [reduced] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  return reduced;
}

function Apple({ index }: { index: number }) {
  const delayClass = `v2l-d${(index % 6) + 1}`;
  return (
    <span
      aria-hidden="true"
      className={`v2l-apple-drop ${delayClass} inline-block text-3xl md:text-4xl`}
    >
      🍎
    </span>
  );
}

function StillApple() {
  return (
    <span aria-hidden="true" className="inline-block text-3xl md:text-4xl">
      🍎
    </span>
  );
}

const EMPHASIS_DELAYS = ["v2l-d1", "v2l-d3", "v2l-d5"];

function GroupBasket({
  groupIndex,
  apples,
  highlight,
  emphasis,
  label,
}: {
  groupIndex: number;
  apples: number;
  highlight?: boolean;
  emphasis?: boolean;
  label?: string;
}) {
  const delayClass = `v2l-d${groupIndex + 1}`;
  const emphasisClass = emphasis ? `v2l-emphasis ${EMPHASIS_DELAYS[groupIndex]}` : "";
  return (
    <div
      className={`v2l-pop-in ${delayClass} ${emphasisClass} flex flex-col items-center rounded-xl border-2 px-4 py-3 ${
        highlight || emphasis ? "border-brandbright" : "border-line"
      }`}
      style={{ backgroundColor: highlight || emphasis ? "#FFFFFF" : "#F2F4F6" }}
    >
      <div className="grid grid-cols-2 gap-1">
        {Array.from({ length: apples }).map((_, i) => (
          <Apple key={i} index={i + groupIndex * 4} />
        ))}
      </div>
      {label && (
        <p className="mt-2 text-sm font-bold text-muted">{label}</p>
      )}
    </div>
  );
}

function SceneTwo() {
  return (
    <div key="scene-2" className="v2l-stage-in">
      <div className="flex flex-wrap items-start justify-center gap-4 md:gap-6">
        {[0, 1, 2].map((g) => (
          <GroupBasket key={g} groupIndex={g} apples={4} emphasis />
        ))}
      </div>
      <p
        className="type-card mt-5 text-center text-ink"
        aria-label="4 plus 4 plus 4 equals 12"
      >
        <span className="v2l-equation-in v2l-d2 inline-block">4</span>
        <span className="v2l-equation-in v2l-d4 inline-block"> + 4</span>
        <span className="v2l-equation-in v2l-d6 inline-block"> + 4</span>
        <span className="v2l-equation-in v2l-d7 inline-block"> = 12</span>
      </p>
    </div>
  );
}

function SceneThree() {
  const reduced = useReducedMotion();
  return (
    <div key="scene-3" className="v2l-stage-in">
      <div className="flex flex-wrap items-start justify-center gap-4 md:gap-6">
        {[0, 1, 2].map((g) => (
          <GroupBasket key={g} groupIndex={g} apples={4} />
        ))}
      </div>
      <div className="mt-5 grid justify-items-center text-center">
        {!reduced && (
          <p
            aria-hidden="true"
            style={{ gridArea: "1 / 1" }}
            className="v2l-xfade-out type-card text-ink"
          >
            4 + 4 + 4 = 12
          </p>
        )}
        <p
          style={{ gridArea: "1 / 1" }}
          className={`type-card text-ink ${reduced ? "" : "v2l-xfade-in"}`}
        >
          3 × 4 = 12
        </p>
      </div>
      <div
        className={`mt-4 flex flex-wrap justify-center gap-2 ${reduced ? "" : "v2l-xfade-in"}`}
      >
        <span className="rounded-full bg-subtle px-3 py-1 text-sm font-bold text-muted">
          3 groups
        </span>
        <span className="rounded-full bg-subtle px-3 py-1 text-sm font-bold text-muted">
          4 in each group
        </span>
      </div>
    </div>
  );
}

function SceneFour() {
  const reduced = useReducedMotion();
  if (reduced) {
    return (
      <div key="scene-4" className="v2l-stage-in">
        <div className="flex flex-wrap items-start justify-center gap-4 md:gap-6">
          {[0, 1, 2].map((g) => (
            <GroupBasket key={g} groupIndex={g} apples={4} />
          ))}
        </div>
        <p className="type-card mt-5 text-center text-ink">12 ÷ 3 = 4</p>
        <p className="mt-2 text-center text-base text-muted">
          12 apples shared into 3 groups
        </p>
      </div>
    );
  }
  return (
    <div key="scene-4" className="v2l-stage-in">
      <div className="grid justify-items-center">
        <div
          aria-hidden="true"
          style={{ gridArea: "1 / 1" }}
          className="v2l-pile-out flex justify-center"
        >
          <div className="grid max-w-[260px] grid-cols-4 gap-1 rounded-xl border-2 border-line bg-subtle px-5 py-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <StillApple key={i} />
            ))}
          </div>
        </div>
        <div
          style={{ gridArea: "1 / 1" }}
          className="v2l-groups-in flex max-w-full flex-wrap items-start justify-center gap-4 md:gap-6"
        >
          {[0, 1, 2].map((g) => (
            <GroupBasket key={g} groupIndex={g} apples={4} />
          ))}
        </div>
      </div>
      <p className="type-card v2l-equation-in v2l-d8 mt-5 text-center text-ink">
        12 ÷ 3 = 4
      </p>
      <p className="mt-2 text-center text-base text-muted">
        12 apples shared into 3 groups
      </p>
    </div>
  );
}

export default function SceneVisual({ sceneIndex }: { sceneIndex: number }) {
  if (sceneIndex === 0) {
    return (
      <div key="scene-1" className="v2l-stage-in">
        <div className="flex flex-wrap items-start justify-center gap-4 md:gap-6">
          {[0, 1, 2].map((g) => (
            <GroupBasket key={g} groupIndex={g} apples={4} />
          ))}
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <span className="rounded-full bg-subtle px-3 py-1 text-sm font-bold text-muted">
            3 groups
          </span>
          <span className="rounded-full bg-subtle px-3 py-1 text-sm font-bold text-muted">
            4 each
          </span>
        </div>
      </div>
    );
  }

  if (sceneIndex === 1) {
    return <SceneTwo />;
  }

  if (sceneIndex === 2) {
    return <SceneThree />;
  }

  if (sceneIndex === 3) {
    return <SceneFour />;
  }

  return (
    <div key="scene-5" className="v2l-stage-in">
      <div className="flex flex-col items-center gap-3">
        <p className="type-card rounded-xl border border-line bg-surface px-6 py-3 text-ink">
          3 × 4 = 12
        </p>
        <div
          aria-hidden="true"
          className="v2l-link-draw flex flex-col items-center text-brand"
        >
          <span className="text-3xl font-bold">↕</span>
        </div>
        <p className="type-card rounded-xl border border-line bg-surface px-6 py-3 text-ink">
          12 ÷ 3 = 4
        </p>
        <span aria-hidden="true" className="v2l-sparkle text-2xl">
          ✨
        </span>
      </div>
    </div>
  );
}
