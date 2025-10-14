/**
 * NOTE: This is a SIMULATED backend.
 * In a real-world application, this would be a running Node.js/Express server
 * connected to a live PostgreSQL database. For this environment, we are
 * simulating the API responses and using sessionStorage to persist data across reloads.
 */
import { User, Value, Goal, Project, Task, Review, Habit, TaskStatus, TaskPriority, ReviewCadence, HabitFrequency, IdealWeekBlock } from './types';

// --- MOCK DATABASE ---
type DB = {
  users: (Omit<User, 'subscriptionStatus'> & { id: string; passwordHash: string; subscriptionStatus: 'Free' | 'Premium' })[];
  values: (Value & { userId: string })[];
  goals: (Goal & { userId: string })[];
  projects: (Project & { userId: string })[];
  tasks: (Task & { userId: string })[];
  reviews: (Review & { userId: string })[];
  habits: (Habit & { userId: string })[];
  idealWeekBlocks: (IdealWeekBlock & { userId: string })[];
};

const DB_KEY = 'life_manager_mock_db';

let db: DB;
try {
  const savedDb = sessionStorage.getItem(DB_KEY);
  if (savedDb) {
    db = JSON.parse(savedDb);
  } else {
    throw new Error("No saved DB");
  }
} catch (e) {
  db = {
    users: [],
    values: [],
    goals: [],
    projects: [],
    tasks: [],
    reviews: [],
    habits: [],
    idealWeekBlocks: [],
  };
}

const saveDb = () => {
  sessionStorage.setItem(DB_KEY, JSON.stringify(db));
};


// --- MOCK ENV VARS ---
const JWT_SECRET = 'your-super-secret-key-that-is-at-least-32-characters-long';

// --- MOCK UTILITIES ---
const bcrypt = {
  hash: async (password: string) => `${password}_hashed`,
  compare: async (password: string, hash: string) => `${password}_hashed` === hash,
};
const jwt = {
  sign: (payload: object) => JSON.stringify(payload),
  verify: (token: string) => JSON.parse(token),
};

// --- AUTH MIDDLEWARE SIMULATION ---
const getUserIdFromToken = (headers?: Headers): string | null => {
  const authHeader = headers?.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token) as { userId: string };
    return decoded.userId;
  } catch (error) {
    return null;
  }
};


