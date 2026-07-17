import { useEffect, useRef, useState, type ReactNode } from "react";

export function RenderWhenVisible({
  children,
  minHeight = 160,
  rootMargin = "600px 0px",
}: {
  children: ReactNode;
  minHeight?: number;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    if (visible || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.disconnect();
      },
      { rootMargin },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [rootMargin, visible]);

  return (
    <div ref={ref} style={visible ? undefined : { minHeight }} aria-busy={!visible || undefined}>
      {visible ? children : null}
    </div>
  );
}
