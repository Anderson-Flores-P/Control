import { useEffect, useState } from 'react'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function formatParts(d: Date) {
  return {
    iso: d.toISOString(),
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
    date: d.toLocaleDateString('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
  }
}

export function LiveClock() {
  const [now, setNow] = useState(() => formatParts(new Date()))

  useEffect(() => {
    const tick = () => setNow(formatParts(new Date()))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <time
      className="live-clock"
      dateTime={now.iso}
      aria-live="polite"
      aria-atomic="true"
      title="Hora local"
    >
      <span className="live-clock-time">{now.time}</span>
      <span className="live-clock-date">{now.date}</span>
    </time>
  )
}
