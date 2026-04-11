"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { motion } from "motion/react";

import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// --- Tunable: tweak these in place -------------------------------------------------
/**
 * Auto-advance interval (ms). Raise (e.g. 999999) to effectively disable autoplay.
 * Timer pauses while the pointer hovers the stack; restarts full interval after leave or on card click.
 */
const ROTATE_MS = 5200;

/**
 * Horizontal spread (px) per layout tier — larger = cards sit farther apart on X.
 * `tight` < 640px, `medium` 640–1023px, `wide` ≥ 1024px.
 */
const SPREAD_X: Record<"tight" | "medium" | "wide", number> = {
  tight: 60,
  medium: 160,
  wide: 280,
};

/** Vertical offset (px) for mid/back layers vs front — larger = more vertical breathing room. */
const SPREAD_Y: Record<"tight" | "medium" | "wide", number> = {
  tight: 20,
  medium: 16,
  wide: 12,
};

/** Max rotation (deg) for mid/back — lower = flatter stack. */
const ROT: Record<"tight" | "medium" | "wide", number> = {
  tight: 4.5,
  medium: 3.8,
  wide: 2.8,
};

/** Scale for mid / back relative to front (1). Closer to 1 = looser, less “deck” shrink. */
const SCALE_MID = 0.97;
const SCALE_BACK = 0.94;

/** Spring feel for reordering. Higher stiffness = snappier; higher damping = less bounce. */
const SPRING = {
  type: "spring" as const,
  stiffness: 380,
  damping: 46,
  mass: 0.95,
};

/** Min height + max width of the stack area (Tailwind classes). Widen/taller if cards clip. */
const CONTAINER: Record<"tight" | "medium" | "wide", string> = {
  tight: "h-[200px] max-w-[min(100%,320px)]",
  medium: "h-[200px] max-w-[min(100%,520px)]",
  wide: "h-[220px] max-w-[min(100%,800px)]",
};
// ---------------------------------------------------------------------------------

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function subscribeLayout(cb: () => void) {
  const mqSm = window.matchMedia("(min-width: 640px)");
  const mqLg = window.matchMedia("(min-width: 1024px)");
  mqSm.addEventListener("change", cb);
  mqLg.addEventListener("change", cb);
  return () => {
    mqSm.removeEventListener("change", cb);
    mqLg.removeEventListener("change", cb);
  };
}

function getLayoutSpreadSnapshot(): "tight" | "medium" | "wide" {
  if (window.matchMedia("(min-width: 1024px)").matches) return "wide";
  if (window.matchMedia("(min-width: 640px)").matches) return "medium";
  return "tight";
}

function getLayoutSpreadServerSnapshot(): "tight" | "medium" | "wide" {
  return "medium";
}

export type HomeIntroItem = {
  title: string;
  body: string;
};

/** role: 0 = front, 1 = mid, 2 = back */
function roleToMotion(
  role: 0 | 1 | 2,
  spread: "tight" | "medium" | "wide",
): {
  x: number;
  y: number;
  rotate: number;
  scale: number;
  opacity: number;
  zIndex: number;
} {
  const spreadX = SPREAD_X[spread];
  const spreadY = SPREAD_Y[spread];
  const rot = ROT[spread];

  switch (role) {
    case 0:
      return { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, zIndex: 30 };
    case 1:
      return {
        x: spreadX,
        y: spreadY,
        rotate: rot,
        scale: SCALE_MID,
        opacity: 0.93,
        zIndex: 20,
      };
    case 2:
      return {
        x: -spreadX,
        y: spreadY * 1.25,
        rotate: -rot * 1.08,
        scale: SCALE_BACK,
        opacity: 0.9,
        zIndex: 10,
      };
    default:
      return { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, zIndex: 30 };
  }
}

export function HomeIntroStack({ items }: { items: [HomeIntroItem, HomeIntroItem, HomeIntroItem] }) {
  const [active, setActive] = useState(0);
  /** True while pointer is over the stack — pauses auto-advance. */
  const [pointerOverStack, setPointerOverStack] = useState(false);
  /** Bump on card click to restart the ROTATE_MS countdown from zero. */
  const [autoRotateEpoch, setAutoRotateEpoch] = useState(0);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
  const layoutSpread = useSyncExternalStore(
    subscribeLayout,
    getLayoutSpreadSnapshot,
    getLayoutSpreadServerSnapshot,
  );

  useEffect(() => {
    if (reducedMotion || pointerOverStack) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % 3);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [reducedMotion, pointerOverStack, autoRotateEpoch]);

  if (reducedMotion) {
    return (
      <div className="mb-8 flex w-full flex-col items-center gap-2">
        {items.map((item) => (
          <Card
            key={item.title}
            className="w-full max-w-[min(100%,300px)] border-0 shadow-sm ring-1 ring-border/70"
          >
            <CardHeader className="space-y-1.5 px-3 pb-3 pt-3.5 text-left">
              <h2 className="text-sm font-semibold leading-snug text-foreground">{item.title}</h2>
              <CardDescription className="text-pretty text-xs leading-relaxed text-muted-foreground">
                {item.body}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="mb-8 flex w-full flex-col items-center">
      <div
        className={cn("relative mx-auto w-full", CONTAINER[layoutSpread])}
        aria-roledescription="carousel"
        aria-label={items.map((x) => x.title).join(" · ")}
        onPointerEnter={() => setPointerOverStack(true)}
        onPointerLeave={() => setPointerOverStack(false)}
      >
        {items.map((item, cardIndex) => {
          const role = ((((cardIndex - active) % 3) + 3) % 3) as 0 | 1 | 2;
          const v = roleToMotion(role, layoutSpread);
          return (
            <motion.div
              key={cardIndex}
              className="absolute top-0 w-[min(100%,280px)] origin-top cursor-pointer sm:w-[290px]"
              style={{ left: "50%" }}
              initial={false}
              animate={{
                x: `calc(-50% + ${v.x}px)`,
                y: v.y,
                rotate: v.rotate,
                scale: v.scale,
                opacity: v.opacity,
                zIndex: v.zIndex,
              }}
              transition={SPRING}
              onClick={() => {
                if (cardIndex === active) {
                  setActive((i) => (i + 1) % 3);
                } else {
                  setActive(cardIndex);
                }
                setAutoRotateEpoch((n) => n + 1);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (cardIndex === active) {
                    setActive((i) => (i + 1) % 3);
                  } else {
                    setActive(cardIndex);
                  }
                  setAutoRotateEpoch((n) => n + 1);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`${item.title}${role === 0 ? " (front)" : ""}`}
              aria-pressed={role === 0}
            >
              <Card className="border-0 shadow-md ring-1 ring-border/70 transition-shadow hover:ring-primary/20">
                <CardHeader className="space-y-1.5 px-3 pb-3 pt-3.5 text-left sm:px-3.5 sm:pt-4">
                  <h2 className="text-sm font-semibold leading-snug text-foreground">{item.title}</h2>
                  <CardDescription className="text-pretty text-xs leading-relaxed text-muted-foreground">
                    {item.body}
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
