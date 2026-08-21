import { Alert } from "./Alert";
import { formatBytes } from "@/lib/format";

const LARGE_FILE_THRESHOLD = 200 * 1024 * 1024; // 200MB

export function LargeFileWarning({ file }: { file: File }) {
  if (file.size <= LARGE_FILE_THRESHOLD) return null;

  return (
    <Alert>
      This file is {formatBytes(file.size)} — everything runs on your device, so large
      files like this can take a long time to process, use a lot of memory, or fail to
      finish. If you run into trouble, try trimming or compressing it first.
    </Alert>
  );
}
