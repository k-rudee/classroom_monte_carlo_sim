export const PROJECT = {
  name: 'CASCADE',
  course: 'Stochastic Simulation · Georgia Tech',
  school: 'Georgia Institute of Technology',
  title: 'Classroom Flu Monte Carlo Simulation',
  subtitle:
    'Monte Carlo study of influenza spread in a classroom of 61 students starting from one infected child (Tommy). Compare epidemic size and duration with and without random immunization.',
  repo: 'https://github.com/k-rudee/classroom_monte_carlo_sim',
  period: '1,000 replications · seed-controlled PRNG',
};

export const PIPELINE = [
  {
    step: '01',
    title: 'Day-1 binomial',
    body: 'Tommy infects each of 60 peers independently with probability p. Closed-form mean and PMF.',
  },
  {
    step: '02',
    title: 'Short horizon',
    body: 'Simulate through Day 2 (including secondary cases) and estimate expected cumulative infections.',
  },
  {
    step: '03',
    title: 'Full epidemic',
    body: 'Run until no infectious students remain. Record daily incidence, duration, and attack size.',
  },
  {
    step: '04',
    title: 'Immunization arm',
    body: 'Each student immunized with probability π (Tommy excluded). Compare arms with t-tests.',
  },
];

export const ASSUMPTIONS = [
  { name: 'Classroom size', detail: 'N = 61 students (Tommy + 60 peers)' },
  {
    name: 'Contact model',
    detail: 'Full mixing: every infectious student contacts every susceptible peer each day',
  },
  {
    name: 'Transmission',
    detail: 'Independent Bernoulli(p) per infectious-susceptible pair per day',
  },
  { name: 'Infectious period', detail: 'Fixed d days after infection onset' },
  {
    name: 'Immunization',
    detail: 'Random Bernoulli(π) shield; patient zero never immunized',
  },
];

export const LIMITATIONS = [
  {
    title: 'Homogeneous mixing',
    body: 'Real classrooms have seating and social structure. This model is a mean-field upper bound on connectivity.',
  },
  {
    title: 'Constant parameters',
    body: 'p and d do not change with behavior, testing, or isolation during the outbreak.',
  },
  {
    title: 'Independent trials',
    body: 'Immunization and infection draws are independent; correlated susceptibility is not modeled.',
  },
  {
    title: 'Browser Monte Carlo',
    body: 'Live runs use a seeded PRNG port of Simulator.py. Large M may take a moment in-browser.',
  },
];
