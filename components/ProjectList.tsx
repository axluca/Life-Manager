import React, { useState, useMemo } from 'react';
import { Project, Goal, Task, TaskStatus, TimeFormat } from '../types';
import { BriefcaseIcon, PlusIcon, PencilIcon, TrashIcon } from './icons';
import ProjectModal from './ProjectModal';
import TaskList from './TaskList';
import TaskModal from './TaskModal';

interface ProjectListProps {
  projects: Project[];
  goals: Goal[];
  tasks: Task[];
  searchQuery: string;
  onAddProject: (project: Omit<Project, 'id'>) => void;
  onUpdateProject: (project: Project) => void;
  onDeleteProject: (id: string) => void;
  onAddTask: (task: Omit<Task, 'id'>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  timeFormat: TimeFormat;
}

const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  goals,
  tasks,
  searchQuery,
  onAddProject,
  onUpdateProject,
  onDeleteProject,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  timeFormat,
}) => {
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [taskModalState, setTaskModalState] = useState<{ isOpen: boolean; taskToEdit: Task | null; forProjectId?: string }>({ isOpen: false, taskToEdit: null });


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

  const getGoalTitle = (id: string) => {
    return goals.find(g => g.id === id)?.title || 'Unlinked Goal';
  };
  
  const handleEditProject = (project: Project) => {
    setProjectToEdit(project);
    setIsProjectModalOpen(true);
  };
  
  const handleCloseProjectModal = () => {
    setIsProjectModalOpen(false);
    setProjectToEdit(null);
  };
  
  const handleSaveProject = (projectData: Project | Omit<Project, 'id'>) => {
    if ('id' in projectData) {
      onUpdateProject(projectData as Project);
    } else {
      onAddProject(projectData);
    }
    handleCloseProjectModal();
  };

  const handleOpenNewTaskModal = (projectId: string) => {
    setTaskModalState({ isOpen: true, taskToEdit: null, forProjectId: projectId });
  };

  const handleOpenEditTaskModal = (task: Task) => {
    setTaskModalState({ isOpen: true, taskToEdit: task, forProjectId: task.projectId || undefined });
  };
  
  const handleCloseTaskModal = () => {
     setTaskModalState({ isOpen: false, taskToEdit: null });
  };

  const handleSaveTask = (taskData: Task | Omit<Task, 'id'>) => {
    if ('id' in taskData) {
      onUpdateTask(taskData as Task);
    } else {
      onAddTask(taskData);
    }
    handleCloseTaskModal();
  };


  const calculateProgress = (projectId: string) => {
    const projectTasks = tasks.filter(task => task.projectId === projectId);
    if (projectTasks.length === 0) {
      return 0;
    }
    const doneTasks = projectTasks.filter(task => task.status === TaskStatus.Done).length;
    return Math.round((doneTasks / projectTasks.length) * 100);
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <BriefcaseIcon className="h-6 w-6 text-indigo-500 dark:text-indigo-400" />
            <h2 className="ml-3 text-xl font-bold text-slate-900 dark:text-gray-100">Projects</h2>
          </div>
          <button
            onClick={() => setIsProjectModalOpen(true)}
            disabled={goals.length === 0}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors disabled:bg-indigo-400/50 disabled:cursor-not-allowed"
            title={goals.length === 0 ? "You must create a goal before adding a project" : "Add New Project"}
          >
            <PlusIcon className="h-5 w-5 mr-1 -ml-1" />
            New Project
          </button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Break down your goals into actionable projects. This is where the work happens.</p>
        
        {goals.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-8 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg">
              <p>You need to create a Goal before you can add a Project.</p>
          </div>
        )}

        <div className="space-y-6">
          {filteredProjects.length > 0 ? (
            filteredProjects.map(project => {
              const progress = calculateProgress(project.id);
              return (
              <div key={project.id} className="bg-gray-100/50 dark:bg-slate-700/50 p-4 rounded-lg">
                 <div className="group flex justify-between items-start">
                  <div className="flex-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">{getGoalTitle(project.goalId)}</span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">{project.title}</h3>
                    {project.description && <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{project.description}</p>}
                  </div>
                   <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 ml-4 flex-shrink-0">
                      <button onClick={() => handleEditProject(project)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                          <PencilIcon className="h-4 w-4"/>
                      </button>
                      <button onClick={() => onDeleteProject(project.id)} className="text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400">
                          <TrashIcon className="h-4 w-4"/>
                      </button>
                    </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Progress</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                    <div
                      className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                <TaskList
                  projectId={project.id}
                  tasks={tasks.filter(t => t.projectId === project.id)}
                  onUpdateTask={onUpdateTask}
                  onDeleteTask={onDeleteTask}
                  onAddTaskClick={() => handleOpenNewTaskModal(project.id)}
                  onEditTask={handleOpenEditTaskModal}
                  timeFormat={timeFormat}
                />
              </div>
            )})
          ) : (
            goals.length > 0 && (
                <div className="text-center text-slate-500 text-sm py-8 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-lg">
                    {searchQuery ? (
                      <p>No projects match your search for "{searchQuery}".</p>
                    ) : (
                      <>
                        <p>Your projects will appear here.</p>
                        <p>Click "New Project" to break down a goal.</p>
                      </>
                    )}
                </div>
            )
          )}
        </div>
      </div>

       {isProjectModalOpen && (
        <ProjectModal
          goals={goals}
          projectToEdit={projectToEdit}
          onClose={handleCloseProjectModal}
          onSaveProject={handleSaveProject}
        />
      )}
      {taskModalState.isOpen && (
        <TaskModal
          projectId={taskModalState.forProjectId}
          taskToEdit={taskModalState.taskToEdit}
          projects={projects}
          onClose={handleCloseTaskModal}
          onSaveTask={handleSaveTask}
        />
      )}
    </>
  );
};

export default ProjectList;