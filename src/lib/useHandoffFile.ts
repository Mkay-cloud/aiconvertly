"use client";

import { useEffect } from "react";
import { takePendingFile } from "./handoffFile";

export function useHandoffFile(onFile: (file: File) => void) {
  useEffect(() => {
    const file = takePendingFile();
    if (file) onFile(file);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
