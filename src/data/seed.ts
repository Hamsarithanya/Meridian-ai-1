import avatarLearnerImg from '../assets/images/avatar_learner_aarav_1794633589695.jpg';
import {
  AssessmentQuiz,
  CareerRole,
  LearnerPreset,
  LearnerProfile,
  MentorMessage,
  OrchestrationState,
} from '../types';

export const CAREER_ROLES: CareerRole[] = [
  {
    id: 'full-stack-dev',
    title: 'Full Stack Developer',
    category: 'Software Engineering',
    summary:
      'Designs end-to-end web products spanning responsive TypeScript/React interfaces, Node.js APIs, and relational data modeling.',
    medianBand: '$95k – $142k',
    demandNote: 'High hiring velocity across product startups and SaaS teams',
    requirements: [
      { skill: 'JavaScript', requiredLevel: 85, priority: 'Core', category: 'Frontend' },
      { skill: 'React', requiredLevel: 80, priority: 'Core', category: 'Frontend' },
      { skill: 'Node.js', requiredLevel: 78, priority: 'Core', category: 'Backend' },
      { skill: 'HTML & CSS', requiredLevel: 75, priority: 'Important', category: 'Frontend' },
      { skill: 'SQL', requiredLevel: 75, priority: 'Important', category: 'Database' },
      { skill: 'REST APIs & Auth', requiredLevel: 72, priority: 'Important', category: 'Backend' },
      { skill: 'Git', requiredLevel: 70, priority: 'Bonus', category: 'DevOps' },
    ],
  },
  {
    id: 'ai-ml-engineer',
    title: 'AI & ML Engineer',
    category: 'Artificial Intelligence',
    summary:
      'Builds production machine learning pipelines, fine-tunes foundation models, and deploys low-latency inference services.',
    medianBand: '$125k – $180k',
    demandNote: 'Fastest-growing engineering role with strong Python/SQL synergy',
    requirements: [
      { skill: 'Python', requiredLevel: 90, priority: 'Core', category: 'Backend' },
      { skill: 'PyTorch & Deep Learning', requiredLevel: 80, priority: 'Core', category: 'AI & Data' },
      { skill: 'LLM & RAG Systems', requiredLevel: 78, priority: 'Core', category: 'AI & Data' },
      { skill: 'SQL', requiredLevel: 75, priority: 'Important', category: 'Database' },
      { skill: 'Math & Linear Algebra', requiredLevel: 75, priority: 'Important', category: 'Foundations' },
      { skill: 'FastAPI & Model Serving', requiredLevel: 72, priority: 'Important', category: 'Backend' },
      { skill: 'Docker & MLOps', requiredLevel: 68, priority: 'Bonus', category: 'DevOps' },
    ],
  },
  {
    id: 'data-scientist',
    title: 'Data Scientist',
    category: 'Data & Analytics',
    summary:
      'Transforms raw product and business telemetry into predictive models, causal experiments, and executive decision frameworks.',
    medianBand: '$105k – $155k',
    demandNote: 'Strong match for learners with existing Python and SQL foundations',
    requirements: [
      { skill: 'Python', requiredLevel: 85, priority: 'Core', category: 'AI & Data' },
      { skill: 'SQL', requiredLevel: 85, priority: 'Core', category: 'Database' },
      { skill: 'Statistics & A/B Testing', requiredLevel: 82, priority: 'Core', category: 'Foundations' },
      { skill: 'Scikit-Learn & Modeling', requiredLevel: 78, priority: 'Core', category: 'AI & Data' },
      { skill: 'Data Visualization', requiredLevel: 72, priority: 'Important', category: 'Frontend' },
      { skill: 'Feature Engineering', requiredLevel: 74, priority: 'Important', category: 'AI & Data' },
    ],
  },
  {
    id: 'cloud-devops',
    title: 'Cloud DevOps Engineer',
    category: 'Infrastructure & SRE',
    summary:
      'Automates CI/CD delivery pipelines, orchestrates containerized workloads, and safeguards production observability.',
    medianBand: '$110k – $162k',
    demandNote: 'Critical demand for reliable cloud-native deployment automation',
    requirements: [
      { skill: 'Linux & Networking', requiredLevel: 82, priority: 'Core', category: 'DevOps' },
      { skill: 'Docker & Kubernetes', requiredLevel: 85, priority: 'Core', category: 'DevOps' },
      { skill: 'CI/CD Pipelines', requiredLevel: 80, priority: 'Core', category: 'DevOps' },
      { skill: 'Terraform & IaC', requiredLevel: 76, priority: 'Important', category: 'DevOps' },
      { skill: 'Python', requiredLevel: 70, priority: 'Important', category: 'Backend' },
      { skill: 'Git', requiredLevel: 80, priority: 'Important', category: 'DevOps' },
    ],
  },
];

