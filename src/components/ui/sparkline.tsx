import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { useTheme } from '@/theme';

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  /** Semantic tone or explicit hex. */
  tone?: 'primary' | 'positive' | 'negative' | string;
  strokeWidth?: number;
  /** Soft gradient fill under the line. */
  filled?: boolean;
}

interface Point {
  x: number;
  y: number;
}

/** Catmull-Rom → cubic Bézier for a calm, organic curve. */
function smoothPath(points: Point[]): string {
  if (points.length === 0) return '';
  const first = points[0];
  if (!first) return '';
  if (points.length === 1) return `M ${first.x} ${first.y}`;

  let d = `M ${first.x} ${first.y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

let gradientCounter = 0;

/** Tiny trend line for StatCards and list rows. Pure SVG, no chart lib. */
export function Sparkline({
  data,
  width = 96,
  height = 36,
  tone = 'primary',
  strokeWidth = 2,
  filled = true,
}: SparklineProps) {
  const { colors } = useTheme();
  const color =
    tone === 'primary'
      ? colors.primary
      : tone === 'positive'
        ? colors.positive
        : tone === 'negative'
          ? colors.negative
          : tone;

  const gradientId = useMemo(() => `spark-${++gradientCounter}`, []);

  const { linePath, areaPath } = useMemo(() => {
    if (data.length < 2) return { linePath: '', areaPath: '' };
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const inset = strokeWidth;
    const usableH = height - inset * 2;

    const points: Point[] = data.map((value, i) => ({
      x: (i / (data.length - 1)) * width,
      y: inset + (1 - (value - min) / range) * usableH,
    }));

    const line = smoothPath(points);
    const last = points[points.length - 1]!;
    const firstPt = points[0]!;
    const area = `${line} L ${last.x} ${height} L ${firstPt.x} ${height} Z`;
    return { linePath: line, areaPath: area };
  }, [data, width, height, strokeWidth]);

  if (!linePath) return <View style={{ width, height }} />;

  return (
    <Svg width={width} height={height} pointerEvents="none">
      {filled ? (
        <>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.22} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={areaPath} fill={`url(#${gradientId})`} />
        </>
      ) : null}
      <Path
        d={linePath}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
