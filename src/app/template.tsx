"use client";

/**
 * `template.tsx` (unlike `layout.tsx`) re-mounts on every navigation, so this
 * is the one place a subtle, consistent transition can apply across the
 * whole app without touching every page. Previously every route change was
 * a hard cut — no fade, no continuity cue that you're still in the same app.
 * `motion-safe:` respects prefers-reduced-motion automatically.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
      {children}
    </div>
  );
}
