import { useEffect, useState, useRef } from 'react';
import './DonutChart.css';

interface DonutChartProps {
  percentage: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  animated?: boolean;
  delay?: number;
  showLabel?: boolean;
  labelSize?: number;
}

export default function DonutChart({
  percentage,
  color,
  size = 160,
  strokeWidth = 16,
  animated = true,
  delay = 0,
  showLabel = true,
  labelSize,
}: DonutChartProps) {
  const [displayPct, setDisplayPct] = useState(animated ? 0 : percentage);
  const [strokeOffset, setStrokeOffset] = useState(animated ? 0 : percentage / 100);
  const ref = useRef<SVGSVGElement>(null);
  const hasAnimated = useRef(false);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - strokeOffset);

  useEffect(() => {
    if (!animated || hasAnimated.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayPct(percentage);
      setStrokeOffset(percentage / 100);
      return;
    }

    const timer = setTimeout(() => {
      hasAnimated.current = true;
      setStrokeOffset(percentage / 100);

      // Animate number
      const duration = 1200;
      const start = performance.now();
      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayPct(Math.round(eased * percentage));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }, delay);

    return () => clearTimeout(timer);
  }, [percentage, animated, delay]);

  const fontSize = labelSize ?? Math.round(size * 0.22);

  return (
    <svg
      ref={ref}
      className="donut-chart"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--border)"
        strokeWidth={strokeWidth}
      />
      {/* Filled arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="donut-chart__fill"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {/* Center label */}
      {showLabel && (
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="donut-chart__label"
          style={{ fontSize: `${fontSize}px`, fill: color }}
        >
          {displayPct}%
        </text>
      )}
    </svg>
  );
}
