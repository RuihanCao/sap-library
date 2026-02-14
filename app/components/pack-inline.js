import { getPackSprite } from "@/lib/packSprites";

export function PackInlineName({ name, className = "pack-name-inline" }) {
  const label = name || "Unknown";
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