export const INITIAL_PROFILE: LearnerProfile = {
  name: 'Aarav Nair',
  headline: 'Final-Year Computer Science Student',
  location: 'Bengaluru, IN',
  avatarUrl: avatarLearnerImg,
  targetRoleId: 'full-stack-dev',
  bio: 'Transitioning from scripting and database coursework into production full-stack web engineering. Comfortable writing Python automation and relational SQL queries; actively closing JavaScript, React, and Node.js gaps.',
  weeklyHoursBudget: 12,
  existingSkills: [
    {
      id: 'sk-python',
      name: 'Python',
      level: 78,
      category: 'Backend',
      verifiedVia: 'Coursework + CLI Project',
    },
    {
      id: 'sk-sql',
      name: 'SQL',
      level: 72,
      category: 'Database',
      verifiedVia: 'Campus Library Project',
    },
    {
      id: 'sk-html',
      name: 'HTML & CSS',
      level: 45,
      category: 'Frontend',
      verifiedVia: 'Self-reported (Basic)',
    },
    {
      id: 'sk-git',
      name: 'Git',
      level: 55,
      category: 'DevOps',
      verifiedVia: 'Lab Repositories',
    },
  ],
  certifications: [
    {
      id: 'cert-1',
      title: 'Python & Relational Databases Foundations',
      issuer: 'Coursera / University of Michigan',
      year: '2025',
    },
  ],
  projects: [
    {
      id: 'proj-1',
      title: 'Campus Library SQL Ledger',
      summary:
        'Built a Python CLI inventory and overdue tracking tool backed by normalized SQLite tables and parameterized queries.',
      skillsUsed: ['Python', 'SQL', 'Git'],
    },
  ],
  assessmentHistory: [
    {
      id: 'res-seed-sql',
      topic: 'SQL & Relational Modeling',
      targetSkill: 'SQL',
      score: 75,
      correctCount: 3,
      totalQuestions: 4,
      weakConcepts: ['Window Functions'],
      timestamp: '2 days ago',
      triggeredAdaptation: false,
    },
  ],
};

