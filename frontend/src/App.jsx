import { Play, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  DailyIncidenceChart,
  Day1PmfChart,
  DurationHistChart,
  SpaghettiChart,
  TotalInfectedHistChart,
} from './components/Charts';
import { PROJECT } from './data/projectData';
import { DEFAULT_PARAMS, runMonteCarlo } from './lib/simulation';

function fmt(n, d = 2) {
  if (n == null || Number.isNaN(n)) return '-';
  return Number(n).toFixed(d);
}

function fmtP(p) {
  if (p == null) return '-';
  if (p < 1e-4) return '<0.0001';
  return p.toFixed(4);
}

export default function App() {
  const [params, setParams] = useState({ ...DEFAULT_PARAMS });
  const [seed, setSeed] = useState(42);
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);

  const run = useCallback(
    (p = params, s = seed) => {
      setRunning(true);
      setTimeout(() => {
        setResults(runMonteCarlo(p, s));
        setRunning(false);
      }, 20);
    },
    [params, seed]
  );

  useEffect(() => {
    run(DEFAULT_PARAMS, 42);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setRange = (key) => (e) =>
    setParams((prev) => ({ ...prev, [key]: Number(e.target.value) }));

  return (
    <div className="report">
      <header className="report-top">
        <div>
          <div className="report-id">Lab report · CASCADE · Monte Carlo</div>
          <h1 className="report-title">{PROJECT.title}</h1>
          <div className="report-meta">
            {PROJECT.school} · {PROJECT.course} ·{' '}
            <a href={PROJECT.repo} target="_blank" rel="noreferrer">
              classroom_monte_carlo_sim
            </a>
          </div>
        </div>
        <nav className="report-nav">
          <a href="#abstract">Abstract</a>
          <a href="#protocol">Protocol</a>
          <a href="#bench">Bench</a>
          <a href="#figures">Figures</a>
          <a href="#notes">Notes</a>
        </nav>
      </header>

      <div className="report-body">
        <section className="block" id="abstract">
          <div className="block-label">§0 Abstract</div>
          <div className="abstract-box">
            Monte Carlo model of flu spread in a class of 61 students starting from one infected
            child (Tommy). The simulator matches <code>Simulator.py</code>: full mixing, fixed
            infectious period, and optional random immunization. Charts recompute from live
            replications so parameters can be stressed in the browser.
          </div>

          {results && (
            <div className="kpi-strip">
              <div className="kpi">
                <div className="k">Attack size · none</div>
                <div className="v">{fmt(results.without.meanTotal, 1)}</div>
                <div className="s">
                  ±{fmt(results.without.stdTotal, 1)} · p10–p90 {fmt(results.without.p10Total, 0)}–
                  {fmt(results.without.p90Total, 0)}
                </div>
              </div>
              <div className="kpi">
                <div className="k">Attack size · imm</div>
                <div className="v">{fmt(results.withImm.meanTotal, 1)}</div>
                <div className="s">±{fmt(results.withImm.stdTotal, 1)} of {params.numKids}</div>
              </div>
              <div className="kpi">
                <div className="k">Cases averted</div>
                <div className="v" style={{ color: 'var(--green)' }}>
                  {fmt(results.impact.pctReductionInf, 0)}%
                </div>
                <div className="s">{fmt(results.impact.reductionInfections, 1)} fewer kids</div>
              </div>
              <div className="kpi">
                <div className="k">Days shorter</div>
                <div className="v">{fmt(results.impact.pctReductionDur, 0)}%</div>
                <div className="s">
                  {fmt(results.without.meanDuration, 1)} → {fmt(results.withImm.meanDuration, 1)} days
                </div>
              </div>
            </div>
          )}

          <div className="margin-note">
            <strong>Design choice</strong>
            Uses a discrete contact model (independent coin flips per pair per day) rather than a
            continuous SIR curve, so rare large outbreaks show up in the histograms.
          </div>
        </section>

        <section className="block" id="protocol">
          <div className="block-label">§1 Protocol</div>
          <h2>Simulation design</h2>
          <p className="lead">
            N = 61. Tommy starts infectious for d days. Each day, every infectious student contacts
            every non-infectious peer; infection occurs with probability p. The run ends when no one
            remains infectious. In the immunization arm, each student except Tommy is protected with
            probability π.
          </p>

          <div className="grid-3">
            <div className="panel">
              <h3>Part A–B · Day 1</h3>
              <p>
                Closed form: K ~ Binomial(60, p). With p = 0.01, E[K] = 0.60. The PMF anchors the
                Monte Carlo results.
              </p>
            </div>
            <div className="panel">
              <h3>Part C · Through Day 2</h3>
              <p>
                Short-horizon runs estimate cumulative infected by Day 2 (Tommy, primary, and
                secondary cases).
              </p>
            </div>
            <div className="panel">
              <h3>Part D–E · Full paths</h3>
              <p>
                Paired Monte Carlo for both arms. Shared seeding keeps the immunization contrast
                comparable.
              </p>
            </div>
          </div>

          <div className="ink-note">
            <strong>Implementation</strong>
            Contact loop is O(N²) per day, matching the project code. For N = 61 and M ≈ 800 this
            finishes quickly in-browser.
          </div>
        </section>

        <section className="block" id="bench">
          <div className="block-label">§2 Experiment bench</div>
          <h2>Run the Monte Carlo</h2>
          <p className="lead">
            Defaults match the repository. Raise p to increase spread; raise π to reduce attack size
            and duration.
          </p>

          <div className="lab-layout">
            <div className="panel">
              <div className="field">
                <label htmlFor="p">
                  Transmission p <span className="val">{params.infectionProbability.toFixed(3)}</span>
                </label>
                <input
                  id="p"
                  type="range"
                  min={0.002}
                  max={0.04}
                  step={0.001}
                  value={params.infectionProbability}
                  onChange={setRange('infectionProbability')}
                  disabled={running}
                />
              </div>
              <div className="field">
                <label htmlFor="pi">
                  Immunization π{' '}
                  <span className="val">{params.immunizationProbability.toFixed(2)}</span>
                </label>
                <input
                  id="pi"
                  type="range"
                  min={0}
                  max={0.85}
                  step={0.05}
                  value={params.immunizationProbability}
                  onChange={setRange('immunizationProbability')}
                  disabled={running}
                />
              </div>
              <div className="field">
                <label htmlFor="d">
                  Infectious days d <span className="val">{params.daysInfectious}</span>
                </label>
                <input
                  id="d"
                  type="range"
                  min={1}
                  max={6}
                  step={1}
                  value={params.daysInfectious}
                  onChange={setRange('daysInfectious')}
                  disabled={running}
                />
              </div>
              <div className="field">
                <label htmlFor="m">
                  Replications M <span className="val">{params.numSimulations}</span>
                </label>
                <input
                  id="m"
                  type="range"
                  min={150}
                  max={1200}
                  step={50}
                  value={params.numSimulations}
                  onChange={setRange('numSimulations')}
                  disabled={running}
                />
              </div>
              <div className="field">
                <label htmlFor="seed">
                  Seed <span className="val">{seed}</span>
                </label>
                <input
                  id="seed"
                  type="range"
                  min={1}
                  max={500}
                  step={1}
                  value={seed}
                  onChange={(e) => setSeed(Number(e.target.value))}
                  disabled={running}
                />
              </div>
              <div className="btn-row">
                <button type="button" className="btn" disabled={running} onClick={() => run()}>
                  {running ? (
                    <>
                      <RefreshCw size={14} /> Running…
                    </>
                  ) : (
                    <>
                      <Play size={14} /> Run Monte Carlo
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={running}
                  onClick={() => {
                    setParams({ ...DEFAULT_PARAMS });
                    setSeed(42);
                    run(DEFAULT_PARAMS, 42);
                  }}
                >
                  Reset defaults
                </button>
                {running && (
                  <span className="running">
                    computing {params.numSimulations * 2} paths…
                  </span>
                )}
              </div>
            </div>

            <div className="panel">
              <h3>Results table</h3>
              {results ? (
                <table className="findings-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>None</th>
                      <th>Imm.</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Mean attack size</td>
                      <td className="num">{fmt(results.without.meanTotal)}</td>
                      <td className="num">{fmt(results.withImm.meanTotal)}</td>
                    </tr>
                    <tr>
                      <td>Median duration (days)</td>
                      <td className="num">{fmt(results.without.medianDuration, 0)}</td>
                      <td className="num">{fmt(results.withImm.medianDuration, 0)}</td>
                    </tr>
                    <tr>
                      <td>Day-2 cumulative E[·]</td>
                      <td className="num" colSpan={2}>
                        {fmt(results.day2.mean)} ± {fmt(results.day2.std)}
                      </td>
                    </tr>
                    <tr className="highlight">
                      <td>t-test p (attack size)</td>
                      <td className="num" colSpan={2}>
                        {fmtP(results.tests.totalInfections.p)} (t=
                        {fmt(results.tests.totalInfections.t, 1)})
                      </td>
                    </tr>
                    <tr>
                      <td>t-test p (duration)</td>
                      <td className="num" colSpan={2}>
                        {fmtP(results.tests.durations.p)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p>Waiting on first batch…</p>
              )}
              <div className="margin-note" style={{ marginBottom: 0 }}>
                <strong>Interpretation</strong>
                Under full mixing, immunization cuts chain length sharply. Real classrooms are
                sparser, so treat the percent reduction as an upper bound on impact, not a policy
                forecast.
              </div>
            </div>
          </div>
        </section>

        <section className="block" id="figures">
          <div className="block-label">§3 Figures</div>
          <h2>Distributions from the current batch</h2>
          <p className="lead">
            Spaghetti panels show cumulative attack size for sample replications so path variance is
            visible, not only averages.
          </p>

          {results && (
            <>
              <div className="grid-2" style={{ marginBottom: '0.85rem' }}>
                <Day1PmfChart pmf={results.day1.pmf} mean={results.day1.mean} />
                <DailyIncidenceChart
                  without={results.without.dailyCurve}
                  withImm={results.withImm.dailyCurve}
                />
              </div>
              <div className="grid-2" style={{ marginBottom: '0.85rem' }}>
                <SpaghettiChart
                  paths={results.without.samplePaths}
                  title="Fig 2b · Sample paths (no immunization)"
                  subtitle="Each line is one full epidemic. Steps stack daily incidence into attack size."
                  color="#4338ca"
                />
                <SpaghettiChart
                  paths={results.withImm.samplePaths}
                  title="Fig 2c · Sample paths (immunized arm)"
                  subtitle="Same scale (0 to 61). Most runs die out after a few secondary cases."
                  color="#15803d"
                />
              </div>
              <div className="grid-2">
                <DurationHistChart
                  without={results.without.durationHist}
                  withImm={results.withImm.durationHist}
                />
                <TotalInfectedHistChart
                  without={results.without.totalHist}
                  withImm={results.withImm.totalHist}
                />
              </div>
            </>
          )}
        </section>

        <section className="block" id="notes">
          <div className="block-label">§4 Notes and limits</div>
          <h2>Scope of the results</h2>
          <div className="grid-2">
            <div className="panel">
              <h3>Supported claims</h3>
              <ul>
                <li>Day-1 binomial mean matches Monte Carlo within sampling noise.</li>
                <li>Paired arms make the immunization contrast comparable.</li>
                <li>Histograms show dispersion, not only mean shifts.</li>
                <li>t-tests align with the visual separation in the plots.</li>
              </ul>
            </div>
            <div className="panel">
              <h3>Not claimed</h3>
              <ul>
                <li>Homogeneous mixing overstates spread vs real seating graphs.</li>
                <li>p and d are fixed; behavior change mid-outbreak is ignored.</li>
                <li>Immunization draws are independent (no household clustering).</li>
                <li>Teaching model only, not an epidemiological forecast.</li>
              </ul>
            </div>
          </div>
          <div className="ink-note">
            <strong>Takeaway</strong>
            Random immunization at 50% can be quantified on attack size and duration while keeping
            mixing assumptions explicit. That balance of sharp numbers and clear limits is the goal
            of this write-up.
          </div>
        </section>
      </div>

      <footer className="footer-bar">
        <div>
          <strong style={{ color: 'var(--ink)' }}>CASCADE</strong> · {PROJECT.title}
        </div>
        <div>
          <a href={PROJECT.repo} target="_blank" rel="noreferrer">
            github.com/k-rudee/classroom_monte_carlo_sim
          </a>
        </div>
      </footer>
    </div>
  );
}
