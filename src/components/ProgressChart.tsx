import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface ProgressChartProps {
  data: { semana: number; pct: number }[]
  titulo?: string
}

export function ProgressChart({
  data,
  titulo = 'Progreso por semana (1–20)',
}: ProgressChartProps) {
  return (
    <section className="chart-panel">
      <header className="section-head">
        <h3>{titulo}</h3>
        <p>Cumplimiento de foros, tareas y parciales por semana del ciclo</p>
      </header>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="fillRed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e10600" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#e10600" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="semana"
              tick={{ fill: '#6b6b6b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval={1}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: '#6b6b6b', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: '#141414',
                border: '1px solid #2a2a2a',
                borderRadius: 6,
                fontSize: 12,
              }}
              labelFormatter={(d) => `Semana ${d}`}
              formatter={(value) => [`${value}%`, 'Progreso']}
            />
            <Area
              type="monotone"
              dataKey="pct"
              stroke="#e10600"
              strokeWidth={2}
              fill="url(#fillRed)"
              animationDuration={900}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