export const INITIAL_ORCHESTRATION: OrchestrationState = {
  lastTrigger: 'Initial profile calibration for Full Stack Developer',
  lastUpdated: 'Just calibrated',
  readinessScore: 42,
  strengths: [
    'Strong algorithmic and scripting fluency in Python (78%) transfers cleanly to server-side logic.',
    'Solid relational schema and SQL query foundation (72%, verified at 75% on diagnostic).',
  ],
  weaknesses: [
    'HTML & CSS layout fundamentals are basic (45%), lacking responsive Flexbox/Grid fluency.',
    'Zero verified proficiency in JavaScript event loops, closures, and async DOM programming.',
  ],
  missingSkills: ['JavaScript', 'React', 'Node.js', 'REST APIs & Auth'],
  skillAudits: [
    {
      skill: 'SQL',
      category: 'Database',
      currentLevel: 72,
      targetLevel: 75,
      gap: 3,
      status: 'Strength',
      rationale: 'Verified via Campus Library Ledger project and 75% SQL diagnostic.',
    },
    {
      skill: 'Git',
      category: 'DevOps',
      currentLevel: 55,
      targetLevel: 70,
      gap: 15,
      status: 'Developing',
      rationale: 'Understands commits/push; needs branching and PR conflict workflows.',
    },
    {
      skill: 'HTML & CSS',
      category: 'Frontend',
      currentLevel: 45,
      targetLevel: 75,
      gap: 30,
      status: 'Developing',
      rationale: 'Basic semantic tags known; responsive layout systems remain a bottleneck.',
    },
    {
      skill: 'JavaScript',
      category: 'Frontend',
      currentLevel: 12,
      targetLevel: 85,
      gap: 73,
      status: 'Missing',
      rationale: 'Critical prerequisite missing for both React frontend and Node.js backend.',
    },
    {
      skill: 'React',
      category: 'Frontend',
      currentLevel: 0,
      targetLevel: 80,
      gap: 80,
      status: 'Missing',
      rationale: 'No component architecture, hooks, or state management experience logged.',
    },
    {
      skill: 'Node.js',
      category: 'Backend',
      currentLevel: 0,
      targetLevel: 78,
      gap: 78,
      status: 'Missing',
      rationale: 'Backend experience is Python-only; Express/event-driven runtime required.',
    },
    {
      skill: 'REST APIs & Auth',
      category: 'Backend',
      currentLevel: 18,
      targetLevel: 72,
      gap: 54,
      status: 'Missing',
      rationale: 'Needs hands-on HTTP status semantics, JWT sessions, and input validation.',
    },
  ],
  roadmap: [
    {
      id: 'phase-1',
      phaseNumber: 1,
      title: 'Phase 1: Modern JavaScript & Responsive Web Core',
      focusSummary:
        'Bridge Python programming intuition directly into ES6+ JavaScript, async/await, and modern CSS layout before touching frameworks.',
      resources: [
        {
          id: 'res-js-1',
          title: 'JavaScript for Python Developers: Scope, Closures & Event Loop',
          type: 'Course',
          provider: 'MDN & Frontend Masters Track',
          durationHours: 8,
          difficulty: 'Beginner',
          targetSkill: 'JavaScript',
          description:
            'Maps Python mental models to JS execution contexts, promises, fetch APIs, and array transformations.',
          completed: false,
        },
        {
          id: 'res-css-1',
          title: 'Responsive Grid & Flexbox Architecture',
          type: 'Tutorial',
          provider: 'Web.dev Interactive Guide',
          durationHours: 3.5,
          difficulty: 'Beginner',
          targetSkill: 'HTML & CSS',
          description:
            'Elevates basic HTML knowledge into accessible semantic landmarks and fluid 12-column responsive layouts.',
          completed: false,
        },
        {
          id: 'res-js-lab',
          title: 'Build a Live GitHub Issue Triage Board (Vanilla JS + Fetch)',
          type: 'Practical Exercise',
          provider: 'Meridian AI Hands-On Lab',
          durationHours: 4,
          difficulty: 'Intermediate',
          targetSkill: 'JavaScript',
          description:
            'Apply DOM state updates, debounced search, and async error handling without a framework.',
          exercisePrompt:
            'Create an interactive issue filter board that fetches JSON data, handles loading/error states gracefully, and persists pinned items in localStorage.',
          completed: false,
        },
      ],
    },
    {
      id: 'phase-2',
      phaseNumber: 2,
      title: 'Phase 2: Component Architecture with React',
      focusSummary:
        'Master declarative UI state, component composition, custom hooks, and client-side data fetching.',
      resources: [
        {
          id: 'res-react-1',
          title: 'Thinking in React: Components, State & Effect Lifecycle',
          type: 'Course',
          provider: 'React.dev Official Curriculum',
          durationHours: 10,
          difficulty: 'Intermediate',
          targetSkill: 'React',
          description:
            'Deep dive into lifting state up, controlled forms, useEffect cleanup, and reusable hook extraction.',
          completed: false,
        },
        {
          id: 'res-react-lab',
          title: 'Refactor Library Ledger UI in React + TypeScript',
          type: 'Practical Exercise',
          provider: 'Meridian AI Capstone Sprint',
          durationHours: 6,
          difficulty: 'Intermediate',
          targetSkill: 'React',
          description:
            'Turn your existing Campus Library SQL project into an interactive React dashboard with borrow/return state.',
          exercisePrompt:
            'Build BookCatalogTable, BorrowModal, and OverdueFilterBar components sharing clean lifted state with zero prop-drilling clutter.',
          completed: false,
        },
      ],
    },
    {
      id: 'phase-3',
      phaseNumber: 3,
      title: 'Phase 3: Node.js APIs & Full-Stack Integration',
      focusSummary:
        'Connect React frontends to Express/Node.js REST services backed by your existing SQL modeling strength.',
      resources: [
        {
          id: 'res-node-1',
          title: 'Node.js, Express & PostgreSQL REST Architecture',
          type: 'Course',
          provider: 'Full Stack Open',
          durationHours: 11,
          difficulty: 'Intermediate',
          targetSkill: 'Node.js',
          description:
            'Covers middleware pipelines, parameterized SQL queries in Node, JWT auth, and structured error handling.',
          completed: false,
        },
        {
          id: 'res-api-tut',
          title: 'REST Security Essentials: Validation, CORS & JWT',
          type: 'Tutorial',
          provider: 'OWASP Developer Notes',
          durationHours: 3,
          difficulty: 'Intermediate',
          targetSkill: 'REST APIs & Auth',
          description:
            'Practical checklist for securing endpoints, hashing passwords, and preventing SQL injection.',
          completed: false,
        },
        {
          id: 'res-fs-lab',
          title: 'Deploy Full-Stack Campus Library API + React Client',
          type: 'Practical Exercise',
          provider: 'Meridian AI Capstone Lab',
          durationHours: 8,
          difficulty: 'Advanced',
          targetSkill: 'Node.js',
          description:
            'Connect your Phase 2 React frontend to a real Express + SQLite/Postgres API with authenticated librarian routes.',
          exercisePrompt:
            'Implement POST /api/loans and GET /api/overdue with Zod request validation and connect the React client.',
          completed: false,
        },
      ],
    },
  ],
  mentorBriefing:
    'Your Python and SQL foundation puts you ahead on backend data thinking—42% ready overall for Full Stack Developer. The fastest path to job readiness is locking down async JavaScript first before jumping straight into React, so you never get stuck debugging closures or stale state.',
  adaptationReason:
    'Baseline synthesis: sequenced JavaScript fundamentals prior to React and leveraged your Campus Library SQL project as a Phase 2–3 capstone anchor.',
  quickActions: [
    'Take the 4-question JavaScript Diagnostic to test your baseline',
    'Complete Phase 1 JavaScript Event Loop module first',
    'Try switching your Career Goal above to see agents re-architect your path',
  ],
  agentTrace: [
    {
      agentId: 'analyst',
      agentName: 'Skill Analyst Agent',
      roleTitle: 'Competency & Evidence Auditor',
      status: 'completed',
      summary:
        'Audited 4 logged skills, 1 certification, and 1 SQL project. Confirmed Python (78%) and SQL (72%) as verified strengths; flagged HTML/CSS (45%) and missing JS runtime fluency.',
      handoffNote: 'Passed calibrated skill vector & evidence confidence scores to Career Matcher.',
      durationMs: 840,
      highlights: ['Verified Strength: Python & SQL', 'Bottleneck: Async JavaScript & CSS Grid'],
    },
    {
      agentId: 'matcher',
      agentName: 'Career Matcher Agent',
      roleTitle: 'Role Matrix Comparator',
      status: 'completed',
      summary:
        'Benchmarked profile against 7 Full Stack Developer requirements. Computed 42% role readiness; isolated JavaScript, React, Node.js, and REST Auth as priority hiring blockers.',
      handoffNote: 'Transmitted ranked skill-gap matrix to Curriculum Architect.',
      durationMs: 790,
      highlights: ['Role Match: 42% Ready', '4 Core/Important Missing Skills Ranked'],
    },
    {
      agentId: 'architect',
      agentName: 'Curriculum Architect Agent',
      roleTitle: 'Adaptive Roadmap Synthesizer',
      status: 'completed',
      summary:
        'Constructed a 3-phase, 52.5-hour curriculum combining courses, tutorials, and 3 practical exercises anchored around upgrading your Campus Library SQL project.',
      handoffNote: 'Delivered dependency-ordered roadmap to Adaptive Mentor.',
      durationMs: 1120,
      highlights: ['3 Phases · 8 Curated Modules', 'Capstone Anchored to Existing SQL Project'],
    },
    {
      agentId: 'mentor',
      agentName: 'Adaptive Mentor Agent',
      roleTitle: 'Guidance & Strategy Coach',
      status: 'completed',
      summary:
        'Generated onboarding guidance and prioritized a JavaScript diagnostic assessment so future modules adapt to real performance.',
      handoffNote: 'Briefing published to learner workspace.',
      durationMs: 650,
      highlights: ['Next Step: JavaScript Diagnostic', 'Adaptive Triggers Armed (<60% Score / Role Shift)'],
    },
  ],
};

