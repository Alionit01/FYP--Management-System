/* Shared avatar: photo when the student has one, otherwise a warm
   initial badge. The decorative fallback is hidden from screen readers
   because the person's name is always rendered next to it. */

const SIZES = {
  sm: "w-9 h-9 text-sm",
  md: "w-12 h-12 text-base",
  lg: "w-20 h-20 text-2xl",
};

function Avatar({ name = "", src, size = "md" }) {
  const sizeClass = SIZES[size] || SIZES.md;
  const initial = name.trim().charAt(0).toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        loading="lazy"
        className={`${sizeClass} rounded-full object-cover shrink-0 ring-1 ring-forest-900/10`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`${sizeClass} rounded-full bg-forest-100 text-forest-800 flex items-center justify-center font-semibold shrink-0 ring-1 ring-forest-900/10`}
    >
      {initial || "?"}
    </div>
  );
}

export default Avatar;
