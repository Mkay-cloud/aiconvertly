import { ProgressBar } from "./ProgressBar";
import { Button } from "./Button";

/**
 * Shared progress/cancel UI for every ffmpeg-backed tool. Rendered once a
 * file is selected so the time-expectation note is visible before a
 * conversion starts, not just while one is running.
 */
export function ConversionStatus({
  isLoadingCore,
  coreLoadProgress,
  isProcessing,
  processProgress,
  processingLabel = "Converting…",
  onCancel,
}: {
  isLoadingCore: boolean;
  coreLoadProgress: number;
  isProcessing: boolean;
  processProgress: number;
  processingLabel?: string;
  onCancel: () => void;
}) {
  const isBusy = isLoadingCore || isProcessing;

  return (
    <div className="flex flex-col gap-3">
      {isLoadingCore && (
        <ProgressBar label="Loading converter…" percent={coreLoadProgress} />
      )}
      {isProcessing && <ProgressBar label={processingLabel} percent={processProgress} />}
      <p className="text-xs text-secondary">
        Processing time may vary depending on your device, video duration, and file size.
      </p>
      {isBusy && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onCancel}
          className="self-start"
        >
          Cancel
        </Button>
      )}
    </div>
  );
}
