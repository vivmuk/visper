/* eslint-disable @next/next/no-img-element */

interface EmptyStateProps {
  art: "empty-journal" | "empty-gallery" | "ask" | "reflect" | "offline" | "link";
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}

/** Watercolor illustration (generated with Venice) + friendly copy. */
export default function EmptyState({ art, title, children, action, compact }: EmptyStateProps) {
  return (
    <div className={`text-center ${compact ? "py-4" : "py-10"} animate-rise-in`}>
      <img
        src={`/art/${art}.webp`}
        alt=""
        width={240}
        height={240}
        className={`mx-auto art-blend select-none ${compact ? "w-32 h-32" : "w-48 h-48 md:w-56 md:h-56"}`}
        draggable={false}
      />
      <h3 className="mt-2 text-lg font-semibold text-slate-800">{title}</h3>
      {children && <div className="mt-1 text-sm text-slate-500 max-w-xs mx-auto">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
