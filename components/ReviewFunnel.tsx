import React from 'react';
import { Task, Project, Goal, ReviewCadence, TaskStatus } from '../types';

interface ReviewFunnelProps {
  tasks: Task[];
  projects: Project[];
  goals: Goal[];
  cadence: ReviewCadence;
}

const FunnelStep = ({ title, value, label, color, isGoal }: { title: string, value: string, label: string, color: string, isGoal?: boolean }) => (
  <div className={`flex-1 p-6 rounded-2xl shadow-lg relative overflow-hidden`} style={{ backgroundColor: color }}>
    <div className="relative z-10">
      <p className="text-sm font-medium text-white/80 uppercase tracking-wider">{title}</p>
      {isGoal ? (
        <p className="text-xl font-bold text-white mt-2 truncate">{value}</p>
      ) : (
        <p className="text-4xl font-bold text-white mt-1">{value}</p>
      )}
      <div className="h-1 w-1/3 bg-white/50 mt-3 mb-2 rounded-full"></div>
      <p className="text-xs text-white/90">{label}</p>
    </div>
  </div>
);

const ReviewFunnel: React.FC<ReviewFunnelProps> = ({ tasks, projects, goals, cadence }) => {
  // NOTE: These are simplified calculations for demonstration purposes.
  // A real implementation would filter data based on the selected review period.

  const completedTasks = tasks.filter(t => t.status === TaskStatus.Done).length;
  const taskCompletion = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 100;

  const calculateProjectProgress = (projectId: string) => {
    const projectTasks = tasks.filter(task => task.projectId === projectId);
    if (projectTasks.length === 0) return 100; // No tasks = on track
    const doneTasks = projectTasks.filter(task => task.status === TaskStatus.Done).length;
    return Math.round((doneTasks / projectTasks.length) * 100);
  };
  const projectsOnTrack = projects.filter(p => calculateProjectProgress(p.id) >= 75).length;
  const projectProgress = projects.length > 0 ? Math.round((projectsOnTrack / projects.length) * 100) : 100;
  
  // For demo, we assume 1 goal per quarter. A real app would link goals to periods.
  const relevantGoal = goals[0]?.title || `Define a ${cadence} Goal`;

  return (
    <div className="bg-white dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-center mb-6">Review Funnel</h2>
      <div className="flex flex-col md:flex-row items-stretch gap-2">
        <FunnelStep 
            title="Daily Actions" 
            value={`${taskCompletion}%`} 
            label="Tasks Completed" 
            color="#0D9488" // teal-600
        />
         <FunnelStep 
            title="Weekly Habits" 
            value="✔ 4/4" 
            label="Weekly Reviews Done" 
            color="#059669" // green-600
        />
        <FunnelStep 
            title="Monthly Projects" 
            value={`${projectProgress}%`} 
            label="Projects on Track" 
            color="#4F46E5" // indigo-600
        />
        <FunnelStep 
            title={`On ${cadence} Goals`}
            value={relevantGoal}
            label="" 
            color="#7C3AED" // violet-600
            isGoal
        />
      </div>
    </div>
  );
};

export default ReviewFunnel;