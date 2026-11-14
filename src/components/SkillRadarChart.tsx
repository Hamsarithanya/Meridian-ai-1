import React, { useState } from 'react';
import { AppTheme, APP_THEMES } from '../themes';
import { SkillAuditItem } from '../types';

interface SkillRadarChartProps {
  audits: SkillAuditItem[];
  onSelectSkill?: (skill: SkillAuditItem) => void;
  theme?: AppTheme;
}

export const SkillRadarChart: React.FC<SkillRadarChartProps> = ({
  audits,
  onSelectSkill,
  theme = APP_THEMES[0],
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const items = audits.slice(0, 8);
  const count = items.length;
  if (count < 3) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm text-slate-500">
        Add at least 3 role requirements to render the competency radar.
      </div>
    );
  }

  const size = 340;
  const center = size / 2;
  const radius = 112;
  const rings = [25, 50, 75, 100];

  const polarToCartesian = (angleIndex: number, valuePercent: number) => {
    const angle = (Math.PI * 2 * angleIndex) / count - Math.PI / 2;
    const r = (valuePercent / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const targetPoints = items
    .map((item, idx) => {
      const pt = polarToCartesian(idx, item.targetLevel);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(' ');

  const currentPoints = items
    .map((item, idx) => {
      const pt = polarToCartesian(idx, item.currentLevel);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    })
    .join(' ');

  const activeItem = hoveredIdx !== null ? items[hoveredIdx] : null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
      <div className="relative flex flex-1 items-center justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="h-[310px] w-[310px] max-w-full overflow-visible"
          role="img"
          aria-label="Competency radar comparing current mastery against target role requirements"
        >
          {/* Concentric benchmark rings */}
          {rings.map((ring) => {
            const ringPts = items
              .map((_, idx) => {
                const pt = polarToCartesian(idx, ring);
                return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
              })
              .join(' ');
            return (
              <polygon
                key={ring}
                points={ringPts}
                fill="none"
                stroke={theme.radarGridStroke}
                strokeWidth="1"
              />
            );
          })}

          {/* Axis spokes and labels */}
          {items.map((item, idx) => {
            const outer = polarToCartesian(idx, 100);
            const labelPos = polarToCartesian(idx, 121);
            const isHovered = hoveredIdx === idx;

            return (
              <g
                key={item.skill}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onSelectSkill?.(item)}
              >
                <line
                  x1={center}
                  y1={center}
                  x2={outer.x}
                  y2={outer.y}
                  stroke={isHovered ? theme.radarCurrentStroke : theme.radarGridStroke}
                  strokeWidth={isHovered ? '1.5' : '1'}
                />
                <text
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor={
                    Math.abs(labelPos.x - center) < 12
                      ? 'middle'
                      : labelPos.x > center
                        ? 'start'
                        : 'end'
                  }
                  dominantBaseline="middle"
                  className={`text-[11px] font-medium transition-colors ${
                    isHovered
                      ? 'font-semibold'
                      : theme.isDark
                        ? 'fill-slate-300'
                        : 'fill-slate-600'
                  }`}
                  style={isHovered ? { fill: theme.radarCurrentStroke } : undefined}
                >
                  {item.skill}
                </text>
              </g>
            );
          })}

          {/* Target role benchmark polygon */}
          <polygon
            points={targetPoints}
            fill={theme.radarTargetFill}
            stroke={theme.radarTargetStroke}
            strokeWidth="1.75"
            strokeDasharray="5 4"
          />

          {/* Current mastery polygon */}
          <polygon
            points={currentPoints}
            fill={theme.radarCurrentFill}
            stroke={theme.radarCurrentStroke}
            strokeWidth="2.25"
          />

          {/* Interactive nodes */}
          {items.map((item, idx) => {
            const curPt = polarToCartesian(idx, item.currentLevel);
            const tgtPt = polarToCartesian(idx, item.targetLevel);
            const isHovered = hoveredIdx === idx;
            return (
              <g
                key={`nodes-${item.skill}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => onSelectSkill?.(item)}
              >
                <circle
                  cx={tgtPt.x}
                  cy={tgtPt.y}
                  r={isHovered ? 4.5 : 3}
                  fill={theme.radarTargetStroke}
                />
                <circle
                  cx={curPt.x}
                  cy={curPt.y}
                  r={isHovered ? 6 : 4.5}
                  fill={theme.radarCurrentStroke}
                  stroke={theme.isDark ? '#0F172A' : '#FFFFFF'}
                  strokeWidth="1.75"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend & Hovered Skill Inspector */}
      <div className="flex w-full flex-col justify-between gap-4 border-t border-slate-200 pt-4 lg:w-56 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
        <div className="space-y-2 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: theme.radarCurrentStroke }}
            />
            <span className="font-medium text-slate-800">Current Mastery</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-0.5 w-3 border-t-2 border-dashed"
              style={{ borderColor: theme.radarTargetStroke }}
            />
            <span className="font-medium text-slate-800">Role Benchmark</span>
          </div>
        </div>

        <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3.5">
          {activeItem ? (
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-[#2563EB]">{activeItem.category}</div>
              <div className="text-sm font-semibold text-slate-900">{activeItem.skill}</div>
              <div className="flex items-baseline gap-2.5 pt-1 font-mono text-xs tabular-nums">
                <span className="text-[#2563EB] font-semibold">Now {activeItem.currentLevel}%</span>
                <span className="text-slate-400">/</span>
                <span className="text-[#EA580C] font-semibold">Goal {activeItem.targetLevel}%</span>
              </div>
              <p className="pt-1 text-xs leading-relaxed text-slate-600">
                {activeItem.rationale}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-700">Inspect Any Axis</div>
              <p className="text-xs leading-relaxed text-slate-500">
                Hover or click a skill node on the radar to inspect current vs. target readiness and evidence rationale.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
