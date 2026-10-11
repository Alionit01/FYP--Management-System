/* Skills / roles / interests rendered as a real list, with pastel tones
   cycling through the palette so clusters of tags stay readable and a
   little playful. Accepts a comma-separated string or an array. */

const TONES = ["tag-mint", "tag-sand", "tag-sky", "tag-blush", "tag-lilac"];

function splitList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function Tags({ items, size }) {
  const list = splitList(items);

  if (list.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-1.5">
      {list.map((item, index) => (
        <li
          key={`${item}-${index}`}
          className={`tag ${TONES[index % TONES.length]} ${
            size === "lg" ? "tag-lg" : ""
          }`}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

export default Tags;
