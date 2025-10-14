import React, { useState, useEffect, useCallback } from 'react';
import { User, Value, Goal, Project, Task, Review, Habit, IdealWeekBlock, TimeFormat, CalendarViewKey } from '../types';
import { apiFetch } from '../server';
import Header from './Header';
import Sidebar from './Sidebar';
import ValueList from './ValueList';
import GoalList from './GoalList';
import ProjectList from './ProjectList';
import ProjectBoard from './ProjectBoard';
import TasksView from './TasksView';
import TasksBoard from './TasksBoard';
import Reviews from './Reviews';
import HabitsView from './HabitsView';
import Settings from './Settings';
import CalendarView from './CalendarView';
import { SearchIcon, ViewGridIcon, ViewListIcon } from './icons';

type View = 'goals' | 'projects' | 'tasks' | 'habits' | 'calendar' | 'reviews' | 'settings';

interface DashboardProps {
  user: User;
  token: string;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  timeFormat: TimeFormat;
  onTimeFormatChange: (format: TimeFormat) => void;
  visibleCalendarViews: CalendarViewKey[];
  onVisibleCalendarViewsChange: (views: CalendarViewKey[]) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  user,
  token,
  onLogout,
  theme,
  onThemeChange,
  timeFormat,
  onTimeFormatChange,
  visibleCalendarViews,
  onVisibleCalendarViewsChange,
}) => {
  const [currentView, setCurrentView] = useState<View>('goals');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Data states
  const [values, setValues] = useState<Value[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [idealWeekBlocks, setIdealWeekBlocks] = useState<IdealWeekBlock[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [projectViewMode, setProjectViewMode] = useState<'list' | 'board'>('list');
  const [taskViewMode, setTaskViewMode] = useState<'list' | 'board'>('list');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      const data = await response.json();
      setValues(data.values || []);
      setGoals(data.goals || []);
      setProjects(data.projects || []);
      setTasks(data.tasks || []);
      setReviews(data.reviews || []);
      setHabits(data.habits || []);
      setIdealWeekBlocks(data.idealWeekBlocks || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- CRUD Handlers ---
  
  // Values
  const handleAddValue = async (text: string) => {
    const res = await apiFetch('/api/values', { method: 'POST', body: JSON.stringify({ text }), headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }});
    const newValue = await res.json();
    setValues(prev => [...prev, newValue]);
  };
  const handleUpdateValue = async (id: string, text: string) => {
    const res = await apiFetch(`/api/values/${id}`, { method: 'PUT', body: JSON.stringify({ text }), headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }});
    const updatedValue = await res.json();
    setValues(prev => prev.map(v => v.id === id ? updatedValue : v));
  };
  const handleDeleteValue = async (id: string) => {
    await apiFetch(`/api/values/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
    setValues(prev => prev.filter(v => v.id !== id));
  };

  // Goals
  const handleAddGoal = async (goal: Omit<Goal, 'id' | 'order'>) => {
    const res = await apiFetch('/api/goals', { method: 'POST', body: JSON.stringify(goal), headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }});
    const newGoal = await res.json();
    setGoals(prev => [...prev, newGoal]);
  };
  const handleUpdateGoal = async (goal: Goal) => {
    const res = await apiFetch(`/api/goals/${goal.id}`, { method: 'PUT', body: JSON.stringify(goal), headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }});
    const updatedGoal = await res.json();
    setGoals(prev => prev.map(g => g.id === goal.id ? updatedGoal : g));
  };
  const handleDeleteGoal = async (id: string) => {
    await apiFetch(`/api/goals/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
    setGoals(prev => prev.filter(g => g.id !== id));
  };
  const handleReorderGoals = async (reorderedGoals: Goal[]) => {
    setGoals(reorderedGoals); // Optimistic update
    const orderedIds = reorderedGoals.map(g => g.id);
    await apiFetch('/api/goals/reorder', { method: 'POST', body: JSON.stringify({ orderedIds }), headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }});
  };

  // Projects
  const handleAddProject = async (project: Omit<Project, 'id'>): Promise<Project> => {
    const res = await apiFetch('/api/projects', { method: 'POST', body: JSON.stringify(project), headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }});
    const newProject = await res.json();
    setProjects(prev => [...prev, newProject]);
    return newProject;
  };
  const handleUpdateProject = async (project: Project) => {
    const res = await apiFetch(`/api/projects/${project.id}`, { method: 'PUT', body: JSON.stringify(project), headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }});
    const updatedProject = await res.json();
    setProjects(prev => prev.map(p => p.id === project.id ? updatedProject : p));
  };
  const handleDeleteProject = async (id: string) => {
    await apiFetch(`/api/projects/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
    setProjects(prev => prev.filter(p => p.id !== id));
    setTasks(prev => prev.filter(t => t.projectId !== id)); // Also remove tasks of deleted project
  };

  // Tasks
  const handleAddTask = async (task: Omit<Task, 'id'>) => {
    const res = await apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify(task), headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }});
    const newTask = await res.json();
    setTasks(prev => [...prev, newTask]);
  };
  const handleUpdateTask = async (task: Task) => {
    const res = await apiFetch(`/api/tasks/${task.id}`, { method: 'PUT', body: JSON.stringify(task), headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }});
    const updatedTask = await res.json();
    setTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
  };
  const handleDeleteTask = async (id: string) => {
    await apiFetch(`/api/tasks/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  // Reviews
  const handleUpdateReview = async (review: Review): Promise<Review> => {
    const res = await apiFetch(`/api/reviews/${review.id}`, { method: 'PUT', body: JSON.stringify(review), headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }});
    const updatedReview = await res.json();
    setReviews(prev => prev.map(r => r.id === review.id ? updatedReview : r));
    return updatedReview;
  };

  // Habits
  const handleAddHabit = async (habit: Omit<Habit, 'id' | 'order' | 'completedDates'>): Promise<Habit> => {
      const res = await apiFetch('/api/habits', { method: 'POST', body: JSON.stringify(habit), headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
      const newHabit = await res.json();
      setHabits(prev => [...prev, newHabit].sort((a,b) => a.order - b.order));
      return newHabit;
  };
  const handleUpdateHabit = async (habit: Omit<Habit, 'completedDates' | 'order'>): Promise<Habit> => {
      const res = await apiFetch(`/api/habits/${habit.id}`, { method: 'PUT', body: JSON.stringify(habit), headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
      const updatedHabit = await res.json();
      setHabits(prev => prev.map(h => h.id === habit.id ? updatedHabit : h));
      return updatedHabit;
  };
  const handleDeleteHabit = async (id: string) => {
      await apiFetch(`/api/habits/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      setHabits(prev => prev.filter(h => h.id !== id));
  };
  const handleToggleHabitDate = async (habitId: string, date: string) => {
      const res = await apiFetch(`/api/habits/${habitId}/toggle`, { method: 'POST', body: JSON.stringify({ date }), headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
      const { completedDates } = await res.json();
      setHabits(prev => prev.map(h => h.id === habitId ? { ...h, completedDates } : h));
  };
  
  // Ideal Week Blocks
    const handleAddIdealWeekBlock = async (block: Omit<IdealWeekBlock, 'id'>): Promise<IdealWeekBlock> => {
        const res = await apiFetch('/api/ideal-week-blocks', { method: 'POST', body: JSON.stringify(block), headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }});
        const newBlock = await res.json();
        setIdealWeekBlocks(prev => [...prev, newBlock]);
        return newBlock;
    };
    const handleUpdateIdealWeekBlock = async (block: IdealWeekBlock): Promise<IdealWeekBlock> => {
        const res = await apiFetch(`/api/ideal-week-blocks/${block.id}`, { method: 'PUT', body: JSON.stringify(block), headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }});
        const updatedBlock = await res.json();
        setIdealWeekBlocks(prev => prev.map(b => b.id === block.id ? updatedBlock : b));
        return updatedBlock;
    };
    const handleDeleteIdealWeekBlock = async (id: string) => {
        await apiFetch(`/api/ideal-week-blocks/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }});
        setIdealWeekBlocks(prev => prev.filter(b => b.id !== id));
    };


  const renderView = () => {
    if (isLoading) {
      return <div className="flex items-center justify-center h-full"><p>Loading your dashboard...</p></div>;
    }
    if (error) {
      return <div className="flex items-center justify-center h-full"><p className="text-red-500">Error: {error}</p></div>;
    }

    switch (currentView) {
      case 'goals':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1"><ValueList values={values} onAddValue={handleAddValue} onUpdateValue={handleUpdateValue} onDeleteValue={handleDeleteValue} /></div>
            <div className="lg:col-span-2"><GoalList goals={goals} values={values} onAddGoal={handleAddGoal} onUpdateGoal={handleUpdateGoal} onDeleteGoal={handleDeleteGoal} onReorderGoals={handleReorderGoals} /></div>
          </div>
        );
      case 'projects':
        return projectViewMode === 'list' ? (
          <ProjectList projects={projects} goals={goals} tasks={tasks} searchQuery={searchQuery} onAddProject={handleAddProject} onUpdateProject={handleUpdateProject} onDeleteProject={handleDeleteProject} onAddTask={handleAddTask} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} timeFormat={timeFormat} />
        ) : (
          <ProjectBoard projects={projects} goals={goals} tasks={tasks} searchQuery={searchQuery} onUpdateTask={handleUpdateTask} />
        );
      case 'tasks':
        return taskViewMode === 'list' ? (
          <TasksView tasks={tasks} projects={projects} goals={goals} searchQuery={searchQuery} onUpdateTask={handleUpdateTask} onDeleteTask={handleDeleteTask} onAddTask={handleAddTask} timeFormat={timeFormat} />
        ) : (
          <TasksBoard tasks={tasks} projects={projects} goals={goals} searchQuery={searchQuery} onUpdateTask={handleUpdateTask} onAddTask={handleAddTask} />
        );
      case 'habits':
        return <HabitsView habits={habits} onAddHabit={handleAddHabit} onUpdateHabit={handleUpdateHabit} onDeleteHabit={handleDeleteHabit} onToggleDate={handleToggleHabitDate} />;
      case 'calendar':
        return <CalendarView 
            tasks={tasks} 
            onUpdateTask={handleUpdateTask} 
            onAddTask={handleAddTask} 
            timeFormat={timeFormat} 
            habits={habits} 
            onAddHabit={handleAddHabit} 
            onUpdateHabit={handleUpdateHabit} 
            onToggleHabitDate={handleToggleHabitDate}
            visibleViews={visibleCalendarViews} 
            idealWeekBlocks={idealWeekBlocks} 
            onAddIdealWeekBlock={handleAddIdealWeekBlock} 
            onUpdateIdealWeekBlock={handleUpdateIdealWeekBlock} 
            onDeleteIdealWeekBlock={handleDeleteIdealWeekBlock} 
            projects={projects} 
            goals={goals} 
            onAddProject={handleAddProject} />;
      case 'reviews':
        return <Reviews tasks={tasks} projects={projects} goals={goals} token={token} onUpdateReview={handleUpdateReview} setReviews={setReviews} />;
      case 'settings':
        return <Settings theme={theme} onThemeChange={onThemeChange} timeFormat={timeFormat} onTimeFormatChange={onTimeFormatChange} visibleCalendarViews={visibleCalendarViews} onVisibleCalendarViewsChange={onVisibleCalendarViewsChange} />;
      default:
        return <div>Select a view</div>;
    }
  };
  
  const showViewControls = currentView === 'projects' || currentView === 'tasks';

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} onLogout={onLogout} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentView={currentView} onViewChange={setCurrentView} isOpen={isSidebarOpen} />
        <main className={`flex-1 transition-all duration-300 ease-in-out overflow-y-auto p-4 sm:p-6 md:p-8 ${isSidebarOpen ? 'lg:ml-64' : 'ml-0'}`}>
          {showViewControls && (
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div className="relative flex-grow max-w-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <SearchIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  type="text"
                  name="search"
                  id="search"
                  className="block w-full rounded-md border-gray-300 dark:border-slate-600 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-slate-700"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center p-1 rounded-lg bg-gray-200 dark:bg-slate-700">
                {currentView === 'projects' && (
                  <>
                    <button onClick={() => setProjectViewMode('list')} className={`p-1.5 rounded-md ${projectViewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow-sm' : ''}`}><ViewListIcon className="h-5 w-5" /></button>
                    <button onClick={() => setProjectViewMode('board')} className={`p-1.5 rounded-md ${projectViewMode === 'board' ? 'bg-white dark:bg-slate-600 shadow-sm' : ''}`}><ViewGridIcon className="h-5 w-5" /></button>
                  </>
                )}
                 {currentView === 'tasks' && (
                  <>
                    <button onClick={() => setTaskViewMode('list')} className={`p-1.5 rounded-md ${taskViewMode === 'list' ? 'bg-white dark:bg-slate-600 shadow-sm' : ''}`}><ViewListIcon className="h-5 w-5" /></button>
                    <button onClick={() => setTaskViewMode('board')} className={`p-1.5 rounded-md ${taskViewMode === 'board' ? 'bg-white dark:bg-slate-600 shadow-sm' : ''}`}><ViewGridIcon className="h-5 w-5" /></button>
                  </>
                )}
              </div>
            </div>
          )}
          {renderView()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;