// --- API Endpoint Simulation ---
async function handleApiRequest(path: string, method: string, body?: any, headers?: Headers) {
  console.log(`[Server] Received ${method} request for ${path}`, { body });

  // --- PUBLIC ROUTES ---
  if (path === '/api/register' && method === 'POST') {
    const { name, email, password } = body;
    if (!name || !email || !password) return new Response(JSON.stringify({ message: 'Missing required fields' }), { status: 400 });
    if (db.users.find(u => u.email === email)) return new Response(JSON.stringify({ message: 'User already exists' }), { status: 409 });
    
    const passwordHash = await bcrypt.hash(password);
    const newUser = { id: `user_${Date.now()}`, name, email, passwordHash, subscriptionStatus: 'Free' as const };
    db.users.push(newUser);

    // Add initial data for the new user
    const initialValue = { id: `val_${Date.now()}`, text: 'Health & Vitality', userId: newUser.id };
    db.values.push(initialValue);
    
    saveDb();
    
    const token = jwt.sign({ userId: newUser.id });
    console.log('[Server] Registered new user:', newUser);
    return new Response(JSON.stringify({ token }));
  }

  if (path === '/api/login' && method === 'POST') {
    const { email, password } = body;
    const user = db.users.find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return new Response(JSON.stringify({ message: 'Invalid credentials' }), { status: 401 });
    }
    const token = jwt.sign({ userId: user.id });
    return new Response(JSON.stringify({ token }));
  }

  if (path === '/api/test-login' && method === 'POST') {
    const TEST_USER_EMAIL = 'test@example.com';
    let testUser = db.users.find(u => u.email === TEST_USER_EMAIL);

    if (!testUser) {
        console.log('[Server] Creating test user and sample data...');
        const newUserId = `user_test_${Date.now()}`;
        testUser = { 
            id: newUserId, 
            name: 'Test User', 
            email: TEST_USER_EMAIL, 
            passwordHash: await bcrypt.hash('password'),
            subscriptionStatus: 'Premium' 
        };
        db.users.push(testUser);

        const today = new Date();
        const getPastDate = (days: number) => {
            const d = new Date();
            d.setDate(d.getDate() - days);
            return d.toISOString().split('T')[0];
        };
        const getFutureDate = (days: number) => {
            const d = new Date();
            d.setDate(d.getDate() + days);
            return d.toISOString().split('T')[0];
        };

        // Add sample data
        const val1 = { id: 'val_1', text: 'Continuous Learning', userId: newUserId };
        const val2 = { id: 'val_2', text: 'Health & Wellness', userId: newUserId };
        const val3 = { id: 'val_3', text: 'Financial Independence', userId: newUserId };
        const val4 = { id: 'val_4', text: 'Creative Expression', userId: newUserId };
        const val5 = { id: 'val_5', text: 'Strong Relationships', userId: newUserId };
        db.values.push(val1, val2, val3, val4, val5);

        const goal1 = { id: 'goal_1', title: 'Become a Proficient Developer', description: 'Master React and TypeScript for building modern web apps.', identity: 'I am a lifelong learner.', valueIds: [val1.id], userId: newUserId, order: 0 };
        const goal2 = { id: 'goal_2', title: 'Run a Half Marathon', description: 'Complete a 13.1 mile race in under 2 hours.', identity: 'I am an athlete.', valueIds: [val2.id], userId: newUserId, order: 1 };
        db.goals.push(goal1, goal2);

        const proj1 = { id: 'proj_1', title: 'Advanced React Course', description: 'Complete the full course on a learning platform.', goalId: goal1.id, userId: newUserId };
        const proj2 = { id: 'proj_2', title: '12-Week Training Program', description: 'Follow a structured running plan.', goalId: goal2.id, userId: newUserId };
        db.projects.push(proj1, proj2);
        
        const tasks: (Task & {userId: string})[] = [
            { id: 'task_1', title: 'Setup Development Environment', description: '', status: TaskStatus.Done, priority: TaskPriority.Upcoming, dueDate: null, dueTime: null, duration: 60, projectId: proj1.id, userId: newUserId },
            { id: 'task_2', title: 'Complete State Management Module', description: 'Focus on Zustand and Context API', status: TaskStatus.ToDo, priority: TaskPriority.Upcoming, dueDate: getFutureDate(2), dueTime: '10:00', duration: 120, projectId: proj1.id, userId: newUserId },
            { id: 'task_4', title: 'Monday - 5k run', description: 'Easy pace', status: TaskStatus.ToDo, priority: TaskPriority.Today, dueDate: getFutureDate(0), dueTime: '07:30', duration: 45, projectId: proj2.id, userId: newUserId },
            { id: 'task_standalone_1', title: 'Buy groceries', description: 'Milk, bread, eggs', status: TaskStatus.ToDo, priority: TaskPriority.Today, dueDate: getFutureDate(0), dueTime: '18:00', duration: 30, projectId: null, userId: newUserId },
        ];
        db.tasks.push(...tasks);

        const reviews: (Review & { userId: string})[] = [
            { id: 'rev_daily_1', cadence: 'Daily', period: getFutureDate(0), prompts: { "What was my biggest win today?": "Finished the main feature for the project." }, aiInsight: null, aiAdjustment: null, isCompleted: false, completedAt: null, userId: newUserId, goalIds: [] },
        ];
        db.reviews.push(...reviews);
        
        const habits: (Habit & { userId: string})[] = [
            { id: 'habit_1', name: 'Daily Run', description: 'Run at least 1 mile every day.', color: '#EF4444', completedDates: [getPastDate(1), getPastDate(2), getPastDate(4), getPastDate(5), getPastDate(6)], order: 0, userId: newUserId, startDate: getPastDate(30), endDate: null, frequency: 'Daily', dueTime: '07:00', duration: 45, useSameTimeForAllDays: true },
            { id: 'habit_2', name: 'Read 10 Pages', description: 'Read from a non-fiction book.', color: '#3B82F6', completedDates: Array.from({length: 10}, (_, i) => getPastDate(i+1)), order: 1, userId: newUserId, startDate: getPastDate(10), endDate: null, frequency: 'Daily', dueTime: null },
            { id: 'habit_3', name: 'Water Plants', description: 'Every 3 days.', color: '#22C55E', completedDates: [getPastDate(1), getPastDate(4), getPastDate(7)], order: 2, userId: newUserId, startDate: getPastDate(8), endDate: null, frequency: 'Custom', customFrequencyDays: 3, dueTime: null },
        ];
        db.habits.push(...habits);

        saveDb();
    }

    const token = jwt.sign({ userId: testUser.id });
    return new Response(JSON.stringify({ token }));
  }

  // --- PROTECTED ROUTES ---
  const userId = getUserIdFromToken(headers);
  if (!userId) {
     return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  }

  const user = db.users.find(u => u.id === userId);
  if (!user) {
    return new Response(JSON.stringify({ message: 'User not found' }), { status: 401 });
  }

  // GET /api/me
  if (path === '/api/me' && method === 'GET') {
     const { passwordHash, ...userResponse } = user;
     return new Response(JSON.stringify(userResponse));
  }

  // GET /api/dashboard
  if (path === '/api/dashboard' && method === 'GET') {
    const dashboardData = {
      values: db.values.filter(v => v.userId === userId),
      goals: db.goals.filter(g => g.userId === userId).sort((a, b) => a.order - b.order),
      projects: db.projects.filter(p => p.userId === userId),
      tasks: db.tasks.filter(t => t.userId === userId),
      reviews: db.reviews.filter(r => r.userId === userId),
      habits: db.habits.filter(h => h.userId === userId).sort((a,b) => a.order - b.order),
      idealWeekBlocks: db.idealWeekBlocks.filter(b => b.userId === userId),
    };
    return new Response(JSON.stringify(dashboardData));
  }

  // --- VALUES API ---
  if (path === '/api/values' && method === 'POST') {
    const newValue = { ...body, id: `val_${Date.now()}`, userId };
    db.values.push(newValue);
    saveDb();
    return new Response(JSON.stringify(newValue), { status: 201 });
  }
  if (path.match(/^\/api\/values\/.+$/) && method === 'PUT') {
    const id = path.split('/')[3];
    const valueIndex = db.values.findIndex(v => v.id === id && v.userId === userId);
    if (valueIndex === -1) return new Response('Not Found', { status: 404 });
    const updatedValue = { ...db.values[valueIndex], ...body };
    db.values[valueIndex] = updatedValue;
    saveDb();
    return new Response(JSON.stringify(updatedValue));
  }
   if (path.match(/^\/api\/values\/.+$/) && method === 'DELETE') {
    const id = path.split('/')[3];
    const initialLength = db.values.length;
    db.values = db.values.filter(v => !(v.id === id && v.userId === userId));
    if (db.values.length === initialLength) return new Response('Not Found', { status: 404 });
    saveDb();
    return new Response(null, { status: 204 });
  }

  // --- GOALS API ---
   if (path === '/api/goals' && method === 'POST') {
    const userGoals = db.goals.filter(g => g.userId === userId);
    const maxOrder = userGoals.reduce((max, g) => Math.max(max, g.order), -1);
    const newGoal = { ...body, id: `goal_${Date.now()}`, userId, order: maxOrder + 1 };
    db.goals.push(newGoal);
    saveDb();
    return new Response(JSON.stringify(newGoal), { status: 201 });
  }
   if (path.match(/^\/api\/goals\/.+$/) && method === 'PUT') {
    const id = path.split('/')[3];
    const goalIndex = db.goals.findIndex(g => g.id === id && g.userId === userId);
    if (goalIndex === -1) return new Response('Not Found', { status: 404 });
    const updatedGoal = { ...db.goals[goalIndex], ...body };
    db.goals[goalIndex] = updatedGoal;
    saveDb();
    return new Response(JSON.stringify(updatedGoal));
  }
  if (path.match(/^\/api\/goals\/.+$/) && method === 'DELETE') {
    const id = path.split('/')[3];
    db.goals = db.goals.filter(g => !(g.id === id && g.userId === userId));
    saveDb();
    return new Response(null, { status: 204 });
  }
  if (path === '/api/goals/reorder' && method === 'POST') {
    const { orderedIds } = body as { orderedIds: string[] };
    orderedIds.forEach((id, index) => {
      const goal = db.goals.find(g => g.id === id && g.userId === userId);
      if (goal) {
        goal.order = index;
      }
    });
    saveDb();
    return new Response(JSON.stringify({ message: 'Reorder successful' }));
  }

  // --- PROJECTS API ---
  if (path === '/api/projects' && method === 'POST') {
    const newProject = { ...body, id: `proj_${Date.now()}`, userId };
    db.projects.push(newProject);
    saveDb();
    return new Response(JSON.stringify(newProject), { status: 201 });
  }
  if (path.match(/^\/api\/projects\/.+$/) && method === 'PUT') {
    const id = path.split('/')[3];
    const projectIndex = db.projects.findIndex(p => p.id === id && p.userId === userId);
    if (projectIndex === -1) return new Response('Not Found', { status: 404 });
    const updatedProject = { ...db.projects[projectIndex], ...body };
    db.projects[projectIndex] = updatedProject;
    saveDb();
    return new Response(JSON.stringify(updatedProject));
  }
  if (path.match(/^\/api\/projects\/.+$/) && method === 'DELETE') {
    const id = path.split('/')[3];
    db.projects = db.projects.filter(p => !(p.id === id && p.userId === userId));
    // Cascade delete tasks
    db.tasks = db.tasks.filter(t => t.projectId !== id);
    saveDb();
    return new Response(null, { status: 204 });
  }

  // --- TASKS API ---
  if (path === '/api/tasks' && method === 'POST') {
    const newTask = { ...body, id: `task_${Date.now()}`, userId };
    db.tasks.push(newTask);
    saveDb();
    return new Response(JSON.stringify(newTask), { status: 201 });
  }
   if (path.match(/^\/api\/tasks\/.+$/) && method === 'PUT') {
    const id = path.split('/')[3];
    const taskIndex = db.tasks.findIndex(t => t.id === id && t.userId === userId);
    if (taskIndex === -1) return new Response('Not Found', { status: 404 });
    const updatedTask = { ...db.tasks[taskIndex], ...body };
    db.tasks[taskIndex] = updatedTask;
    saveDb();
    return new Response(JSON.stringify(updatedTask));
  }
  if (path.match(/^\/api\/tasks\/.+$/) && method === 'DELETE') {
    const id = path.split('/')[3];
    db.tasks = db.tasks.filter(t => !(t.id === id && t.userId === userId));
    saveDb();
    return new Response(null, { status: 204 });
  }

  // --- REVIEWS API ---
  if (path === '/api/reviews/find-or-create' && method === 'POST') {
    const { cadence, period } = body;
    let review = db.reviews.find(r => r.userId === userId && r.cadence === cadence && r.period === period);
    if (review) {
      return new Response(JSON.stringify(review));
    }
    const newReview: Review & { userId: string } = {
      id: `rev_${cadence.toLowerCase()}_${period}_${Date.now()}`,
      cadence,
      period,
      prompts: {},
      aiInsight: null,
      aiAdjustment: null,
      isCompleted: false,
      completedAt: null,
      goalIds: [],
      userId
    };
    db.reviews.push(newReview);
    saveDb();
    return new Response(JSON.stringify(newReview), { status: 201 });
  }

  if (path.match(/^\/api\/reviews\/.+$/) && method === 'PUT') {
    const id = path.split('/')[3];
    const reviewIndex = db.reviews.findIndex(r => r.id === id && r.userId === userId);
    if (reviewIndex === -1) return new Response('Not Found', { status: 404 });
    const updatedReview = { ...db.reviews[reviewIndex], ...body };
    db.reviews[reviewIndex] = updatedReview;
    saveDb();
    return new Response(JSON.stringify(updatedReview));
  }

  if (path === '/api/reviews/generate-insights' && method === 'POST') {
    const { reviewId, goalIds } = body;
    const reviewIndex = db.reviews.findIndex(r => r.id === reviewId && r.userId === userId);
    if (reviewIndex === -1) return new Response('Not Found', { status: 404 });

    let insight = "Consistent daily task completion directly correlates with project velocity.";
    let adjustment = "Increase 'Deep Work' blocks by 15% to accelerate progress on your primary goal.";

    if (goalIds && goalIds.length > 0) {
        const linkedGoalId = goalIds[0];
        const linkedGoal = db.goals.find(g => g.id === linkedGoalId);
        if (linkedGoal) {
            insight = `Focusing on your goal '${linkedGoal.title}', your progress appears steady. The main driver seems to be the completion of related project tasks.`;
            adjustment = `To accelerate towards '${linkedGoal.title}', consider breaking down the largest remaining task into smaller, more manageable sub-tasks.`;
        }
    }
    
    db.reviews[reviewIndex].aiInsight = insight;
    db.reviews[reviewIndex].aiAdjustment = adjustment;
    saveDb();
    
    return new Response(JSON.stringify({ insight, adjustment }));
  }

  // --- HABITS API ---
  if (path === '/api/habits' && method === 'POST') {
    const userHabits = db.habits.filter(h => h.userId === userId);
    const maxOrder = userHabits.reduce((max, h) => Math.max(max, h.order), -1);
    const newHabit = { ...body, id: `habit_${Date.now()}`, userId, completedDates: [], order: maxOrder + 1 };
    db.habits.push(newHabit);
    saveDb();
    return new Response(JSON.stringify(newHabit), { status: 201 });
  }
  if (path.match(/^\/api\/habits\/.+\/toggle$/) && method === 'POST') {
    const id = path.split('/')[3];
    const { date } = body as { date: string }; // YYYY-MM-DD
    const habit = db.habits.find(h => h.id === id && h.userId === userId);
    if (!habit) return new Response('Not Found', { status: 404 });
    const dateIndex = habit.completedDates.indexOf(date);
    if (dateIndex > -1) {
      habit.completedDates.splice(dateIndex, 1);
    } else {
      habit.completedDates.push(date);
      habit.completedDates.sort();
    }
    saveDb();
    return new Response(JSON.stringify({ completedDates: habit.completedDates }));
  }
  if (path.match(/^\/api\/habits\/.+$/) && method === 'PUT') {
    const id = path.split('/')[3];
    const habitIndex = db.habits.findIndex(h => h.id === id && h.userId === userId);
    if (habitIndex === -1) return new Response('Not Found', { status: 404 });
    const { name, description, color, startDate, endDate, frequency, weeklyDays, customFrequencyDays, dueTime, duration, useSameTimeForAllDays, dailyTimes, dailyDurations, checkpoints } = body;
    db.habits[habitIndex] = { ...db.habits[habitIndex], name, description, color, startDate, endDate, frequency, weeklyDays, customFrequencyDays, dueTime, duration, useSameTimeForAllDays, dailyTimes, dailyDurations, checkpoints };
    saveDb();
    return new Response(JSON.stringify(db.habits[habitIndex]));
  }
  if (path.match(/^\/api\/habits\/.+$/) && method === 'DELETE') {
    const id = path.split('/')[3];
    db.habits = db.habits.filter(h => !(h.id === id && h.userId === userId));
    saveDb();
    return new Response(null, { status: 204 });
  }

  // --- IDEAL WEEK BLOCKS API ---
  if (path === '/api/ideal-week-blocks' && method === 'POST') {
    const newBlock = { ...body, id: `iwb_${Date.now()}`, userId };
    db.idealWeekBlocks.push(newBlock);
    saveDb();
    return new Response(JSON.stringify(newBlock), { status: 201 });
  }
  if (path.match(/^\/api\/ideal-week-blocks\/.+$/) && method === 'PUT') {
    const id = path.split('/')[3];
    const blockIndex = db.idealWeekBlocks.findIndex(b => b.id === id && b.userId === userId);
    if (blockIndex === -1) return new Response('Not Found', { status: 404 });
    const updatedBlock = { ...db.idealWeekBlocks[blockIndex], ...body };
    db.idealWeekBlocks[blockIndex] = updatedBlock;
    saveDb();
    return new Response(JSON.stringify(updatedBlock));
  }
  if (path.match(/^\/api\/ideal-week-blocks\/.+$/) && method === 'DELETE') {
    const id = path.split('/')[3];
    db.idealWeekBlocks = db.idealWeekBlocks.filter(b => !(b.id === id && b.userId === userId));
    saveDb();
    return new Response(null, { status: 204 });
  }


  return new Response('Not Found', { status: 404 });
}

// --- Exported Fetch Simulation ---
export const apiFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : (input instanceof URL ? input.href : input.url);
  
  if (url.startsWith('/api/')) {
    // Simulate network latency
    await new Promise(res => setTimeout(res, Math.random() * 300 + 50));

    const path = new URL(url, window.location.origin).pathname;
    const method = init?.method || 'GET';
    const headers = init?.headers ? new Headers(init.headers) : new Headers();
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    return handleApiRequest(path, method, body, headers);
  }
  
  return window.fetch(input, init);
};

export {};