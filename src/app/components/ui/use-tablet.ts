import { useState, useEffect } from "react";

const TABLET_MIN = 768;
const TABLET_MAX = 1024;

export function useIsTablet() {
  const query = `(min-width: ${TABLET_MIN}px) and (max-width: ${TABLET_MAX - 1}px)`;
  const [isTablet, setIsTablet] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setIsTablet(mql.matches);
    mql.addEventListener("change", onChange);
    setIsTablet(mql.matches);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return isTablet;
}
