function joinClasses(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function SemanticLabel({ type = "turn", children, className = "", iconClassName = "" }) {
  const iconSrc = type === "lives" ? "/heart-twemoji.png" : "/hourglass-twemoji.png";

  return (
    <span className={joinClasses("semantic-inline-icon", className)}>
      <img
        src={iconSrc}
        alt=""
        aria-hidden="true"
        className={joinClasses("semantic-inline-icon-image", iconClassName)}
      />
      <span>{children}</span>
    </span>
  );
}
