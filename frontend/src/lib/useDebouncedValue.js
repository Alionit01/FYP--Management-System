import { useEffect, useState } from "react";

/* Let a fast-changing value settle before it is acted on.

   Typing "machine learning" must not fire five directory requests —
   one, after the student stops for a moment. Long enough that a word
   costs one request, short enough that it does not feel laggy. */
export default function useDebouncedValue(value, delay = 300) {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return settled;
}
