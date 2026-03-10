'use client'

interface RadarChartProps {
  data: Record<string, number>   // e.g. { Fisica: 8.0, Tecnica: 7.0, ... }
  colors: Record<string, string> // same keys as data
  size?: number                   // default 220
  maxValue?: number               // default 10
}

export function RadarChart({ data, colors, size = 220, maxValue = 10 }: RadarChartProps) {
  const keys = Object.keys(data)
  const n = keys.length
  if (n < 3) return null

  const cx = size / 2
  const cy = size / 2
  const r = size * 0.36
  const labelR = size * 0.48

  function angle(i: number) {
    return (Math.PI * 2 * i) / n - Math.PI / 2
  }

  function point(i: number, value: number) {
    const ratio = Math.min(value / maxValue, 1)
    const a = angle(i)
    return { x: cx + r * ratio * Math.cos(a), y: cy + r * ratio * Math.sin(a) }
  }

  function outerPoint(i: number) {
    const a = angle(i)
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
  }

  function labelPoint(i: number) {
    const a = angle(i)
    return { x: cx + labelR * Math.cos(a), y: cy + labelR * Math.sin(a) }
  }

  const dataPoints = keys.map((k, i) => point(i, data[k] ?? 0))
  const polyPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z'

  const gridLevels = [0.25, 0.5, 0.75, 1.0]

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      {gridLevels.map((level, li) => {
        const pts = keys.map((_, i) => {
          const a = angle(i)
          return `${cx + r * level * Math.cos(a)},${cy + r * level * Math.sin(a)}`
        })
        return (
          <polygon
            key={li}
            points={pts.join(' ')}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
        )
      })}

      {keys.map((_, i) => {
        const op = outerPoint(i)
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={op.x} y2={op.y}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={1}
          />
        )
      })}

      <path
        d={polyPath}
        fill="rgba(200,255,107,0.15)"
        stroke="var(--color-primary)"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {keys.map((k, i) => {
        const p = point(i, data[k] ?? 0)
        const color = colors[k] ?? 'var(--color-primary)'
        return (
          <circle key={k} cx={p.x} cy={p.y} r={4} fill={color} stroke="var(--color-bg)" strokeWidth={1.5} />
        )
      })}

      {keys.map((k, i) => {
        const lp = labelPoint(i)
        const color = colors[k] ?? 'var(--color-text-2)'
        const cosVal = Math.cos(angle(i))
        const sinVal = Math.sin(angle(i))
        const anchor = Math.abs(cosVal) < 0.1 ? 'middle' : cosVal > 0 ? 'start' : 'end'
        const dy = Math.abs(sinVal) > 0.7 ? (sinVal > 0 ? '1em' : '-0.3em') : '0.35em'
        return (
          <text
            key={k}
            x={lp.x}
            y={lp.y}
            textAnchor={anchor}
            dy={dy}
            fontSize={9}
            fontFamily="var(--font-display)"
            fontWeight={700}
            fill={color}
            style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            {k}
          </text>
        )
      })}
    </svg>
  )
}
