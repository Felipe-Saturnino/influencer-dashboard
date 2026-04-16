import { useEffect, useRef } from "react";

/** Renderiza Code128 a partir do valor numérico do barcode (payload da etiqueta). */
export function BarcodeBlock({ value }: { value: string }) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !value) return;
    let cancelled = false;
    (async () => {
      const JsBarcode = (await import("jsbarcode")).default;
      if (cancelled || !svgRef.current) return;
      svg.innerHTML = "";
      JsBarcode(svgRef.current, value, {
        format: "CODE128",
        width: 2,
        height: 48,
        displayValue: true,
        fontSize: 11,
        margin: 4,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [value]);

  return <svg ref={svgRef} role="img" aria-label={`Código de barras ${value}`} />;
}
