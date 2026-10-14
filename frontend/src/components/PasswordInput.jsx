import { useLayoutEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

/* A password input with a show/hide eye toggle.

   Used by every form that asks for a password (sign in, register,
   reset, verify) so the affordance looks and behaves the same
   everywhere. Callers pass the usual input props — value, onChange,
   autoComplete, placeholder, minLength… — plus any extra classes; the
   `input-field` base and the right padding that keeps text clear of
   the icon are applied here. */
function PasswordInput({ className = "", ...props }) {
  const [visible, setVisible] = useState(false);
  const inputRef = useRef(null);
  const pendingCaret = useRef(null);

  // Changing type resets the caret to the start, which would make the
  // next keystroke land at the front of a password still being typed.
  // Restore it after React commits the new type — and once more after
  // paint, because Chromium re-applies its own selection reset at the
  // end of the frame, which would otherwise undo the first restore.
  useLayoutEffect(() => {
    if (pendingCaret.current == null) return;
    const { start, end } = pendingCaret.current;
    pendingCaret.current = null;

    const restore = () => {
      try {
        inputRef.current?.setSelectionRange(start, end);
      } catch {
        // Not every input type supports selection; the value is still
        // correct, only the caret placement is lost.
      }
    };

    restore();
    const frame = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(frame);
  }, [visible]);

  const toggle = (event) => {
    const input = inputRef.current;
    pendingCaret.current = input
      ? { start: input.selectionStart ?? 0, end: input.selectionEnd ?? 0 }
      : null;

    setVisible((current) => !current);

    // Back to the field after a mouse click, so someone typing can
    // flick the eye and carry on without re-clicking the input.
    // Keyboard activation reports detail === 0 and leaves focus on the
    // button, which is what a keyboard user tabbing through expects.
    if (event.detail > 0) input?.focus();
  };

  return (
    <div className="relative">
      <input
        {...props}
        ref={inputRef}
        type={visible ? "text" : "password"}
        className={`input-field pr-11 ${className}`.trim()}
      />

      <button
        type="button"
        onClick={toggle}
        disabled={props.disabled}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-ink-muted transition-colors hover:text-forest-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {visible ? (
          <EyeOff size={16} aria-hidden="true" />
        ) : (
          <Eye size={16} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

export default PasswordInput;
