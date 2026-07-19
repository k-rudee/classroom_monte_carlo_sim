import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const tip = {
  background: '#fffdf8',
  border: '1px solid #d6d0c2',
  borderRadius: 4,
  fontSize: 12,
  color: '#1c1917',
};

const axis = { fill: '#78716c', fontSize: 11 };
const grid = '#efe9dc';

export function Day1PmfChart({ pmf, mean }) {
  if (!pmf?.length) return null;
  const data = pmf.filter((d) => d.k <= 10);
  return (
    <div className="chart-panel">
      <h3>Fig 1 · Day-1 secondary cases</h3>
      <p className="sub">
        Binomial(n=60, p) PMF. E[K]={mean?.toFixed(2)}. Most mass is on 0 to 2 kids.
      </p>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 6, right: 6, left: -6, bottom: 0 }}>
            <CartesianGrid stroke={grid} vertical={false} />
            <XAxis dataKey="k" tick={axis} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={(v) => v.toFixed(2)}
              tick={axis}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip contentStyle={tip} formatter={(v) => [Number(v).toFixed(4), 'P(K=k)']} />
            <Bar dataKey="pmf" fill="#4338ca" radius={[2, 2, 0, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DailyIncidenceChart({ without, withImm }) {
  if (!without?.length) return null;
  const maxDay = Math.max(without.length, withImm?.length || 0, 1);
  const data = [];
  for (let i = 0; i < Math.min(maxDay, 45); i++) {
    data.push({
      day: i + 1,
      none: without[i]?.expected ?? 0,
      noneLo: without[i]?.p25 ?? 0,
      noneHi: without[i]?.p75 ?? 0,
      imm: withImm?.[i]?.expected ?? 0,
    });
  }
  return (
    <div className="chart-panel">
      <h3>Fig 2 · Expected daily incidence</h3>
      <p className="sub">
        Mean new cases per day across replications. Shaded band is IQR without immunization.
      </p>
      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 6, right: 6, left: -6, bottom: 0 }}>
            <CartesianGrid stroke={grid} vertical={false} />
            <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} />
            <YAxis tick={axis} axisLine={false} tickLine={false} width={32} />
            <Tooltip contentStyle={tip} />
            <Legend />
            <Area
              type="monotone"
              dataKey="noneHi"
              stroke="none"
              fill="rgba(67,56,202,0.12)"
              name="IQR high"
              legendType="none"
            />
            <Area
              type="monotone"
              dataKey="noneLo"
              stroke="none"
              fill="#fffdf8"
              name="IQR low"
              legendType="none"
            />
            <Line
              type="monotone"
              dataKey="none"
              name="No imm."
              stroke="#4338ca"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="imm"
              name="With imm."
              stroke="#15803d"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function SpaghettiChart({ paths, title, subtitle, color }) {
  if (!paths?.length) return null;
  let maxDay = 0;
  paths.forEach((p) => {
    maxDay = Math.max(maxDay, p.series[p.series.length - 1]?.day || 0);
  });
  const data = [];
  for (let d = 0; d <= Math.min(maxDay, 50); d++) {
    const row = { day: d };
    paths.forEach((p, i) => {
      const pt = p.series.find((s) => s.day === d);
      if (pt) row[`r${i}`] = pt.cum;
      else if (d > 0) {
        const last = p.series[p.series.length - 1];
        if (last && d > last.day) row[`r${i}`] = last.cum;
      }
    });
    data.push(row);
  }
  return (
    <div className="chart-panel">
      <h3>{title}</h3>
      <p className="sub">{subtitle}</p>
      <div style={{ width: '100%', height: 230 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 6, right: 6, left: -6, bottom: 0 }}>
            <CartesianGrid stroke={grid} vertical={false} />
            <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} />
            <YAxis tick={axis} axisLine={false} tickLine={false} width={32} domain={[0, 61]} />
            <Tooltip contentStyle={tip} />
            {paths.map((_, i) => (
              <Line
                key={i}
                type="stepAfter"
                dataKey={`r${i}`}
                stroke={color}
                strokeWidth={1.2}
                strokeOpacity={0.35 + (i % 3) * 0.12}
                dot={false}
                legendType="none"
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function DurationHistChart({ without, withImm }) {
  if (!without?.length) return null;
  const keys = new Set([
    ...without.map((d) => d.value),
    ...(withImm || []).map((d) => d.value),
  ]);
  const data = [...keys]
    .sort((a, b) => a - b)
    .map((value) => ({
      value,
      none: without.find((d) => d.value === value)?.count ?? 0,
      imm: withImm?.find((d) => d.value === value)?.count ?? 0,
    }));
  return (
    <div className="chart-panel">
      <h3>Fig 3 · Outbreak duration</h3>
      <p className="sub">Days until no one remains infectious.</p>
      <div style={{ width: '100%', height: 230 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 6, right: 6, left: -6, bottom: 0 }}>
            <CartesianGrid stroke={grid} vertical={false} />
            <XAxis dataKey="value" tick={axis} axisLine={false} tickLine={false} />
            <YAxis tick={axis} axisLine={false} tickLine={false} width={32} />
            <Tooltip contentStyle={tip} />
            <Legend />
            <Bar dataKey="none" name="No imm." fill="#4338ca" radius={[2, 2, 0, 0]} />
            <Bar dataKey="imm" name="With imm." fill="#15803d" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TotalInfectedHistChart({ without, withImm }) {
  if (!without?.length) return null;
  const keys = new Set([
    ...without.map((d) => d.value),
    ...(withImm || []).map((d) => d.value),
  ]);
  const data = [...keys]
    .sort((a, b) => a - b)
    .filter((v) => {
      const n = without.find((d) => d.value === v)?.count ?? 0;
      const m = withImm?.find((d) => d.value === v)?.count ?? 0;
      return n + m > 0;
    })
    .map((value) => ({
      value,
      none: without.find((d) => d.value === value)?.count ?? 0,
      imm: withImm?.find((d) => d.value === value)?.count ?? 0,
    }));
  return (
    <div className="chart-panel">
      <h3>Fig 4 · Final attack size</h3>
      <p className="sub">Total ever-infected including Tommy.</p>
      <div style={{ width: '100%', height: 230 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 6, right: 6, left: -6, bottom: 0 }}>
            <CartesianGrid stroke={grid} vertical={false} />
            <XAxis dataKey="value" tick={axis} axisLine={false} tickLine={false} />
            <YAxis tick={axis} axisLine={false} tickLine={false} width={32} />
            <Tooltip contentStyle={tip} />
            <Legend />
            <Bar dataKey="none" name="No imm." fill="#4338ca" radius={[2, 2, 0, 0]} />
            <Bar dataKey="imm" name="With imm." fill="#15803d" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
