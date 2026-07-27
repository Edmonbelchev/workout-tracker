import { Suspense } from "react";

import { CameraViewInner } from "./CameraViewInner";

export function CameraView() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center bg-zinc-950 text-zinc-400">
          Loading…
        </div>
      }
    >
      <CameraViewInner />
    </Suspense>
  );
}
