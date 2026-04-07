export function StreamingCursor() {
  return (
    <span
      className="inline-block h-4 w-0.5 bg-current opacity-75 ml-0.5 align-middle"
      style={{ animation: "blink 1s step-end infinite" }}
    />
  );
}
