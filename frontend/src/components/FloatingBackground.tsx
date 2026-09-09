const SYMBOLS = [
  { glyph: "×", top: "12%", left: "6%", size: 56, delay: "0s" },
  { glyph: "÷", top: "22%", left: "88%", size: 48, delay: "1.2s" },
  { glyph: "+", top: "58%", left: "4%", size: 44, delay: "2s" },
  { glyph: "★", top: "70%", left: "90%", size: 40, delay: "0.6s" },
  { glyph: "−", top: "40%", left: "93%", size: 52, delay: "2.6s" },
  { glyph: "●", top: "82%", left: "10%", size: 36, delay: "1.8s" },
  { glyph: "=", top: "8%", left: "72%", size: 44, delay: "3s" },
];

export default function FloatingBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {SYMBOLS.map((s) => (
        <span
          key={`${s.glyph}-${s.left}`}
          className="v2l-float absolute select-none font-bold text-brand"
          style={{
            top: s.top,
            left: s.left,
            fontSize: s.size,
            opacity: 0.08,
            animationDelay: s.delay,
          }}
        >
          {s.glyph}
        </span>
      ))}
    </div>
  );
}
