import React, { useState, useEffect, useCallback } from 'react';
import { User, Value, Goal, Project, Task, Review, Habit, IdealWeekBlock, TimeFormat, CalendarViewKey } from '../types';
import * as firebaseService from '../firebase';
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
  userId: string;
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
  userId,
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
      const data = await firebaseService.fetchUserData(userId);
      setValues(data.values || []);
      setGoals(data.goals || []);
      setProjects(data.projects || []);
      setTasks(data.tasks || []);
      setReviews(data.reviews || []);
      setHabits(data.habits || []);
      setIdealWeekBlocks(data.idealWeekBlocks || []);
    } catch (err: any) {
      console.error('[Dashboard] Error fetching user data:', err);
      // Show error but allow the dashboard to render with empty data
      setError('Could not load your data. Please check your internet connection. Data will sync when connection is restored.');
      // Initialize with empty arrays so dashboard still works
      setValues([]);
      setGoals([]);
      setProjects([]);
      setTasks([]);
      setReviews([]);
      setHabits([]);
      setIdealWeekBlocks([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- CRUD Handlers ---
  
  // Values
  const handleAddValue = async (text: string) => {
    try {
      const newValue = await firebaseService.saveValue(userId, { text });
      setValues(prev => [...prev, newValue]);
    } catch (err: any) {
      setError(err.message);
    }
  };
  const handleUpdateValue = async (id: string, text: string) => {
    try {
      await firebaseService.updateValue(id, { text });
      setValues(prev => prev.map(v => v.id === id ? { ...v, text } : v));
    } catch (err: any) {
      setError(err.message);
    }
  };
  const handleDeleteValue = async (id: string) => {
    try {
      await firebaseService.deleteValue(id);
      setValues(prev => prev.filter(v => v.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Goals
  const handleAddGoal = async (goal: Omit<Goal, 'id' | 'order'>) => {
    try {
      console.log('[Dashboard] Adding goal:', goal);
      const newGoal = await firebaseService.saveGoal(userId, goal);
      console.log('[Dashboard] Goal added successfully:', newGoal);
      setGoals(prev => [...prev, newGoal].sort((a, b) => a.order - b.order));
    } catch (err: any) {
      console.error('[Dashboard] Error adding goal:', err);
      setError(err.message);
    }
  };
  const handleUpdateGoal = async (goal: Goal) => {
    try {
      await firebaseService.updateGoal(goal.id, goal);
      setGoals(prev => prev.map(g => g.id === goal.id ? goal : g));
    } catch (err: any) {
      setError(err.message);
    }
  };
  const handleDeleteGoal = async (id: string) => {
    try {
      await firebaseService.deleteGoal(id);
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };
  const handleReorderGoals = async (reorderedGoals: Goal[]) => {
    setGoals(reorderedGoals); // Optimistic update
    try {
      for (const goal of reorderedGoals) {
        await firebaseService.updateGoal(goal.id, { order: goal.order });
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Projects
  const handleAddProject = async (project: Omit<Project, 'id'>): Promise<Project> => {
    try {
      const newProject = await firebaseService.saveProject(userId, project);
      setProjects(prev => [...prev, newProject]);
      return newProject;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };
  const handleUpdateProject = async (project: Project) => {
    try {
      await firebaseService.updateProject(project.id, project);
      setProjects(prev => prev.map(p => p.id === project.id ? project : p));
    } catch (err: any) {
      setError(err.message);
    }
  };
  const handleDeleteProject = async (id: string) => {
    try {
      await firebaseService.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      setTasks(prev => prev.filter(t => t.projectId !== id)); // Also remove tasks of deleted project
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Tasks
  const handleAddTask = async (task: Omit<Task, 'id'>) => {
    try {
      const newTask = await firebaseService.saveTask(userId, task);
      setTasks(prev => [...prev, newTask]);
    } catch (err: any) {
      setError(err.message);
    }
  };
  const handleUpdateTask = async (task: Task) => {
    try {
      await firebaseService.updateTask(task.id, task);
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    } catch (err: any) {
      setError(err.message);
    }
  };
  const handleDeleteTask = async (id: string) => {
    try {
      await firebaseService.deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Reviews
  const handleUpdateReview = async (review: Review): Promise<Review> => {
    try {
      await firebaseService.updateReview(review.id, review);
      setReviews(prev => prev.map(r => r.id === review.id ? review : r));
      return review;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Habits
  const handleAddHabit = async (habit: Omit<Habit, 'id' | 'order' | 'completedDates'>): Promise<Habit> => {
    try {
      const newHabit = await firebaseService.saveHabit(userId, habit);
      setHabits(prev => [...prev, newHabit].sort((a, b) => a.order - b.order));
      return newHabit;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };
  const handleUpdateHabit = async (habit: Omit<Habit, 'completedDates' | 'order'>): Promise<Habit> => {
    try {
      const updatedHabit = { ...habit } as Habit;
      await firebaseService.updateHabit(habit.id, updatedHabit);
      setHabits(prev => prev.map(h => h.id === habit.id ? updatedHabit : h));
      return updatedHabit;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };
  const handleDeleteHabit = async (id: string) => {
    try {
      await firebaseService.deleteHabit(id);
      setHabits(prev => prev.filter(h => h.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };
  const handleToggleHabitDate = async (habitId: string, date: string) => {
    try {
      const habit = habits.find(h => h.id === habitId);
      if (!habit) return;
      
      const completedDates = habit.completedDates || [];
      const dateIndex = completedDates.indexOf(date);
      const updatedDates = dateIndex >= 0 
        ? completedDates.filter((_, i) => i !== dateIndex)
        : [...completedDates, date];
      
      await firebaseService.updateHabit(habitId, { completedDates: updatedDates });
      setHabits(prev => prev.map(h => h.id === habitId ? { ...h, completedDates: updatedDates } : h));
    } catch (err: any) {
      setError(err.message);
    }
  };
  
  // Ideal Week Blocks
  const handleAddIdealWeekBlock = async (block: Omit<IdealWeekBlock, 'id'>): Promise<IdealWeekBlock> => {
    try {
      const newBlock = await firebaseService.saveIdealWeekBlock(userId, block);
      setIdealWeekBlocks(prev => [...prev, newBlock]);
      return newBlock;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };
  const handleUpdateIdealWeekBlock = async (block: IdealWeekBlock): Promise<IdealWeekBlock> => {
    try {
      await firebaseService.updateIdealWeekBlock(block.id, block);
      setIdealWeekBlocks(prev => prev.map(b => b.id === block.id ? block : b));
      return block;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };
  const handleDeleteIdealWeekBlock = async (id: string) => {
    try {
      await firebaseService.deleteIdealWeekBlock(id);
      setIdealWeekBlocks(prev => prev.filter(b => b.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };


  const renderView = () => {
    if (isLoading) {
      return <div className="flex items-center justify-center h-full"><p>Loading your dashboard...</p></div>;
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
        return <Reviews tasks={tasks} projects={projects} goals={goals} onUpdateReview={handleUpdateReview} setReviews={setReviews} />;
      case 'settings':
        return <Settings 
          theme={theme} 
          onThemeChange={onThemeChange} 
          timeFormat={timeFormat} 
          onTimeFormatChange={onTimeFormatChange} 
          visibleCalendarViews={visibleCalendarViews} 
          onVisibleCalendarViewsChange={onVisibleCalendarViewsChange}
          userId={userId}
          userTwoFactorEnabled={user.twoFactorEnabled || false}
          userPhoneNumber={user.phoneNumber || ''}
        />;
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
          {error && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="ml-4 text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300"
              >
                ✕
              </button>
            </div>
          )}
          {renderView()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;