/**
 * Client-side port of Simulator.py (classroom flu Monte Carlo).
 * Same process model: full classroom mixing, fixed infectious period,
 * optional random immunization (Tommy never immunized).
 */

/** Mulberry32 — deterministic PRNG for reproducible runs */
export function createRng(seed = 42) {
  let t = seed >>> 0;
  return function rng() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Binomial PMF for Day-1 infections from patient zero */
export function binomialPmf(n, p, maxK = 20) {
  const out = [];
  let q = 1 - p;
  // recursive PMF
  let pk = Math.pow(q, n);
  for (let k = 0; k <= Math.min(n, maxK); k++) {
    out.push({ k, pmf: pk });
    if (k < n) {
      pk = (pk * (n - k) * p) / ((k + 1) * q);
    }
  }
  return out;
}

export function binomialMeanVar(n, p) {
  return { mean: n * p, variance: n * p * (1 - p) };
}

/**
 * Full epidemic until no one remains infectious.
 * Returns daily new infection counts, duration, total infected.
 */
export function simulateEpidemic(params, rng, withImmunization) {
  const {
    numKids,
    infectionProbability,
    daysInfectious,
    immunizationProbability,
  } = params;

  const immunized = new Array(numKids).fill(false);
  if (withImmunization) {
    for (let i = 0; i < numKids; i++) {
      immunized[i] = rng() < immunizationProbability;
    }
    immunized[0] = false; // Tommy
  }

  const infectedDays = new Float64Array(numKids);
  const totalInfected = new Uint8Array(numKids);
  infectedDays[0] = daysInfectious;
  totalInfected[0] = 1;

  const dailyNew = [];
  let day = 0;
  const maxDays = 200; // safety

  while (day < maxDays) {
    let anyInfectious = false;
    for (let i = 0; i < numKids; i++) {
      if (infectedDays[i] > 0) {
        anyInfectious = true;
        break;
      }
    }
    if (!anyInfectious) break;

    const newInf = new Float64Array(numKids);
    let dayNew = 0;

    // Match Simulator.py contact rule: infect if currently not infectious
    for (let kid = 0; kid < numKids; kid++) {
      if (infectedDays[kid] <= 0) continue;
      for (let other = 0; other < numKids; other++) {
        if (other === kid) continue;
        if (infectedDays[other] > 0) continue;
        if (immunized[other]) continue;
        if (rng() < infectionProbability) {
          // only count as "new" if never infected before (attack size)
          if (!totalInfected[other] && newInf[other] === 0) dayNew += 1;
          newInf[other] = daysInfectious;
          totalInfected[other] = 1;
        }
      }
    }

    for (let i = 0; i < numKids; i++) {
      infectedDays[i] += newInf[i];
      if (infectedDays[i] > 0) infectedDays[i] -= 1;
    }

    dailyNew.push(dayNew);
    day += 1;
  }

  let total = 0;
  for (let i = 0; i < numKids; i++) total += totalInfected[i];

  return {
    dailyNew,
    duration: day,
    totalInfected: total,
  };
}

function mean(arr) {
  if (!arr.length) return 0;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}

function std(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  let s = 0;
  for (const v of arr) s += (v - m) ** 2;
  return Math.sqrt(s / arr.length);
}

function median(arr) {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  const idx = (a.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return a[lo];
  return a[lo] * (hi - idx) + a[hi] * (idx - lo);
}

function histogram(values, minBin, maxBin) {
  const bins = [];
  for (let b = minBin; b <= maxBin; b++) bins.push({ value: b, count: 0 });
  const map = new Map(bins.map((b) => [b.value, b]));
  for (const v of values) {
    const key = Math.round(v);
    if (map.has(key)) map.get(key).count += 1;
    else if (key < minBin) map.get(minBin).count += 1;
    else if (key > maxBin) map.get(maxBin).count += 1;
  }
  return bins;
}

function meanDailyCurve(allDaily) {
  let maxLen = 0;
  for (const d of allDaily) maxLen = Math.max(maxLen, d.length);
  const curve = [];
  for (let day = 0; day < maxLen; day++) {
    const vals = [];
    for (const run of allDaily) {
      vals.push(day < run.length ? run[day] : 0);
    }
    vals.sort((a, b) => a - b);
    const q = (p) => {
      const idx = (vals.length - 1) * p;
      const lo = Math.floor(idx);
      const hi = Math.ceil(idx);
      if (lo === hi) return vals[lo];
      return vals[lo] * (hi - idx) + vals[hi] * (idx - lo);
    };
    curve.push({
      day: day + 1,
      expected: mean(vals),
      p25: q(0.25),
      p75: q(0.75),
    });
  }
  return curve;
}

/** Cumulative attack trajectories for a handful of individual replications */
function samplePaths(allDaily, totals, count = 12) {
  const paths = [];
  const step = Math.max(1, Math.floor(allDaily.length / count));
  for (let i = 0, n = 0; i < allDaily.length && n < count; i += step, n++) {
    const daily = allDaily[i];
    let cum = 1; // Tommy
    const series = [{ day: 0, cum: 1 }];
    for (let d = 0; d < daily.length; d++) {
      cum += daily[d];
      series.push({ day: d + 1, cum });
    }
    paths.push({ id: n, total: totals[i], series });
  }
  return paths;
}

/** Welch-ish two-sample t (approx) for display */
function tTest(a, b) {
  const n1 = a.length;
  const n2 = b.length;
  const m1 = mean(a);
  const m2 = mean(b);
  const s1 = std(a);
  const s2 = std(b);
  const se = Math.sqrt((s1 * s1) / n1 + (s2 * s2) / n2) || 1e-12;
  const t = (m1 - m2) / se;
  // two-sided normal approx p-value (large df)
  const z = Math.abs(t);
  const p = erfc(z / Math.SQRT2);
  return { t, p };
}

/** Complementary error function (Abramowitz & Stegun 7.1.26) */
function erfc(x) {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const ans =
    t *
    Math.exp(
      -z * z -
        1.26551223 +
        t *
          (1.00002368 +
            t *
              (0.37409196 +
                t *
                  (0.09678418 +
                    t *
                      (-0.18628806 +
                        t *
                          (0.27886807 +
                            t *
                              (-1.13520398 +
                                t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))
    );
  return x >= 0 ? ans : 2 - ans;
}

/**
 * Run full Monte Carlo battery matching project parts D/E + comparisons.
 */
export function runMonteCarlo(params, seed = 42) {
  const rng = createRng(seed);
  const nSim = params.numSimulations;

  const dailyNone = [];
  const durationsNone = [];
  const totalsNone = [];
  const dailyImm = [];
  const durationsImm = [];
  const totalsImm = [];

  for (let i = 0; i < nSim; i++) {
    const a = simulateEpidemic(params, rng, false);
    dailyNone.push(a.dailyNew);
    durationsNone.push(a.duration);
    totalsNone.push(a.totalInfected);

    const b = simulateEpidemic(params, rng, true);
    dailyImm.push(b.dailyNew);
    durationsImm.push(b.duration);
    totalsImm.push(b.totalInfected);
  }

  const meanTotalNone = mean(totalsNone);
  const meanTotalImm = mean(totalsImm);
  const meanDurNone = mean(durationsNone);
  const meanDurImm = mean(durationsImm);

  const reductionInfections = meanTotalNone - meanTotalImm;
  const pctReductionInf = meanTotalNone
    ? (reductionInfections / meanTotalNone) * 100
    : 0;
  const reductionDuration = meanDurNone - meanDurImm;
  const pctReductionDur = meanDurNone ? (reductionDuration / meanDurNone) * 100 : 0;

  const tInf = tTest(totalsNone, totalsImm);
  const tDur = tTest(durationsNone, durationsImm);

  const maxTotal = Math.max(...totalsNone, ...totalsImm, 1);
  const maxDur = Math.max(...durationsNone, ...durationsImm, 1);

  // Day-2 expectation via short Monte Carlo (part C style)
  const day2Counts = [];
  for (let i = 0; i < Math.min(nSim * 2, 2000); i++) {
    day2Counts.push(simulateUpToDay2(params, rng));
  }

  const n = params.numKids - 1;
  const p = params.infectionProbability;
  const { mean: day1Mean, variance: day1Var } = binomialMeanVar(n, p);

  return {
    params: { ...params, seed },
    day1: {
      mean: day1Mean,
      variance: day1Var,
      pmf: binomialPmf(n, p, 15),
    },
    day2: {
      mean: mean(day2Counts),
      std: std(day2Counts),
    },
    without: {
      meanTotal: meanTotalNone,
      stdTotal: std(totalsNone),
      meanDuration: meanDurNone,
      medianDuration: median(durationsNone),
      stdDuration: std(durationsNone),
      dailyCurve: meanDailyCurve(dailyNone),
      durationHist: histogram(durationsNone, 1, Math.min(maxDur, 40)),
      totalHist: histogram(totalsNone, 1, Math.min(maxTotal, params.numKids)),
      samplePaths: samplePaths(dailyNone, totalsNone, 14),
      p10Total: percentile(totalsNone, 0.1),
      p90Total: percentile(totalsNone, 0.9),
    },
    withImm: {
      meanTotal: meanTotalImm,
      stdTotal: std(totalsImm),
      meanDuration: meanDurImm,
      medianDuration: median(durationsImm),
      stdDuration: std(durationsImm),
      dailyCurve: meanDailyCurve(dailyImm),
      durationHist: histogram(durationsImm, 1, Math.min(maxDur, 40)),
      totalHist: histogram(totalsImm, 1, Math.min(maxTotal, params.numKids)),
      samplePaths: samplePaths(dailyImm, totalsImm, 14),
      p10Total: percentile(totalsImm, 0.1),
      p90Total: percentile(totalsImm, 0.9),
    },
    impact: {
      reductionInfections,
      pctReductionInf,
      reductionDuration,
      pctReductionDur,
    },
    tests: {
      totalInfections: tInf,
      durations: tDur,
    },
  };
}

function simulateUpToDay2(params, rng) {
  const { numKids, infectionProbability, daysInfectious } = params;
  const infectedDays = new Float64Array(numKids);
  const totalInfected = new Uint8Array(numKids);
  infectedDays[0] = daysInfectious;
  totalInfected[0] = 1;

  // Day 1
  for (let kid = 1; kid < numKids; kid++) {
    if (rng() < infectionProbability) {
      infectedDays[kid] = daysInfectious;
      totalInfected[kid] = 1;
    }
  }
  for (let i = 0; i < numKids; i++) {
    if (infectedDays[i] > 0) infectedDays[i] -= 1;
  }

  // Day 2
  const newInf = new Float64Array(numKids);
  for (let kid = 0; kid < numKids; kid++) {
    if (infectedDays[kid] <= 0) continue;
    for (let other = 0; other < numKids; other++) {
      if (other === kid) continue;
      if (infectedDays[other] > 0 || totalInfected[other]) continue;
      if (rng() < infectionProbability) {
        newInf[other] = daysInfectious;
        totalInfected[other] = 1;
      }
    }
  }
  let total = 0;
  for (let i = 0; i < numKids; i++) total += totalInfected[i];
  return total;
}

export const DEFAULT_PARAMS = {
  numKids: 61,
  infectionProbability: 0.01,
  daysInfectious: 3,
  immunizationProbability: 0.5,
  numSimulations: 800,
};
