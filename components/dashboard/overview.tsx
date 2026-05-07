"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

const data = [
  {
    name: "Seg",
    total: Math.floor(Math.random() * 500) + 100,
  },
  {
    name: "Ter",
    total: Math.floor(Math.random() * 500) + 100,
  },
  {
    name: "Qua",
    total: Math.floor(Math.random() * 500) + 100,
  },
  {
    name: "Qui",
    total: Math.floor(Math.random() * 500) + 100,
  },
  {
    name: "Sex",
    total: Math.floor(Math.random() * 500) + 100,
  },
  {
    name: "Sáb",
    total: Math.floor(Math.random() * 500) + 100,
  },
  {
    name: "Dom",
    total: Math.floor(Math.random() * 500) + 100,
  },
]

export function Overview() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis
          dataKey="name"
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value}`}
        />
        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', backgroundColor: '#333', color: '#fff' }} />
        <Bar
          dataKey="total"
          fill="currentColor"
          radius={[4, 4, 0, 0]}
          className="fill-primary"
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
