"use client";

interface BedSVGProps {
  headAngle?: number;
  footAngle?: number;
  ledColor?: string;
  ledOn?: boolean;
  size?: number;
  className?: string;
}

export default function BedSVG({
  headAngle = 0,
  footAngle = 0,
  ledColor = "#C9A84C",
  ledOn = false,
  size = 400,
  className = "",
}: BedSVGProps) {
  const W = size;
  const H = size * 0.55;
  const cx = W / 2;
  const cy = H * 0.65;

  // Bed frame base
  const frameY = cy;
  const frameH = H * 0.18;
  const frameW = W * 0.82;
  const frameX = (W - frameW) / 2;

  // Head section (left side, rotates up)
  const headW = frameW * 0.42;
  const headPivotX = frameX + headW;
  const headPivotY = frameY;
  const headRad = (-headAngle * Math.PI) / 180;

  // Foot section (right side, rotates up)
  const footW = frameW * 0.35;
  const footPivotX = frameX + frameW - footW;
  const footPivotY = frameY;
  const footRad = (-footAngle * Math.PI) / 180;

  // Head mattress points
  const hx0 = headPivotX - headW;
  const hy0 = headPivotY;
  const hx1 = headPivotX;
  const hy1 = headPivotY;
  const hx0r = headPivotX + (hx0 - headPivotX) * Math.cos(headRad) - (hy0 - headPivotY) * Math.sin(headRad);
  const hy0r = headPivotY + (hx0 - headPivotX) * Math.sin(headRad) + (hy0 - headPivotY) * Math.cos(headRad);

  // Foot mattress points
  const fx0 = footPivotX;
  const fy0 = footPivotY;
  const fx1 = footPivotX + footW;
  const fy1 = footPivotY;
  const fx1r = footPivotX + (fx1 - footPivotX) * Math.cos(-footRad) - (fy1 - footPivotY) * Math.sin(-footRad);
  const fy1r = footPivotY + (fx1 - footPivotX) * Math.sin(-footRad) + (fy1 - footPivotY) * Math.cos(-footRad);

  const mattressThickness = H * 0.09;

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className={className}
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E2C97E" />
          <stop offset="100%" stopColor="#9A7A2E" />
        </linearGradient>
        <linearGradient id="mattressGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2A2200" />
          <stop offset="100%" stopColor="#1A1600" />
        </linearGradient>
        {ledOn && (
          <filter id="ledGlow">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        )}
      </defs>

      {/* LED underglow */}
      {ledOn && (
        <ellipse
          cx={cx}
          cy={frameY + frameH + 8}
          rx={frameW * 0.45}
          ry={10}
          fill={ledColor}
          opacity={0.25}
          filter="url(#ledGlow)"
        />
      )}

      {/* Bed frame base */}
      <rect
        x={frameX}
        y={frameY}
        width={frameW}
        height={frameH}
        rx={6}
        fill="url(#goldGrad)"
        opacity={0.9}
      />

      {/* Legs */}
      {[frameX + 16, frameX + frameW - 16].map((lx, i) => (
        <rect key={i} x={lx - 5} y={frameY + frameH} width={10} height={H * 0.12} rx={3} fill="url(#goldGrad)" opacity={0.7} />
      ))}

      {/* Middle section mattress (flat) */}
      <rect
        x={headPivotX}
        y={frameY - mattressThickness}
        width={footPivotX - headPivotX}
        height={mattressThickness}
        rx={2}
        fill="url(#mattressGrad)"
        stroke="#C9A84C"
        strokeWidth={0.8}
        strokeOpacity={0.5}
      />

      {/* Head mattress (rotated) */}
      <g transform={`rotate(${headAngle}, ${headPivotX}, ${headPivotY})`}>
        <rect
          x={hx0}
          y={frameY - mattressThickness}
          width={headW}
          height={mattressThickness}
          rx={2}
          fill="url(#mattressGrad)"
          stroke="#C9A84C"
          strokeWidth={0.8}
          strokeOpacity={0.5}
        />
        {/* Pillow */}
        <rect
          x={hx0 + 8}
          y={frameY - mattressThickness - 10}
          width={headW * 0.6}
          height={10}
          rx={4}
          fill="#2E2800"
          stroke="#C9A84C"
          strokeWidth={0.5}
          strokeOpacity={0.4}
        />
      </g>

      {/* Foot mattress (rotated) */}
      <g transform={`rotate(${-footAngle}, ${footPivotX}, ${footPivotY})`}>
        <rect
          x={footPivotX}
          y={frameY - mattressThickness}
          width={footW}
          height={mattressThickness}
          rx={2}
          fill="url(#mattressGrad)"
          stroke="#C9A84C"
          strokeWidth={0.8}
          strokeOpacity={0.5}
        />
      </g>

      {/* Headboard */}
      <rect
        x={frameX - 8}
        y={frameY - H * 0.28}
        width={14}
        height={H * 0.28}
        rx={4}
        fill="url(#goldGrad)"
        opacity={0.8}
      />

      {/* LED strip */}
      {ledOn && (
        <rect
          x={frameX}
          y={frameY + frameH - 3}
          width={frameW}
          height={3}
          rx={1.5}
          fill={ledColor}
          opacity={0.8}
          filter="url(#ledGlow)"
        />
      )}

      {/* Angle labels */}
      {headAngle > 0 && (
        <text
          x={frameX + headW * 0.5}
          y={frameY - mattressThickness - 18}
          textAnchor="middle"
          fill="#C9A84C"
          fontSize={11}
          fontFamily="Inter, sans-serif"
          transform={`rotate(${headAngle}, ${headPivotX}, ${headPivotY})`}
        >
          {Math.round(headAngle)}°
        </text>
      )}
      {footAngle > 0 && (
        <text
          x={footPivotX + footW * 0.5}
          y={frameY - mattressThickness - 18}
          textAnchor="middle"
          fill="#C9A84C"
          fontSize={11}
          fontFamily="Inter, sans-serif"
          transform={`rotate(${-footAngle}, ${footPivotX}, ${footPivotY})`}
        >
          {Math.round(footAngle)}°
        </text>
      )}
    </svg>
  );
}