export const SEEDED_QUIZZES: AssessmentQuiz[] = [
  {
    id: 'quiz-js-async',
    topic: 'JavaScript Fundamentals & Async Execution',
    targetSkill: 'JavaScript',
    difficulty: 'Diagnostic',
    estimatedMinutes: 4,
    questions: [
      {
        id: 'js-q1',
        prompt: 'What is logged to the console first when this JavaScript snippet runs?',
        codeSnippet: `console.log("A");
setTimeout(() => console.log("B"), 0);
Promise.resolve().then(() => console.log("C"));
console.log("D");`,
        options: ['A, B, C, D', 'A, D, C, B', 'A, D, B, C', 'D, A, C, B'],
        correctIndex: 1,
        explanation:
          'Synchronous logs (A, D) execute first, then the microtask queue (Promise .then -> C) drains before macrotasks (setTimeout -> B).',
        conceptTag: 'Event Loop & Microtasks',
      },
      {
        id: 'js-q2',
        prompt: 'Which array method returns a new array without mutating the original array?',
        options: ['array.splice()', 'array.sort()', 'array.map()', 'array.push()'],
        correctIndex: 2,
        explanation:
          'map() creates and returns a new transformed array, whereas splice(), sort(), and push() mutate the original array in place.',
        conceptTag: 'Immutable Array Operations',
      },
      {
        id: 'js-q3',
        prompt: 'Why does a closure retain access to outer function variables after the outer function returns?',
        options: [
          'JavaScript copies all variables onto window.globalScope',
          'The inner function preserves a lexical environment reference to its outer scope',
          'Variables declared with var are stored in localStorage automatically',
          'Garbage collection runs only when the browser tab closes',
        ],
        correctIndex: 1,
        explanation:
          'Closures bind a function to its surrounding lexical environment, keeping referenced outer variables alive.',
        conceptTag: 'Lexical Scope & Closures',
      },
      {
        id: 'js-q4',
        prompt: 'What happens if you await a rejected Promise inside an async function without a try/catch block?',
        options: [
          'await returns null silently',
          'The async function returns a rejected Promise to its caller',
          'JavaScript retries the Promise three times automatically',
          'The browser converts the rejection into undefined',
        ],
        correctIndex: 1,
        explanation:
          'An unhandled thrown error or rejected await inside an async function causes the returned Promise itself to reject.',
        conceptTag: 'Async/Await Error Handling',
      },
    ],
  },
  {
    id: 'quiz-react-core',
    topic: 'React Components, State & Hooks',
    targetSkill: 'React',
    difficulty: 'Diagnostic',
    estimatedMinutes: 4,
    questions: [
      {
        id: 'react-q1',
        prompt: 'Why should React state arrays or objects be updated immutably instead of mutating in place?',
        options: [
          'React uses Object.is reference comparison to detect changes and trigger re-renders',
          'Mutating objects throws a syntax error in JSX',
          'Immutable objects take zero bytes in memory',
          'React automatically writes immutable objects to IndexedDB',
        ],
        correctIndex: 0,
        explanation:
          'If you mutate an object in place and pass the same reference to setState, React sees the same reference and may skip re-rendering.',
        conceptTag: 'State Immutability',
      },
      {
        id: 'react-q2',
        prompt: 'What is the purpose of returning a cleanup function from useEffect?',
        options: [
          'To clear browser cookies after login',
          'To cancel subscriptions, timers, or listeners before re-running the effect or unmounting',
          'To force the parent component to unmount immediately',
          'To reset all useState hooks back to undefined',
        ],
        correctIndex: 1,
        explanation:
          'Cleanup functions prevent memory leaks and stale callbacks by tearing down timers, WebSockets, or event listeners.',
        conceptTag: 'Effect Lifecycle & Cleanup',
      },
      {
        id: 'react-q3',
        prompt: 'When rendering a dynamic list in React, why is using an array index as the key discouraged for reorderable items?',
        options: [
          'Indexes cannot be numbers in JSX',
          'React may reuse component DOM/state for the wrong item when items are inserted or reordered',
          'Array indexes disable CSS Tailwind classes',
          'Keys must always be UUID v4 strings',
        ],
        correctIndex: 1,
        explanation:
          'React reconciles list items by key; shifting indexes causes state and inputs to attach to the wrong logical item.',
        conceptTag: 'Reconciliation & Keys',
      },
      {
        id: 'react-q4',
        prompt: 'Where should state live when two sibling components need to stay synchronized?',
        options: [
          'In window.sharedState',
          'Lifted up to their closest common parent component',
          'Duplicated inside each sibling with setInterval sync',
          'Inside index.html meta tags',
        ],
        correctIndex: 1,
        explanation:
          'Lifting state to the closest common ancestor ensures a single source of truth via props and callbacks.',
        conceptTag: 'Lifting State Up',
      },
    ],
  },
  {
    id: 'quiz-node-api',
    topic: 'Node.js, Express & REST API Design',
    targetSkill: 'Node.js',
    difficulty: 'Diagnostic',
    estimatedMinutes: 4,
    questions: [
      {
        id: 'node-q1',
        prompt: 'In Express middleware (req, res, next), what happens if a middleware neither sends a response nor calls next()?',
        options: [
          'Express automatically returns 200 OK after 50ms',
          'The client request hangs until it times out',
          'Node restarts the worker thread',
          'Express skips to the last error handler',
        ],
        correctIndex: 1,
        explanation:
          'Every Express middleware must terminate the request-response cycle or delegate control via next().',
        conceptTag: 'Middleware Control Flow',
      },
      {
        id: 'node-q2',
        prompt: 'Which HTTP status code best indicates that an authenticated user lacks permission for a specific admin resource?',
        options: ['400 Bad Request', '401 Unauthorized', '403 Forbidden', '404 Not Found'],
        correctIndex: 2,
        explanation:
          '401 means missing/invalid authentication credentials; 403 means authenticated identity is known but lacks authorization.',
        conceptTag: 'HTTP Semantics & Auth',
      },
      {
        id: 'node-q3',
        prompt: 'Why should SQL queries in Node.js always use parameterized placeholders instead of template-literal string interpolation?',
        options: [
          'Template literals cannot hold numbers',
          'Parameterized queries separate SQL structure from user data, preventing SQL injection',
          'SQLite forbids backticks in JavaScript',
          'Placeholders automatically index every column',
        ],
        correctIndex: 1,
        explanation:
          'Bound parameters ensure user-supplied input is treated strictly as literal data, neutralizing SQL injection attacks.',
        conceptTag: 'Database Security',
      },
      {
        id: 'node-q4',
        prompt: 'Why is CPU-heavy synchronous computation dangerous on the main Node.js event loop?',
        options: [
          'It blocks the single thread from handling other incoming requests',
          'Node.js deletes environment variables during loops',
          'It automatically switches Express to HTTPS',
          'It clears the SQLite database file',
        ],
        correctIndex: 0,
        explanation:
          'Node.js handles concurrent I/O on a single main JS thread; blocking it starves all concurrent client connections.',
        conceptTag: 'Event Loop Scalability',
      },
    ],
  },
  {
    id: 'quiz-python-ml',
    topic: 'Python Engineering & Data Pipelines',
    targetSkill: 'Python',
    difficulty: 'Intermediate',
    estimatedMinutes: 4,
    questions: [
      {
        id: 'py-q1',
        prompt: 'Why are Python generators (yield) preferred over returning a full list for large data files?',
        options: [
          'Generators compute values lazily one item at a time, keeping memory O(1)',
          'Generators run automatically across 16 CPU cores',
          'Lists in Python cannot store strings longer than 256 chars',
          'yield converts Python into compiled C++',
        ],
        correctIndex: 0,
        explanation:
          'Generators produce items on demand without allocating the entire dataset in RAM.',
        conceptTag: 'Memory-Efficient Iteration',
      },
      {
        id: 'py-q2',
        prompt: 'What is the danger of using a mutable list as a default function argument in Python (def add_item(x, items=[]))?',
        options: [
          'Python raises a SyntaxError on import',
          'The same list object is shared across all calls that omit the argument',
          'The list becomes read-only after the first call',
          'It deletes local variables after return',
        ],
        correctIndex: 1,
        explanation:
          'Default argument expressions are evaluated once at function definition time, so mutating them persists across calls.',
        conceptTag: 'Function Scope Semantics',
      },
      {
        id: 'py-q3',
        prompt: 'Which data structure provides average O(1) membership checks (x in collection) in Python?',
        options: ['list', 'tuple', 'set', 'deque'],
        correctIndex: 2,
        explanation:
          'Python sets are hash tables offering average O(1) lookup compared to O(n) linear scans for lists and tuples.',
        conceptTag: 'Algorithmic Complexity',
      },
      {
        id: 'py-q4',
        prompt: 'In SQL + Python backends, what does a context manager (with conn:) guarantee?',
        options: [
          'The query executes asynchronously in the browser',
          'Resources and transactions are cleanly committed or rolled back and closed even on exceptions',
          'SQLite switches to NoSQL mode',
          'All tables are cached in memory forever',
        ],
        correctIndex: 1,
        explanation:
          'The __exit__ protocol guarantees deterministic cleanup and transaction handling even when errors occur.',
        conceptTag: 'Resource Management',
      },
    ],
  },
];

