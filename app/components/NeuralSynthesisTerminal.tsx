"use client";

import React from "react";
import InstantStudioPlus from "@/app/components/InstantStudioPlus";

export default function NeuralSynthesisTerminal({
  embedded = false,
  onPublishSuccess,
}: {
  embedded?: boolean;
  onPublishSuccess?: () => void;
}) {
  return (
    <div className={`w-full font-mono text-white ${embedded ? "w-full" : "max-w-3xl mx-auto my-4"}`}>
      <InstantStudioPlus onPublishSuccess={onPublishSuccess} />
    </div>
  );
}
