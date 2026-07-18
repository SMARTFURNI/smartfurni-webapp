"use client";

import { useId } from "react";

interface BedSVGProps {
  headAngle?: number;
  footAngle?: number;
  ledColor?: string;
  ledOn?: boolean;
  size?: number;
  className?: string;
}

type Point3D = { x: number; y: number; z: number };
type Point2D = { x: number; y: number };
type MattressPanel = {
  id: "head" | "seat" | "knee" | "foot";
  start: Point3D;
  end: Point3D;
};

const BED_WIDTH = 206;
const MATTRESS_HEIGHT = 30;

function project({ x, y, z }: Point3D): Point2D {
  return {
    x: 151 + x * 0.91 - y * 0.36,
    y: 243 + x * 0.145 + y * 0.285 - z * 0.79,
  };
}

function points(values: Point3D[]) {
  return values
    .map((value) => {
      const point = project(value);
      return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    })
    .join(" ");
}

function interpolate(start: Point3D, end: Point3D, amount: number): Point3D {
  return {
    x: start.x + (end.x - start.x) * amount,
    y: start.y + (end.y - start.y) * amount,
    z: start.z + (end.z - start.z) * amount,
  };
}

function MattressSection({
  panel,
  gradientId,
  sideGradientId,
  seamId,
}: {
  panel: MattressPanel;
  gradientId: string;
  sideGradientId: string;
  seamId: string;
}) {
  const backY = 7;
  const frontY = BED_WIDTH;
  const topStartBack = { ...panel.start, y: backY, z: panel.start.z + MATTRESS_HEIGHT };
  const topEndBack = { ...panel.end, y: backY, z: panel.end.z + MATTRESS_HEIGHT };
  const topEndFront = { ...panel.end, y: frontY, z: panel.end.z + MATTRESS_HEIGHT };
  const topStartFront = { ...panel.start, y: frontY, z: panel.start.z + MATTRESS_HEIGHT };
  const bottomEndFront = { ...panel.end, y: frontY, z: panel.end.z };
  const bottomStartFront = { ...panel.start, y: frontY, z: panel.start.z };
  const topStart = project(topStartBack);
  const topEnd = project(topEndBack);
  const surfaceAngle = Math.atan2(topEnd.y - topStart.y, topEnd.x - topStart.x) * (180 / Math.PI);
  const sectionLength = Math.hypot(topEnd.x - topStart.x, topEnd.y - topStart.y);
  const tuftColumns = sectionLength > 120 ? [0.18, 0.39, 0.61, 0.82] : [0.25, 0.5, 0.75];
  const tuftRows = [0.2, 0.5, 0.8];

  return (
    <g className={`bed-3d-panel bed-3d-panel--${panel.id}`}>
      <polygon
        points={points([topStartFront, topEndFront, bottomEndFront, bottomStartFront])}
        fill={`url(#${sideGradientId})`}
        stroke="#a69f91"
        strokeWidth="1.2"
      />

      {panel.id === "head" && (
        <polygon
          points={points([
            topStartBack,
            topStartFront,
            bottomStartFront,
            { ...panel.start, y: backY, z: panel.start.z },
          ])}
          fill="#cfc8bc"
          stroke="#aaa294"
          strokeWidth="1.2"
        />
      )}

      {panel.id === "foot" && (
        <polygon
          points={points([
            topEndBack,
            topEndFront,
            bottomEndFront,
            { ...panel.end, y: backY, z: panel.end.z },
          ])}
          fill="#b8b1a5"
          stroke="#999183"
          strokeWidth="1.2"
        />
      )}

      <polygon
        points={points([topStartBack, topEndBack, topEndFront, topStartFront])}
        fill={`url(#${gradientId})`}
        stroke="#f8f4e9"
        strokeWidth="2.1"
        strokeLinejoin="round"
        filter={`url(#${seamId})`}
      />

      {(() => {
        const splitStart = project({ ...panel.start, y: (backY + frontY) / 2, z: panel.start.z + MATTRESS_HEIGHT + 1 });
        const splitEnd = project({ ...panel.end, y: (backY + frontY) / 2, z: panel.end.z + MATTRESS_HEIGHT + 1 });
        return (
          <g>
            <line x1={splitStart.x} y1={splitStart.y} x2={splitEnd.x} y2={splitEnd.y} stroke="#837c71" strokeOpacity=".42" strokeWidth="3.2" />
            <line x1={splitStart.x} y1={splitStart.y - 1.1} x2={splitEnd.x} y2={splitEnd.y - 1.1} stroke="#fffdf6" strokeOpacity=".78" strokeWidth="1.4" />
          </g>
        );
      })()}

      {[0.25, 0.5, 0.75].map((amount) => {
        const start = interpolate(topStartBack, topStartFront, amount);
        const end = interpolate(topEndBack, topEndFront, amount);
        return (
          <line
            key={`row-${amount}`}
            x1={project(start).x}
            y1={project(start).y}
            x2={project(end).x}
            y2={project(end).y}
            stroke="#b7b0a3"
            strokeOpacity=".25"
            strokeWidth="1"
          />
        );
      })}

      {tuftColumns.map((column) =>
        tuftRows.map((row) => {
          const axisPoint = interpolate(panel.start, panel.end, column);
          const tuft = project({
            ...axisPoint,
            y: backY + (frontY - backY) * row,
            z: axisPoint.z + MATTRESS_HEIGHT + 1,
          });
          return (
            <g key={`${column}-${row}`} transform={`rotate(${surfaceAngle} ${tuft.x} ${tuft.y})`}>
              <ellipse cx={tuft.x} cy={tuft.y + 1.4} rx="8.2" ry="4.4" fill="#8f887c" opacity=".18" />
              <ellipse cx={tuft.x} cy={tuft.y} rx="5.4" ry="2.8" fill="#d1cabd" />
              <ellipse cx={tuft.x - 1.2} cy={tuft.y - 0.8} rx="2.5" ry="1.2" fill="#fffdf6" opacity=".9" />
            </g>
          );
        }),
      )}

      <line
        x1={project(topStartFront).x}
        y1={project(topStartFront).y}
        x2={project(topEndFront).x}
        y2={project(topEndFront).y}
        stroke="#fffdf6"
        strokeOpacity=".85"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </g>
  );
}

