import React, { useEffect, useState } from "react";

const AnimatedNumber = ({ value, isMoney = false }: { value: number; isMoney?: boolean }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayValue(value);
      return;
    }
    let frame = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 1200);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  if (isMoney) return <>{Math.round(displayValue).toLocaleString("fr-FR")} FCFA</>;
  return <>{Math.round(displayValue).toLocaleString("fr-FR")}</>;
};

export default AnimatedNumber;
