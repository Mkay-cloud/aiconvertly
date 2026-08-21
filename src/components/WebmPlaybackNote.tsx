/** Shown near any format selector where WebM is a choosable output format. */
export function WebmPlaybackNote() {
  return (
    <p className="text-xs text-secondary">
      Note: WebM files may not play directly on iPhone/iPad — they&rsquo;ll still
      download and work fine elsewhere, including in VLC.
    </p>
  );
}
