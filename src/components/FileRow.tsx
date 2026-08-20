export function FileRow({
  leading,
  title,
  subtitle,
  onMoveUp,
  onMoveDown,
  onRemove,
  canMoveUp,
  canMoveDown,
}: {
  leading: React.ReactNode;
  title: string;
  subtitle: string;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-card-border bg-card px-4 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-bg text-accent">
        {leading}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-secondary">{subtitle}</p>
      </div>
      {(onMoveUp || onMoveDown) && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Move up"
            disabled={!canMoveUp}
            onClick={onMoveUp}
            className="flex h-7 w-7 items-center justify-center rounded-md text-secondary transition-colors hover:bg-bg hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
          >
            &uarr;
          </button>
          <button
            type="button"
            aria-label="Move down"
            disabled={!canMoveDown}
            onClick={onMoveDown}
            className="flex h-7 w-7 items-center justify-center rounded-md text-secondary transition-colors hover:bg-bg hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
          >
            &darr;
          </button>
        </div>
      )}
      <button
        type="button"
        aria-label="Remove file"
        onClick={onRemove}
        className="flex h-7 w-7 items-center justify-center rounded-md text-secondary transition-colors hover:bg-red-500/10 hover:text-red-400"
      >
        &times;
      </button>
    </div>
  );
}
