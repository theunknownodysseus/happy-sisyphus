interface Props {
  onPointerDown: (e: React.PointerEvent) => void
}

// Slim drag handle for resizing an adjacent panel. The hit area is wider than
// the visible line so it's easy to grab without needing pixel precision.
export default function ResizeHandle({ onPointerDown }: Props): JSX.Element {
  return (
    <div
      onPointerDown={onPointerDown}
      className="group relative w-2.5 shrink-0 cursor-col-resize"
    >
      <div className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 rounded-full bg-transparent transition-colors group-hover:bg-accent group-active:bg-accent" />
    </div>
  )
}
