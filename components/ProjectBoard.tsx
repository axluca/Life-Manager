import React, { useMemo, useState } from 'react';
import { Project, Goal, Task } from '../types';
import ProjectCard from './ProjectCard';
import TaskModal from './TaskModal';

interface ProjectBoardProps {
  projects: Project[];
  goals: Goal[];
  tasks: Task[];
  searchQuery: string;
  onUpdateTask: (task: Task) => void;
}

const ProjectBoard: React.FC<ProjectBoardProps> = ({ projects, goals, tasks, searchQuery, onUpdateTask }) => {
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const filteredProjects = useMemo(() => {
    if (!searchQuery) {
        return projects;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return projects.filter(p =>
        p.title.toLowerCase().includes(lowercasedQuery) ||
        p.description.toLowerCase().includes(lowercasedQuery)
    );
  }, [projects, searchQuery]);

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task);
  };

  const handleCloseModal = () => {
    setTaskToEdit(null);
  };

  const handleSaveTask = (taskData: Task | Omit<Task, 'id'>) => {
    if ('id' in taskData) {
      onUpdateTask(taskData as Task);
    }
    // 'add' case is not handled here as we can only edit from the board
    handleCloseModal();
  };

  const getGoalTitle = (id: string) => {
    return goals.find(g => g.id === id)?.title || 'Unlinked Goal';
  };

  const tasksByProject = useMemo(() => {
    const grouped = new Map<string, Task[]>();
    tasks.forEach(task => {
      if (!grouped.has(task.projectId)) {
        grouped.set(task.projectId, []);
      }
      grouped.get(task.projectId)!.push(task);
    });
    return grouped;
  }, [tasks]);

  if (projects.length > 0 && filteredProjects.length === 0) {
    return (
        <div className="text-center text-slate-500 text-sm py-8 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg">
            <p>No projects match your search for "{searchQuery}".</p>
        </div>
    )
  }

  if (projects.length === 0) {
    return (
        <div className="text-center text-slate-500 text-sm py-8 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg">
            <p>Your projects will appear here on the board view.</p>
            <p>Create a project to get started.</p>
        </div>
    )
  }

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {filteredProjects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            goalTitle={getGoalTitle(project.goalId)}
            tasks={tasksByProject.get(project.id) || []}
            onEditTask={handleEditTask}
          />
        ))}
         {/* Add a spacer to allow scrolling past the last card easily */}
        <div className="flex-shrink-0 w-1"></div>
      </div>
      {taskToEdit && (
        <TaskModal
            projectId={taskToEdit.projectId}
            taskToEdit={taskToEdit}
            onClose={handleCloseModal}
            onSaveTask={handleSaveTask}
        />
      )}
    </>
  );
};

export default ProjectBoard;