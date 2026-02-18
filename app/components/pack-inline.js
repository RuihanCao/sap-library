import { getPackSprite } from "@/lib/packSprites";

const PACK_ID_TO_NAME = Object.freeze({
  "0": "Turtle",
  "1": "Puppy",
  "2": "Star",
  "3": "Custom",
  "4": "Weekly",
  "5": "Golden",
  "6": "Unicorn",
  "7": "Danger",
  "11": "Custom"
});

function normalizePackName(name) {
  const raw = String(name ?? "").trim();
  if (!raw) return "Unknown";
  if (PACK_ID_TO_NAME[raw]) return PACK_ID_TO_NAME[raw];
  if (/^\d+$/.test(raw)) return "Unknown";
  return raw;
}

export function PackInlineName({ name, className = "pack-name-inline" }) {
  const label = normalizePackName(name);
  const sprite = getPackSprite(label);
  return (
    <span className={className}>
      {sprite ? <img src={sprite} alt="" /> : null}
      <span>{label}</span>
    </span>
  );
}

export function PackMatchupInline({
  pack,
  opponentPack,
  className = "pack-matchup-inline",
  leftClassName = "pack-name-inline",
  rightClassName = "pack-name-inline"
}) {
  return (
    <span className={className}>
      <PackInlineName name={pack} className={leftClassName} />
      <span className="vs-line">vs</span>
      <PackInlineName name={opponentPack} className={rightClassName} />
    </span>
  );
}