function FrameLeg({ x, y, filterId }: { x: number; y: number; filterId: string }) {
  const top = project({ x, y, z: -29 });
  const bottom = project({ x, y, z: -75 });
  return (
    <g filter={`url(#${filterId})`}>
      <line x1={top.x} y1={top.y} x2={bottom.x} y2={bottom.y} stroke="#050607" strokeWidth="15" strokeLinecap="round" />
      <line x1={top.x - 2} y1={top.y} x2={bottom.x - 2} y2={bottom.y} stroke="#5f6264" strokeOpacity=".42" strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx={bottom.x} cy={bottom.y + 2} rx="10" ry="4" fill="#030404" />
    </g>
  );
}

export default function BedSVG({
  headAngle = 0,
  footAngle = 0,
  ledColor = "#C9A84C",
  ledOn = false,
  size = 760,
  className = "",
}: BedSVGProps) {
  const rawId = useId().replace(/:/g, "");
  const ids = {
    top: `bed-top-${rawId}`,
    side: `bed-side-${rawId}`,
    frame: `bed-frame-${rawId}`,
    frameSide: `bed-frame-side-${rawId}`,
    shadow: `bed-shadow-${rawId}`,
    seam: `bed-seam-${rawId}`,
    glow: `bed-glow-${rawId}`,
    leg: `bed-leg-${rawId}`,
  };
  const W = size;
  const H = size * (440 / 760);
  const safeHeadAngle = Math.max(0, Math.min(70, headAngle));
  const safeFootAngle = Math.max(0, Math.min(45, footAngle));
  const headRadians = (safeHeadAngle * Math.PI) / 180;
  const footRadians = (safeFootAngle * Math.PI) / 180;
  const calfRadians = footRadians * 0.48;

  const headHinge = 205;
  const centerEnd = 295;
  const kneeLength = 105;
  const footLength = 105;
  const headStart = {
    x: headHinge - headHinge * Math.cos(headRadians),
    y: 0,
    z: headHinge * Math.sin(headRadians),
  };
  const headEnd = { x: headHinge, y: 0, z: 0 };
  const kneeStart = { x: centerEnd, y: 0, z: 0 };
  const kneeEnd = {
    x: centerEnd + kneeLength * Math.cos(footRadians),
    y: 0,
    z: kneeLength * Math.sin(footRadians),
  };
  const footEnd = {
    x: kneeEnd.x + footLength * Math.cos(calfRadians),
    y: 0,
    z: Math.max(0, kneeEnd.z - footLength * Math.sin(calfRadians)),
  };
  const panels: MattressPanel[] = [
    { id: "head", start: headStart, end: headEnd },
    { id: "seat", start: headEnd, end: kneeStart },
    { id: "knee", start: kneeStart, end: kneeEnd },
    { id: "foot", start: kneeEnd, end: footEnd },
  ];

  const frameTop = [
    { x: -18, y: -1, z: -10 },
    { x: 528, y: -1, z: -10 },
    { x: 528, y: 222, z: -10 },
    { x: -18, y: 222, z: -10 },
  ];
  const frameFrontBottom = [
    { x: -18, y: 222, z: -10 },
    { x: 528, y: 222, z: -10 },
    { x: 528, y: 222, z: -34 },
    { x: -18, y: 222, z: -34 },
  ];
  const frameRight = [
    { x: 528, y: -1, z: -10 },
    { x: 528, y: 222, z: -10 },
    { x: 528, y: 222, z: -34 },
    { x: 528, y: -1, z: -34 },
  ];
  const frameRails: [Point3D, Point3D][] = [
    [{ x: -18, y: 4, z: -8 }, { x: 528, y: 4, z: -8 }],
    [{ x: -18, y: 218, z: -8 }, { x: 528, y: 218, z: -8 }],
    [{ x: -14, y: 4, z: -8 }, { x: -14, y: 218, z: -8 }],
    [{ x: 524, y: 4, z: -8 }, { x: 524, y: 218, z: -8 }],
  ];
  const crossRails: [Point3D, Point3D][] = [
    [{ x: 135, y: 15, z: -3 }, { x: 135, y: 207, z: -3 }],
    [{ x: 280, y: 15, z: -3 }, { x: 280, y: 207, z: -3 }],
    [{ x: 420, y: 15, z: -3 }, { x: 420, y: 207, z: -3 }],
  ];
  const headSupportTop = interpolate(headStart, headEnd, 0.48);
  const kneeSupportTop = interpolate(kneeStart, kneeEnd, 0.72);
  const headSupportBase = project({ x: 175, y: 116, z: -7 });
  const headSupport = project({ ...headSupportTop, y: 116, z: headSupportTop.z - 3 });
  const kneeSupportBase = project({ x: 350, y: 116, z: -7 });
  const kneeSupport = project({ ...kneeSupportTop, y: 116, z: kneeSupportTop.z - 4 });

  return (
    <svg
      width={W}
      height={H}
      viewBox="0 0 760 440"
      className={className}
      role="img"
      aria-label={`Mô hình 3D giường SmartFurni, đầu giường ${Math.round(safeHeadAngle)} độ, chân giường ${Math.round(safeFootAngle)} độ`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block", maxWidth: "100%", height: "auto" }}
    >
      <title>Mô hình 3D giường công thái học điều chỉnh điện SmartFurni</title>
      <defs>
        <linearGradient id={ids.top} x1="12%" y1="0%" x2="88%" y2="100%">
          <stop offset="0%" stopColor="#fffef9" />
          <stop offset="36%" stopColor="#f4f0e7" />
          <stop offset="72%" stopColor="#ded8cc" />
          <stop offset="100%" stopColor="#c7c0b4" />
        </linearGradient>
        <linearGradient id={ids.side} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ddd7cc" />
          <stop offset="52%" stopColor="#bfb8ac" />
          <stop offset="100%" stopColor="#8f887e" />
        </linearGradient>
        <linearGradient id={ids.frame} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#45494c" />
          <stop offset="28%" stopColor="#24272a" />
          <stop offset="72%" stopColor="#101214" />
          <stop offset="100%" stopColor="#050607" />
        </linearGradient>
        <linearGradient id={ids.frameSide} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1d2022" />
          <stop offset="100%" stopColor="#050607" />
        </linearGradient>
        <filter id={ids.shadow} x="-35%" y="-45%" width="170%" height="210%">
          <feDropShadow dx="0" dy="16" stdDeviation="15" floodColor="#000" floodOpacity=".65" />
        </filter>
        <filter id={ids.seam} x="-10%" y="-14%" width="120%" height="132%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.8" floodColor="#16181a" floodOpacity=".22" />
        </filter>
        <filter id={ids.glow} x="-80%" y="-250%" width="260%" height="600%">
          <feGaussianBlur stdDeviation="13" />
        </filter>
        <filter id={ids.leg} x="-80%" y="-25%" width="260%" height="170%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity=".65" />
        </filter>
      </defs>

      <ellipse cx="360" cy="384" rx="275" ry="34" fill="#000" opacity=".36" filter={`url(#${ids.shadow})`} />
      {ledOn && (
        <ellipse cx="360" cy="375" rx="248" ry="15" fill={ledColor} opacity=".42" filter={`url(#${ids.glow})`} />
      )}

      <FrameLeg x={6} y={19} filterId={ids.leg} />
      <FrameLeg x={506} y={19} filterId={ids.leg} />
      <FrameLeg x={4} y={205} filterId={ids.leg} />
      <FrameLeg x={506} y={205} filterId={ids.leg} />

      <g filter={`url(#${ids.shadow})`}>
        <polygon points={points(frameTop)} fill="#090b0d" fillOpacity=".34" stroke="#5b5e60" strokeOpacity=".32" strokeWidth="1" />
        <polygon points={points(frameRight)} fill="#08090a" stroke="#404346" strokeWidth="1" />
        <polygon points={points(frameFrontBottom)} fill={`url(#${ids.frameSide})`} stroke="#3b3e40" strokeWidth="1.1" />

        {crossRails.map(([start, end], index) => {
          const startPoint = project(start);
          const endPoint = project(end);
          return <line key={`cross-${index}`} x1={startPoint.x} y1={startPoint.y} x2={endPoint.x} y2={endPoint.y} stroke="#202326" strokeWidth="10" strokeLinecap="round" />;
        })}
        {frameRails.map(([start, end], index) => {
          const startPoint = project(start);
          const endPoint = project(end);
          return (
            <g key={`rail-${index}`}>
              <line x1={startPoint.x} y1={startPoint.y} x2={endPoint.x} y2={endPoint.y} stroke="#08090a" strokeWidth="16" strokeLinecap="round" />
              <line x1={startPoint.x} y1={startPoint.y - 1} x2={endPoint.x} y2={endPoint.y - 1} stroke="#686c6f" strokeOpacity=".42" strokeWidth="2.2" strokeLinecap="round" />
            </g>
          );
        })}

        {ledOn && (
          <line
            x1={project({ x: -10, y: 223, z: -28 }).x}
            y1={project({ x: -10, y: 223, z: -28 }).y}
            x2={project({ x: 520, y: 223, z: -28 }).x}
            y2={project({ x: 520, y: 223, z: -28 }).y}
            stroke={ledColor}
            strokeOpacity=".78"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        )}

        <g opacity={safeHeadAngle > 2 ? 1 : .18}>
          <line x1={headSupportBase.x} y1={headSupportBase.y} x2={headSupport.x} y2={headSupport.y} stroke="#050607" strokeWidth="13" strokeLinecap="round" />
          <line x1={headSupportBase.x} y1={headSupportBase.y} x2={headSupport.x} y2={headSupport.y} stroke="#777b7d" strokeOpacity=".52" strokeWidth="2.3" strokeLinecap="round" />
          <circle cx={headSupportBase.x} cy={headSupportBase.y} r="8" fill="#08090a" stroke="#5f6264" strokeWidth="2" />
          <circle cx={headSupport.x} cy={headSupport.y} r="7" fill="#08090a" stroke="#5f6264" strokeWidth="2" />
        </g>
        <g opacity={safeFootAngle > 2 ? 1 : .18}>
          <line x1={kneeSupportBase.x} y1={kneeSupportBase.y} x2={kneeSupport.x} y2={kneeSupport.y} stroke="#050607" strokeWidth="13" strokeLinecap="round" />
          <line x1={kneeSupportBase.x} y1={kneeSupportBase.y} x2={kneeSupport.x} y2={kneeSupport.y} stroke="#777b7d" strokeOpacity=".52" strokeWidth="2.3" strokeLinecap="round" />
          <circle cx={kneeSupportBase.x} cy={kneeSupportBase.y} r="8" fill="#08090a" stroke="#5f6264" strokeWidth="2" />
          <circle cx={kneeSupport.x} cy={kneeSupport.y} r="7" fill="#08090a" stroke="#5f6264" strokeWidth="2" />
        </g>

        {panels.map((panel) => (
          <MattressSection
            key={panel.id}
            panel={panel}
            gradientId={ids.top}
            sideGradientId={ids.side}
            seamId={ids.seam}
          />
        ))}
      </g>

      <g className="bed-3d-brand-mark" opacity=".72">
        <path d="M331 368h65" stroke="#d8bb63" strokeWidth="1.4" />
        <path d="M358 363l5-5 5 5-5 5z" fill="#d8bb63" />
        <text x="363" y="383" textAnchor="middle" fill="#e3cc87" fontFamily="Inter, sans-serif" fontSize="8" fontWeight="700" letterSpacing="3.2">SMARTFURNI</text>
      </g>
    </svg>
  );
}
