// Disco de la ruleta en SVG. Lo usan la tienda (con los colores del tema) y la
// vista previa del panel. Las rebanadas empiezan arriba y avanzan como el reloj.
export type Slice = { fill: string; ink: string };

const pt = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(Math.sin(a) * r).toFixed(2)} ${(-Math.cos(a) * r).toFixed(2)}`;
};

export function WheelDisc({ labels, palette, rotation = 0, duration = 0, className = "" }: {
  labels: string[];
  palette: Slice[];
  rotation?: number;
  duration?: number;
  className?: string;
}) {
  const seg = 360 / Math.max(labels.length, 1);
  return (
    <div className={`relative aspect-square ${className}`}>
      <svg viewBox="-104 -104 208 208" className="h-full w-full drop-shadow-[0_10px_24px_rgba(0,0,0,0.18)]" aria-hidden>
        <circle r="103" fill="#fff" />
        <g
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: duration ? `transform ${duration}ms cubic-bezier(0.12, 0.8, 0.12, 1)` : undefined,
          }}
        >
          {labels.map((label, i) => {
            const c = palette[i % palette.length];
            const a1 = i * seg;
            const a2 = (i + 1) * seg;
            const size = Math.max(6.5, Math.min(12, 120 / Math.max(label.length, 6)));
            return (
              <g key={i}>
                <path d={`M0 0 L${pt(a1, 98)} A98 98 0 ${seg > 180 ? 1 : 0} 1 ${pt(a2, 98)} Z`} fill={c.fill} stroke="#fff" strokeWidth="1.5" />
                <text
                  // En la mitad izquierda el texto se da vuelta para no quedar de cabeza.
                  transform={a1 + seg / 2 > 180 ? `rotate(${a1 + seg / 2 + 90}) translate(-60 0)` : `rotate(${a1 + seg / 2 - 90}) translate(60 0)`}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={c.ink}
                  fontSize={size}
                  fontWeight={700}
                  style={{ fontFamily: "inherit" }}
                >
                  {label}
                </text>
              </g>
            );
          })}
        </g>
        <circle r="14" fill="#fff" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
        <circle r="5" fill="currentColor" />
      </svg>
      {/* Puntero */}
      <svg viewBox="0 0 24 28" className="absolute top-[-4%] left-1/2 h-[13%] -translate-x-1/2 drop-shadow" aria-hidden>
        <path d="M12 28 L1 6 A12 12 0 1 1 23 6 Z" fill="currentColor" />
        <circle cx="12" cy="9" r="4" fill="#fff" />
      </svg>
    </div>
  );
}

// Giro que deja la rebanada `index` bajo el puntero, con varias vueltas y un pequeño
// desvío al azar dentro de la rebanada para que no caiga siempre al centro.
export function targetRotation(current: number, index: number, count: number) {
  const seg = 360 / count;
  const center = index * seg + seg / 2;
  const jitter = (Math.random() - 0.5) * seg * 0.6;
  const base = Math.ceil(current / 360) * 360;
  return base + 360 * 6 + (360 - center) + jitter;
}
