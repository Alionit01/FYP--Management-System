import { useEffect, useRef } from "react";
import { TriangleAlert } from "lucide-react";

function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  // While the confirmed action is running the dialog stays up and the
  // Confirm button locks: without that, a second click (or a double
  // tap on the button underneath) could fire the same delete twice.
  // Cancel stays available so nobody is ever trapped behind a spinner.
  pending = false,
  pendingLabel = "Working…",
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);

  useEffect(() => {
    cancelRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onCancel();
        return;
      }

      // Keep Tab focus inside the dialog while it is open.
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-forest-950/50 p-4"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-busy={pending || undefined}
        aria-labelledby="confirm-dialog-title"
        className="card animate-pop w-full max-w-md p-6 sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-50 text-danger-700"
          >
            <TriangleAlert size={19} />
          </span>

          <div className="min-w-0">
            <h2
              id="confirm-dialog-title"
              className="display text-xl text-forest-900"
            >
              {title}
            </h2>

            <p className="mt-2 text-sm text-ink-soft leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            ref={cancelRef}
            className="secondary-button"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="danger-button"
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