export const INITIAL_MENTOR_MESSAGES: MentorMessage[] = [
  {
    id: 'msg-welcome',
    sender: 'mentor',
    text: "Welcome back, Aarav. I've synced with the Skill Analyst, Career Matcher, and Curriculum Architect agents for your Full Stack Developer goal. Your Python (78%) and SQL (72%) foundations are already job-relevant—our immediate priority is bridging into async JavaScript before React. Ready to test your JS baseline or explore why Phase 1 starts where it does?",
    timestamp: 'Just now',
    suggestedAction: {
      label: 'Launch JavaScript Diagnostic',
      description: '4-question baseline check · Takes ~4 min',
      actionType: 'launch_quiz',
      payload: 'quiz-js-async',
    },
  },
];

export const LEARNER_PRESETS: LearnerPreset[] = [
  {
    id: 'preset-aarav',
    label: 'Aarav Nair · CS Undergrad',
    subtitle: 'Python + SQL + basic HTML → Full Stack Developer',
    profile: INITIAL_PROFILE,
  },
  {
    id: 'preset-priya',
    label: 'Priya Sharma · Data Analyst',
    subtitle: 'SQL + Statistics + Python → AI & ML Engineer',
    profile: {
      name: 'Priya Sharma',
      headline: 'Junior Business Data Analyst',
      location: 'Hyderabad, IN',
      avatarUrl: '',
      targetRoleId: 'ai-ml-engineer',
      bio: 'Writes daily SQL analytics queries and Python pandas scripts; aiming to transition into production PyTorch modeling and RAG systems.',
      weeklyHoursBudget: 10,
      existingSkills: [
        { id: 'p-sql', name: 'SQL', level: 84, category: 'Database', verifiedVia: 'Work Analytics' },
        { id: 'p-py', name: 'Python', level: 68, category: 'Backend', verifiedVia: 'Pandas Reporting' },
        { id: 'p-math', name: 'Math & Linear Algebra', level: 55, category: 'Foundations', verifiedVia: 'B.Sc. Coursework' },
        { id: 'p-viz', name: 'Data Visualization', level: 76, category: 'Frontend', verifiedVia: 'BI Dashboards' },
      ],
      certifications: [
        { id: 'p-c1', title: 'Applied SQL & Analytics Engineering', issuer: 'DataCamp', year: '2025' },
      ],
      projects: [
        {
          id: 'p-pr1',
          title: 'Retail Churn Cohort Dashboard',
          summary: 'Automated weekly cohort retention queries in PostgreSQL and Python pandas.',
          skillsUsed: ['SQL', 'Python', 'Data Visualization'],
        },
      ],
      assessmentHistory: [],
    },
  },
  {
    id: 'preset-marcus',
    label: 'Marcus Chen · IT Systems Tech',
    subtitle: 'Linux + Git + basic Python → Cloud DevOps Engineer',
    profile: {
      name: 'Marcus Chen',
      headline: 'Systems & Helpdesk Administrator',
      location: 'Austin, US',
      avatarUrl: '',
      targetRoleId: 'cloud-devops',
      bio: 'Manages Linux workstations, bash scripts, and internal Git repos; transitioning into containerized CI/CD and Kubernetes infrastructure.',
      weeklyHoursBudget: 14,
      existingSkills: [
        { id: 'm-linux', name: 'Linux & Networking', level: 74, category: 'DevOps', verifiedVia: 'Daily Operations' },
        { id: 'm-git', name: 'Git', level: 72, category: 'DevOps', verifiedVia: 'Internal Scripts' },
        { id: 'm-py', name: 'Python', level: 48, category: 'Backend', verifiedVia: 'Automation Scripts' },
      ],
      certifications: [
        { id: 'm-c1', title: 'CompTIA Linux+ Foundations', issuer: 'CompTIA', year: '2025' },
      ],
      projects: [
        {
          id: 'm-pr1',
          title: 'Automated Workstation Provisioner',
          summary: 'Shell and Python script suite configuring SSH keys and system packages across 40 lab machines.',
          skillsUsed: ['Linux & Networking', 'Python', 'Git'],
        },
      ],
      assessmentHistory: [],
    },
  },
];
