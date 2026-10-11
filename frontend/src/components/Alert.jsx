import { AlertCircle, CheckCircle2, Info } from "lucide-react";

/* Feedback banner with an icon + text (never colour alone).
   kind: "error" | "success" | "warning" */
function Alert({ kind = "error", children, className = "" }) {
  if (!children) return null;

  const config = {
    error: {
      role: "alert",
      className: "alert-error",
      icon: AlertCircle,
    },
    success: {
      role: "status",
      className: "alert-success",
      icon: CheckCircle2,
    },
    warning: {
      role: "status",
      className: "alert-warning",
      icon: Info,
    },
  }[kind];

  const Icon = config.icon;

  return (
    <div role={config.role} className={`${config.className} flex gap-2.5 ${className}`}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default Alert;
