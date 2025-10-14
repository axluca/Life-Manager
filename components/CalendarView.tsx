import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Task, TaskPriority, TimeFormat, Habit, CalendarViewKey, IdealWeekBlock, IdealWeekBlockType, Project, Goal, TaskStatus } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, LogoIcon } from './icons';
import TaskModal from './TaskModal';
import HabitModal from './HabitModal';
import IdealWeekBlockModal from './IdealWeekBlockModal';
import ProjectModal from './ProjectModal';

interface CalendarViewProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onAddTask: (task: Omit<Task, 'id'>) => void;
  timeFormat: TimeFormat;
  habits: Habit[];
  onAddHabit: (habit: Omit<Habit, 'id' | 'order' | 'completedDates'>) => Promise<Habit>;
  onUpdateHabit: (habit: Omit<Habit, 'completedDates' | 'order'>) => Promise<Habit>;
  onToggleHabitDate: (habitId: string, date: string) => void;
  visibleViews: CalendarViewKey[];
  idealWeekBlocks: IdealWeekBlock[];
  onAddIdealWeekBlock: (block: Omit<IdealWeekBlock, 'id'>) => Promise<IdealWeekBlock>;
  onUpdateIdealWeekBlock: (block: IdealWeekBlock) => Promise<IdealWeekBlock>;
  onDeleteIdealWeekBlock: (id: string) => void;
  projects: Project[];
  goals: Goal[];
  onAddProject: (project: Omit<Project, 'id'>) => Promise<Project>;
}

type CalendarViewMode = 'year' | 'quarter' | 'month' | 'week' | 'day' | 'multiday' | 'ideal';
type DragType = 'move' | 'resize-top' | 'resize-bottom';

const priorityClasses: Record<TaskPriority, string> = {
  [TaskPriority.Today]: 'bg-yellow-500/80 hover:bg-yellow-500 border-yellow-400',
  [TaskPriority.Upcoming]: 'bg-red-500/80 hover:bg-red-500 border-red-400',
  [TaskPriority.Anytime]: 'bg-blue-500/80 hover:bg-blue-500 border-blue-400',
  [TaskPriority.Someday]: 'bg-gray-500/80 hover:bg-gray-500 border-gray-400',
};

// Helper to get local date string consistently, avoiding timezone issues with toISOString
const toLocalDateString = (date: Date): string => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

// Helper to determine if a habit is due on a specific date
const isDateTrackable = (checkDate: Date, habit: Habit): boolean => {
    const d = new Date(checkDate);
    d.setHours(0, 0, 0, 0);

    const startDate = new Date(habit.startDate + 'T00:00:00');
    
    if (d < startDate) return false;

    if (habit.endDate) {
        const endDate = new Date(habit.endDate + 'T00:00:00');
        if (d > endDate) return false;
    }

    switch (habit.frequency) {
        case 'Daily':
            return true;
        case 'Weekly':
            if (!habit.weeklyDays || habit.weeklyDays.length === 0) {
                 // Fallback to old behavior if weeklyDays isn't set
                return d.getDay() === startDate.getDay();
            }
            return habit.weeklyDays.includes(d.getDay());
        case 'Monthly':
            const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
            const targetDay = Math.min(startDate.getDate(), lastDayOfMonth);
            return d.getDate() === targetDay;
        case 'Custom':
            if (!habit.customFrequencyDays || habit.customFrequencyDays <= 0) return false;
            const diffTime = d.getTime() - startDate.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            return diffDays % habit.customFrequencyDays === 0;
    }
    return false;
};


// Helper for mapping visual day index (Mon=0) to JS getDay() (Sun=0)
const daysOfWeekForMapping = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i)); // Generic week starting on Monday

const CalendarView: React.FC<CalendarViewProps> = ({ 
  tasks, onUpdateTask, onAddTask, timeFormat, 
  habits, onAddHabit, onUpdateHabit, onToggleHabitDate,
  visibleViews,
  idealWeekBlocks, onAddIdealWeekBlock, onUpdateIdealWeekBlock, onDeleteIdealWeekBlock,
  projects, goals, onAddProject
}) => {
  const [view, setView] = useState<CalendarViewMode>('week');
  const [multiDayCount, setMultiDayCount] = useState<number>(3);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [now, setNow] = useState(new Date());

  const timeGridRef = useRef<HTMLDivElement>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [habitModalState, setHabitModalState] = useState<{ isOpen: boolean; habitToEdit: Habit | null; defaults?: Partial<Habit> }>({ isOpen: false, habitToEdit: null });
  const [idealBlockModalState, setIdealBlockModalState] = useState<{ isOpen: boolean; blockToEdit?: IdealWeekBlock | null; defaults?: Partial<IdealWeekBlock> }>({ isOpen: false });
  const [isPushConfirmOpen, setIsPushConfirmOpen] = useState(false);
  const [pushStartDate, setPushStartDate] = useState('');
  const [pushEndDate, setPushEndDate] = useState('');


  // --- Task Drag and Drop State ---
  const [isTaskDragging, setIsTaskDragging] = useState(false);
  const [previewTask, setPreviewTask] = useState<Task | null>(null);
  const taskDragInfoRef = useRef<{
    task: Task;
    type: DragType;
    initialMouseY: number;
    initialMouseX: number;
    hasDragged: boolean;
    latestPreviewTask: Task | null;
  } | null>(null);
  
  // --- Habit Drag and Drop State ---
  const [isHabitDragging, setIsHabitDragging] = useState(false);
  const [previewHabit, setPreviewHabit] = useState<{ habit: Habit; dayIndex: number; dueTime: string; duration: number; } | null>(null);
  const habitDragInfoRef = useRef<{
    originalHabit: Habit;
    originalDayOfWeek: number;
    type: DragType;
    initialMouseY: number;
    initialMouseX: number;
    hasDragged: boolean;
    latestPreviewData: { newDayOfWeek: number; newTime: string; newDuration: number; } | null;
  } | null>(null);

  // --- Ideal Week Block Drag and Drop State ---
  const [isIdealBlockDragging, setIsIdealBlockDragging] = useState(false);
  const [previewIdealBlock, setPreviewIdealBlock] = useState<IdealWeekBlock | null>(null);
  const idealBlockDragInfoRef = useRef<{
    block: IdealWeekBlock;
    type: DragType;
    initialMouseY: number;
    initialMouseX: number;
    hasDragged: boolean;
    latestPreviewBlock: IdealWeekBlock | null;
  } | null>(null);

  // --- Ideal Week Block Creation State ---
  const [isCreatingBlock, setIsCreatingBlock] = useState(false);
  const [creationPreview, setCreationPreview] = useState<Omit<IdealWeekBlock, 'id' | 'type' | 'title' | 'projectId'> | null>(null);
  const creationDragStartRef = useRef<{ x: number, y: number } | null>(null);
  const latestCreationPreviewRef = useRef(creationPreview);

  useEffect(() => {
    latestCreationPreviewRef.current = creationPreview;
  }, [creationPreview]);


  useEffect(() => {
    // If the current view is disabled in settings, switch to a valid one
    if (!visibleViews.includes(view as CalendarViewKey) && view !== 'ideal' && view !== 'multiday') {
      if (visibleViews.includes('week')) {
        setView('week');
      } else if (visibleViews.includes('day')) {
        setView('day');
      } else if (visibleViews.length > 0) {
        setView(visibleViews[0]);
      } else {
        // Fallback if user somehow disables all views
        setView('day');
      }
    }
  }, [visibleViews, view]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 5 * 60 * 1000); // Update every 5 minutes
    return () => clearInterval(timer);
  }, []);

  const DRAG_THRESHOLD = 5;

  const getVisibleDays = useCallback((): Date[] => {
    let dayCount = 0;
    let baseDate = currentDate;

    if (view === 'week' || view === 'ideal') {
      dayCount = 7;
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - newDate.getDay());
      baseDate = newDate;
    } else if (view === 'day') {
      dayCount = 1;
    } else if (view === 'multiday') {
      dayCount = multiDayCount;
    }

    if (dayCount === 0) return [];
    
    return Array.from({ length: dayCount }, (_, i) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [view, currentDate, multiDayCount]);

  // --- Task D&D Handlers ---
  const handleGlobalTaskMouseMove = useCallback((e: MouseEvent) => {
    if (!taskDragInfoRef.current) return;

    if (!taskDragInfoRef.current.hasDragged) {
      const dx = Math.abs(e.clientX - taskDragInfoRef.current.initialMouseX);
      const dy = Math.abs(e.clientY - taskDragInfoRef.current.initialMouseY);
      if (dx <= DRAG_THRESHOLD && dy <= DRAG_THRESHOLD) return;
      
      taskDragInfoRef.current.hasDragged = true;
      setIsTaskDragging(true);
      setPreviewTask(taskDragInfoRef.current.task);
    }
    
    if (!timeGridRef.current) return;
    
    const gridRect = timeGridRef.current.getBoundingClientRect();
    const days = getVisibleDays();
    const minutesPerPixel = (24 * 60) / gridRect.height;
    const minuteDelta = Math.round(((e.clientY - taskDragInfoRef.current.initialMouseY) * minutesPerPixel) / 15) * 15;
    const dayWidth = gridRect.width / days.length;
    const dayDelta = Math.floor((e.clientX - gridRect.left) / dayWidth) - Math.floor((taskDragInfoRef.current.initialMouseX - gridRect.left) / dayWidth);

    const initialTask = taskDragInfoRef.current.task;
    const initialDate = new Date(initialTask.dueDate + 'T00:00:00');
    const newDate = new Date(initialDate);
    newDate.setDate(newDate.getDate() + dayDelta);
    
    const updatedTask = { ...initialTask };
    const [initialHour, initialMinute] = initialTask.dueTime!.split(':').map(Number);
    const initialTotalMinutes = initialHour * 60 + initialMinute;
    const initialDuration = initialTask.duration || 60;

    if (taskDragInfoRef.current.type === 'move') {
      let newTotalMinutes = initialTotalMinutes + minuteDelta;
      newTotalMinutes = Math.max(0, Math.min(24 * 60 - initialDuration, newTotalMinutes));
      const newHour = Math.floor(newTotalMinutes / 60);
      const newMinute = newTotalMinutes % 60;
      updatedTask.dueTime = `${String(newHour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`;
    } else if (taskDragInfoRef.current.type === 'resize-bottom') {
      let newDuration = initialDuration + minuteDelta;
      newDuration = Math.max(15, newDuration);
      if (initialTotalMinutes + newDuration > 24 * 60) newDuration = 24 * 60 - initialTotalMinutes;
      updatedTask.duration = newDuration;
    } else if (taskDragInfoRef.current.type === 'resize-top') {
      let newTotalMinutes = initialTotalMinutes + minuteDelta;
      let newDuration = initialDuration - minuteDelta;
      if (newDuration < 15) {
        newDuration = 15;
        newTotalMinutes = initialTotalMinutes + initialDuration - 15;
      }
      newTotalMinutes = Math.max(0, newTotalMinutes);
      updatedTask.dueTime = `${String(Math.floor(newTotalMinutes / 60)).padStart(2, '0')}:${String(newTotalMinutes % 60).padStart(2, '0')}`;
      updatedTask.duration = newDuration;
    }

    updatedTask.dueDate = toLocalDateString(newDate);
    
    taskDragInfoRef.current.latestPreviewTask = updatedTask;
    setPreviewTask(updatedTask);
  }, [getVisibleDays]);

  const handleGlobalTaskMouseUp = useCallback(() => {
    window.removeEventListener('mousemove', handleGlobalTaskMouseMove);
    window.removeEventListener('mouseup', handleGlobalTaskMouseUp);
    if (taskDragInfoRef.current?.hasDragged && taskDragInfoRef.current?.latestPreviewTask) {
      onUpdateTask(taskDragInfoRef.current.latestPreviewTask);
    }
    taskDragInfoRef.current = null;
    setIsTaskDragging(false);
    setPreviewTask(null);
    document.body.style.cursor = 'auto';
    document.body.style.userSelect = 'auto';
  }, [onUpdateTask, handleGlobalTaskMouseMove]);

  const handleTaskDragStart = useCallback((e: React.MouseEvent, task: Task, type: DragType) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    taskDragInfoRef.current = { task, type, initialMouseY: e.clientY, initialMouseX: e.clientX, hasDragged: false, latestPreviewTask: task };
    window.addEventListener('mousemove', handleGlobalTaskMouseMove);
    window.addEventListener('mouseup', handleGlobalTaskMouseUp);
  }, [handleGlobalTaskMouseMove, handleGlobalTaskMouseUp]);

  // --- Habit D&D Handlers ---
    const handleGlobalHabitMouseMove = useCallback((e: MouseEvent) => {
    if (!habitDragInfoRef.current || !timeGridRef.current) return;

    const days = daysOfWeekForMapping;
    const dragInfo = habitDragInfoRef.current;
    
    if (!dragInfo.hasDragged) {
      const dx = Math.abs(e.clientX - dragInfo.initialMouseX);
      const dy = Math.abs(e.clientY - dragInfo.initialMouseY);
      if (dx <= DRAG_THRESHOLD && dy <= DRAG_THRESHOLD) return;

      dragInfo.hasDragged = true;
      setIsHabitDragging(true);
      const dayIndex = days.findIndex(d => d.getDay() === dragInfo.originalDayOfWeek);
       const getOriginalTime = (habit: Habit, dayOfWeek: number) => 
        (!habit.useSameTimeForAllDays && habit.dailyTimes?.[dayOfWeek]) || habit.dueTime || '09:00';
       const getOriginalDuration = (habit: Habit, dayOfWeek: number) =>
        (!habit.useSameTimeForAllDays && habit.dailyDurations?.[dayOfWeek]) || habit.duration || 60;

      setPreviewHabit({
          habit: dragInfo.originalHabit,
          dayIndex: dayIndex,
          dueTime: getOriginalTime(dragInfo.originalHabit, dragInfo.originalDayOfWeek),
          duration: getOriginalDuration(dragInfo.originalHabit, dragInfo.originalDayOfWeek),
      });
    }

    const { originalHabit, originalDayOfWeek, type, initialMouseY, initialMouseX } = dragInfo;
    const gridRect = timeGridRef.current.getBoundingClientRect();
    const dayWidth = gridRect.width / days.length;
    const minutesPerPixel = (24 * 60) / gridRect.height;
    
    const getOriginalTime = (habit: Habit, dayOfWeek: number) => 
      (!habit.useSameTimeForAllDays && habit.dailyTimes?.[dayOfWeek]) || habit.dueTime || '09:00';

    const getOriginalDuration = (habit: Habit, dayOfWeek: number) =>
      (!habit.useSameTimeForAllDays && habit.dailyDurations?.[dayOfWeek]) || habit.duration || 60;
      
    const initialTime = getOriginalTime(originalHabit, originalDayOfWeek);
    const initialDuration = getOriginalDuration(originalHabit, originalDayOfWeek);
    const [initialHour, initialMinute] = initialTime.split(':').map(Number);
    const initialTotalMinutes = initialHour * 60 + initialMinute;
    const minuteDelta = Math.round(((e.clientY - initialMouseY) * minutesPerPixel) / 15) * 15;

    let newTotalMinutes = initialTotalMinutes;
    let newDuration = initialDuration;
    let newDayOfWeek = originalDayOfWeek;
    let newDayIndex = days.findIndex(d => d.getDay() === originalDayOfWeek);
    
    if (type === 'move') {
      newTotalMinutes = initialTotalMinutes + minuteDelta;
      newTotalMinutes = Math.max(0, Math.min(24 * 60 - initialDuration, newTotalMinutes));

      newDayIndex = Math.floor(Math.max(0, Math.min(gridRect.width - 1, e.clientX - gridRect.left)) / dayWidth);
      newDayOfWeek = days[newDayIndex].getDay();
    } else if (type === 'resize-bottom') {
      newDuration = initialDuration + minuteDelta;
      newDuration = Math.max(15, newDuration);
      if (initialTotalMinutes + newDuration > 24 * 60) newDuration = 24 * 60 - initialTotalMinutes;
    } else if (type === 'resize-top') {
      newTotalMinutes = initialTotalMinutes + minuteDelta;
      newDuration = initialDuration - minuteDelta;
      if (newDuration < 15) {
        newDuration = 15;
        newTotalMinutes = initialTotalMinutes + initialDuration - 15;
      }
      newTotalMinutes = Math.max(0, newTotalMinutes);
    }
    
    const newHour = Math.floor(newTotalMinutes / 60);
    const newMinute = newTotalMinutes % 60;
    const newTime = `${String(newHour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`;

    dragInfo.latestPreviewData = { newDayOfWeek, newTime, newDuration };
    setPreviewHabit({ habit: originalHabit, dayIndex: newDayIndex, dueTime: newTime, duration: newDuration });
  }, []);

  const handleGlobalHabitMouseUp = useCallback(() => {
    window.removeEventListener('mousemove', handleGlobalHabitMouseMove);
    window.removeEventListener('mouseup', handleGlobalHabitMouseUp);
    
    const dragInfo = habitDragInfoRef.current;
    if (dragInfo && dragInfo.hasDragged && dragInfo.latestPreviewData) {
        const { originalHabit, originalDayOfWeek, type } = dragInfo;
        const { newDayOfWeek, newTime, newDuration } = dragInfo.latestPreviewData;

        let updatedHabit: Habit = JSON.parse(JSON.stringify(originalHabit));
        
        // Switch to per-day settings if not already
        if (updatedHabit.useSameTimeForAllDays !== false) {
            updatedHabit.useSameTimeForAllDays = false;
            updatedHabit.dailyTimes = updatedHabit.dailyTimes || {};
            updatedHabit.dailyDurations = updatedHabit.dailyDurations || {};

            const applicableDays = updatedHabit.frequency === 'Daily' 
                ? [0, 1, 2, 3, 4, 5, 6] 
                : updatedHabit.weeklyDays || [];

            for (const day of applicableDays) {
                updatedHabit.dailyTimes[day] = originalHabit.dueTime || '09:00';
                updatedHabit.dailyDurations[day] = originalHabit.duration || 60;
            }
            updatedHabit.dueTime = null;
            updatedHabit.duration = undefined;
        }

        // Apply changes
        if (type === 'move' && originalDayOfWeek !== newDayOfWeek) {
            const oldDuration = updatedHabit.dailyDurations?.[originalDayOfWeek] || originalHabit.duration || 60;

            if (updatedHabit.dailyTimes) delete updatedHabit.dailyTimes[originalDayOfWeek];
            if (updatedHabit.dailyDurations) delete updatedHabit.dailyDurations[originalDayOfWeek];

            updatedHabit.dailyTimes![newDayOfWeek] = newTime;
            updatedHabit.dailyDurations![newDayOfWeek] = oldDuration;

            if (updatedHabit.frequency === 'Weekly') {
                const newWeeklyDays = (updatedHabit.weeklyDays || []).filter(d => d !== originalDayOfWeek);
                if (!newWeeklyDays.includes(newDayOfWeek)) newWeeklyDays.push(newDayOfWeek);
                newWeeklyDays.sort((a, b) => a - b);
                updatedHabit.weeklyDays = newWeeklyDays;
            }
        } else {
            updatedHabit.dailyTimes![newDayOfWeek] = newTime;
            updatedHabit.dailyDurations![newDayOfWeek] = newDuration;
        }
        
        onUpdateHabit(updatedHabit);
    }
    
    habitDragInfoRef.current = null;
    setIsHabitDragging(false);
    setPreviewHabit(null);
    document.body.style.cursor = 'auto';
    document.body.style.userSelect = 'auto';
  }, [onUpdateHabit, handleGlobalHabitMouseMove]);
  
  const handleHabitDragStart = useCallback((e: React.MouseEvent, habit: Habit, dayOfWeek: number, type: DragType) => {
    if (e.button !== 0 || !onUpdateHabit) return;
    if (e.detail > 1) return; // Allow double-click to pass through

    e.preventDefault(); e.stopPropagation();
    habitDragInfoRef.current = { originalHabit: habit, originalDayOfWeek: dayOfWeek, type, initialMouseY: e.clientY, initialMouseX: e.clientX, hasDragged: false, latestPreviewData: null };
    window.addEventListener('mousemove', handleGlobalHabitMouseMove);
    window.addEventListener('mouseup', handleGlobalHabitMouseUp);
  }, [onUpdateHabit, handleGlobalHabitMouseMove, handleGlobalHabitMouseUp]);

  // --- Ideal Week Block D&D Handlers ---
  const handleGlobalIdealBlockMouseMove = useCallback((e: MouseEvent) => {
    if (!idealBlockDragInfoRef.current || !timeGridRef.current) return;

    if (!idealBlockDragInfoRef.current.hasDragged) {
      const dx = Math.abs(e.clientX - idealBlockDragInfoRef.current.initialMouseX);
      const dy = Math.abs(e.clientY - idealBlockDragInfoRef.current.initialMouseY);
      if (dx <= DRAG_THRESHOLD && dy <= DRAG_THRESHOLD) return;
      
      idealBlockDragInfoRef.current.hasDragged = true;
      setIsIdealBlockDragging(true);
      setPreviewIdealBlock(idealBlockDragInfoRef.current.block);
    }
    
    const gridRect = timeGridRef.current.getBoundingClientRect();
    const minutesPerPixel = (24 * 60) / gridRect.height;
    const minuteDelta = Math.round(((e.clientY - idealBlockDragInfoRef.current.initialMouseY) * minutesPerPixel) / 15) * 15;
    const dayWidth = gridRect.width / 7;

    const initialBlock = idealBlockDragInfoRef.current.block;
    
    // Day calculation
    const initialDayIndex = daysOfWeekForMapping.findIndex(d => d.getDay() === initialBlock.dayOfWeek);
    const dayDelta = Math.floor((e.clientX - gridRect.left) / dayWidth) - Math.floor((idealBlockDragInfoRef.current.initialMouseX - gridRect.left) / dayWidth);
    const newDayIndex = Math.max(0, Math.min(6, initialDayIndex + dayDelta));
    const newDayOfWeek = daysOfWeekForMapping[newDayIndex].getDay();
    
    const updatedBlock = { ...initialBlock, dayOfWeek: newDayOfWeek };
    const [initialHour, initialMinute] = initialBlock.startTime.split(':').map(Number);
    const initialTotalMinutes = initialHour * 60 + initialMinute;
    const initialDuration = initialBlock.duration;

    if (idealBlockDragInfoRef.current.type === 'move') {
      let newTotalMinutes = initialTotalMinutes + minuteDelta;
      newTotalMinutes = Math.max(0, Math.min(24 * 60 - initialDuration, newTotalMinutes));
      const newHour = Math.floor(newTotalMinutes / 60);
      const newMinute = newTotalMinutes % 60;
      updatedBlock.startTime = `${String(newHour).padStart(2, '0')}:${String(newMinute).padStart(2, '0')}`;
    } else if (idealBlockDragInfoRef.current.type === 'resize-bottom') {
      let newDuration = initialDuration + minuteDelta;
      newDuration = Math.max(15, newDuration);
      if (initialTotalMinutes + newDuration > 24 * 60) newDuration = 24 * 60 - initialTotalMinutes;
      updatedBlock.duration = newDuration;
    } else if (idealBlockDragInfoRef.current.type === 'resize-top') {
      let newTotalMinutes = initialTotalMinutes + minuteDelta;
      let newDuration = initialDuration - minuteDelta;
      if (newDuration < 15) {
        newDuration = 15;
        newTotalMinutes = initialTotalMinutes + initialDuration - 15;
      }
      newTotalMinutes = Math.max(0, newTotalMinutes);
      updatedBlock.startTime = `${String(Math.floor(newTotalMinutes / 60)).padStart(2, '0')}:${String(newTotalMinutes % 60).padStart(2, '0')}`;
      updatedBlock.duration = newDuration;
    }
    
    idealBlockDragInfoRef.current.latestPreviewBlock = updatedBlock;
    setPreviewIdealBlock(updatedBlock);
  }, []);

  const handleGlobalIdealBlockMouseUp = useCallback(() => {
    window.removeEventListener('mousemove', handleGlobalIdealBlockMouseMove);
    window.removeEventListener('mouseup', handleGlobalIdealBlockMouseUp);
    if (idealBlockDragInfoRef.current?.hasDragged && idealBlockDragInfoRef.current?.latestPreviewBlock) {
      onUpdateIdealWeekBlock(idealBlockDragInfoRef.current.latestPreviewBlock);
    }
    idealBlockDragInfoRef.current = null;
    setIsIdealBlockDragging(false);
    setPreviewIdealBlock(null);
    document.body.style.cursor = 'auto';
    document.body.style.userSelect = 'auto';
  }, [onUpdateIdealWeekBlock, handleGlobalIdealBlockMouseMove]);

  const handleIdealBlockDragStart = useCallback((e: React.MouseEvent, block: IdealWeekBlock, type: DragType) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    idealBlockDragInfoRef.current = { block, type, initialMouseY: e.clientY, initialMouseX: e.clientX, hasDragged: false, latestPreviewBlock: block };
    window.addEventListener('mousemove', handleGlobalIdealBlockMouseMove);
    window.addEventListener('mouseup', handleGlobalIdealBlockMouseUp);
  }, [handleGlobalIdealBlockMouseMove, handleGlobalIdealBlockMouseUp]);
  
  // --- Ideal Week Block Creation Handlers (FIXED) ---
  const handleTimeGridMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || isHabitDragging || isTaskDragging || isIdealBlockDragging) return;
    if ((e.target as HTMLElement).closest('[data-calendar-item="true"]')) return;

    setIsCreatingBlock(true);
    creationDragStartRef.current = { x: e.clientX, y: e.clientY };
  };

  // FIX: Renamed function to avoid redeclaration error. This handles mouse move for creating a new block.
  const handleGlobalBlockCreationMouseMove = useCallback((e: MouseEvent) => {
    if (!creationDragStartRef.current || !timeGridRef.current) return;
    
    const gridRect = timeGridRef.current.getBoundingClientRect();
    const startY = creationDragStartRef.current.y;
    const currentY = e.clientY;
    const startX = creationDragStartRef.current.x;
    const currentX = e.clientX;

    const top = Math.min(startY, currentY);
    const bottom = Math.max(startY, currentY);
    const left = Math.min(startX, currentX);

    const dayWidth = gridRect.width / 7;
    const dayIndex = Math.floor(Math.max(0, left - gridRect.left) / dayWidth);
    
    const correctDayOfWeek = daysOfWeekForMapping[dayIndex].getDay();

    const minutesPerPixel = (24 * 60) / gridRect.height;
    const startMinutes = Math.floor(((top - gridRect.top) * minutesPerPixel) / 15) * 15;
    const endMinutes = Math.ceil(((bottom - gridRect.top) * minutesPerPixel) / 15) * 15;

    const duration = Math.max(15, endMinutes - startMinutes);
    const startTime = `${String(Math.floor(startMinutes / 60)).padStart(2, '0')}:${String(startMinutes % 60).padStart(2, '0')}`;
    
    setCreationPreview({ dayOfWeek: correctDayOfWeek, startTime, duration });
  }, []);
  
  // FIX: Renamed function to avoid redeclaration error. This handles mouse up for creating a new block.
  const handleGlobalBlockCreationMouseUp = useCallback(() => {
    const finalPreview = latestCreationPreviewRef.current;
    if (finalPreview && finalPreview.duration > 0) {
      setIdealBlockModalState({ isOpen: true, defaults: finalPreview });
    }
    
    setIsCreatingBlock(false);
    setCreationPreview(null);
    creationDragStartRef.current = null;
  }, []);

  useEffect(() => {
    if (isCreatingBlock) {
      // FIX: Use renamed handlers for block creation to avoid ambiguity and errors.
      window.addEventListener('mousemove', handleGlobalBlockCreationMouseMove);
      window.addEventListener('mouseup', handleGlobalBlockCreationMouseUp);
    }
    return () => {
      // FIX: Use renamed handlers for block creation to avoid ambiguity and errors.
      window.removeEventListener('mousemove', handleGlobalBlockCreationMouseMove);
      window.removeEventListener('mouseup', handleGlobalBlockCreationMouseUp);
    };
  }, [isCreatingBlock, handleGlobalBlockCreationMouseMove, handleGlobalBlockCreationMouseUp]);


  useEffect(() => {
    let cursor = 'auto';
    let userSelect = 'auto';

    if (isTaskDragging) {
      cursor = taskDragInfoRef.current?.type.includes('resize') ? 'ns-resize' : 'move';
      userSelect = 'none';
    } else if (isHabitDragging) {
      cursor = habitDragInfoRef.current?.type.includes('resize') ? 'ns-resize' : 'move';
      userSelect = 'none';
    } else if (isIdealBlockDragging) {
      cursor = idealBlockDragInfoRef.current?.type.includes('resize') ? 'ns-resize' : 'move';
      userSelect = 'none';
    }

    document.body.style.cursor = cursor;
    document.body.style.userSelect = userSelect;
  }, [isTaskDragging, isHabitDragging, isIdealBlockDragging]);

  const handleSaveTask = (taskData: Task | Omit<Task, 'id'>) => {
    if ('id' in taskData) onUpdateTask(taskData as Task);
    else onAddTask(taskData);
    setTaskToEdit(null);
  };

  const handleSaveHabit = (habitData: Omit<Habit, 'id' | 'order' | 'completedDates'> | Omit<Habit, 'completedDates' | 'order'>) => {
    if ('id' in habitData) onUpdateHabit(habitData);
    else onAddHabit(habitData);
    setHabitModalState({ isOpen: false, habitToEdit: null });
  };
  
  const handleSaveIdealBlock = (blockData: Omit<IdealWeekBlock, 'id'> | IdealWeekBlock) => {
    if ('id' in blockData) onUpdateIdealWeekBlock(blockData);
    else onAddIdealWeekBlock(blockData);
    setIdealBlockModalState({ isOpen: false });
  };
  
  const handleConvertToHabit = (blockDefaults: Partial<IdealWeekBlock>) => {
    setIdealBlockModalState({ isOpen: false });
    
    const habitDefaults: Partial<Habit> = {
      frequency: 'Weekly',
      weeklyDays: blockDefaults.dayOfWeek !== undefined ? [blockDefaults.dayOfWeek] : [],
      // isTimeScheduled will be true in HabitModal because dailyTimes is set
      useSameTimeForAllDays: false,
      dailyTimes: blockDefaults.dayOfWeek !== undefined && blockDefaults.startTime 
        ? { [blockDefaults.dayOfWeek]: blockDefaults.startTime } 
        : {},
      dailyDurations: blockDefaults.dayOfWeek !== undefined && blockDefaults.duration 
        ? { [blockDefaults.dayOfWeek]: blockDefaults.duration } 
        : {},
    };
    
    setHabitModalState({ isOpen: true, habitToEdit: null, defaults: habitDefaults });
  };

  const handleOpenPushConfirm = () => {
    const now = new Date(currentDate);
    // Start of the current week (Sunday)
    const firstDayOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    // End of the current week (Saturday)
    const lastDayOfWeek = new Date(firstDayOfWeek);
    lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6);

    setPushStartDate(toLocalDateString(firstDayOfWeek));
    setPushEndDate(toLocalDateString(lastDayOfWeek));
    setIsPushConfirmOpen(true);
  };

  const handleConfirmPush = () => {
    if (!pushStartDate || !pushEndDate) return;

    const allUnscheduledTasks = tasks.filter(t => t.status === TaskStatus.ToDo && !t.dueDate);

    // Create mutable copies for processing
    const availableGeneralTasks = [
      ...allUnscheduledTasks.filter(t => t.priority === TaskPriority.Anytime).sort((a, b) => a.title.localeCompare(b.title)),
      ...allUnscheduledTasks.filter(t => t.priority === TaskPriority.Someday).sort((a, b) => a.title.localeCompare(b.title)),
    ];

    const availableProjectTasks: { [key: string]: Task[] } = allUnscheduledTasks
      .filter(t => t.projectId)
      .reduce((acc, task) => {
        if (!acc[task.projectId!]) acc[task.projectId!] = [];
        acc[task.projectId!].push(task);
        return acc;
      }, {} as { [key: string]: Task[] });

    for (const projId in availableProjectTasks) {
      availableProjectTasks[projId].sort((a, b) => a.title.localeCompare(b.title));
    }

    const tasksToUpdate: Task[] = [];
    const startDate = new Date(pushStartDate + 'T12:00:00');
    const endDate = new Date(pushEndDate + 'T12:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      if (d < today) continue;

      const dayOfWeek = d.getDay();
      const dateString = toLocalDateString(d);
      const isToday = d.getTime() === today.getTime();

      const blocksForDay = idealWeekBlocks
        .filter(block => block.dayOfWeek === dayOfWeek)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));

      for (const block of blocksForDay) {
        let timeWithinBlock = 0;

        const getTaskDueTime = (startTime: string, offsetMinutes: number) => {
          const [startH, startM] = startTime.split(':').map(Number);
          const totalStartMinutes = startH * 60 + startM;
          const taskStartMinutes = totalStartMinutes + offsetMinutes;
          const taskH = Math.floor(taskStartMinutes / 60);
          const taskM = taskStartMinutes % 60;
          return `${String(taskH).padStart(2, '0')}:${String(taskM).padStart(2, '0')}`;
        };

        const taskPool = block.type === 'project' && block.projectId ? availableProjectTasks[block.projectId] || [] : availableGeneralTasks;
        
        for (let i = 0; i < taskPool.length; i++) {
          const task = taskPool[i];
          if (timeWithinBlock + task.duration <= block.duration) {
            tasksToUpdate.push({
              ...task,
              dueDate: dateString,
              dueTime: getTaskDueTime(block.startTime, timeWithinBlock),
              priority: isToday ? TaskPriority.Today : task.priority,
            });
            timeWithinBlock += task.duration;
            taskPool.splice(i, 1);
            i--;
          }
        }
      }
    }

    if (tasksToUpdate.length > 0) {
      tasksToUpdate.forEach(task => onUpdateTask(task));
    }

    setIsPushConfirmOpen(false);
    alert(`${tasksToUpdate.length} tasks have been scheduled from your Ideal Week! Habits will now also be visible on the calendar.`);
  };

  const formatTime = useCallback((timeString: string) => {
    if (!timeString) return '';
    const [h, m] = timeString.split(':');
    return new Date(1970, 0, 1, parseInt(h), parseInt(m)).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: timeFormat === '12h' });
  }, [timeFormat]);


  const PreviewTask = ({ task }: { task: Task }) => {
    if (!task.dueTime) return null;
    const [hour, minute] = task.dueTime.split(':').map(Number);
    const top = ((hour * 60 + minute) / (24 * 60)) * 100;
    const duration = task.duration || 60;
    const height = (duration / (24 * 60)) * 100;

    return (
      <div className={`absolute w-[95%] left-[2.5%] p-1 rounded text-xs text-white border-2 flex flex-col justify-between overflow-hidden pointer-events-none opacity-60 ${priorityClasses[task.priority]}`} style={{ top: `${top}%`, height: `${height}%`, minHeight: '20px' }} title={`${task.title} (preview)`}>
        <div>
          <p className="font-bold truncate">{task.title}</p>
          <p className="opacity-80">{formatTime(task.dueTime)}</p>
        </div>
      </div>
    );
  };
  
  const PreviewHabit = ({ preview }: { preview: typeof previewHabit }) => {
    if (!preview) return null;
    const { habit, dayIndex, dueTime, duration } = preview;
    const [hour, minute] = dueTime.split(':').map(Number);
    const top = ((hour * 60 + minute) / (24 * 60)) * 100;
    const height = (duration / (24 * 60)) * 100;
    const dayCount = 7;

    return (
      <div className="absolute top-0 h-full pointer-events-none z-40" style={{ left: `${(dayIndex / dayCount) * 100}%`, width: `${(1 / dayCount) * 100}%` }}>
        <div className="absolute w-[95%] left-[2.5%] p-1 rounded text-xs text-white border-2 flex flex-col justify-between overflow-hidden opacity-60" style={{ top: `${top}%`, height: `${height}%`, minHeight: '20px', backgroundColor: habit.color, borderColor: 'rgba(255, 255, 255, 0.5)' }} title={`${habit.name} (preview)`}>
          <div>
            <p className="font-bold truncate">{habit.name}</p>
            <p className="opacity-80">{formatTime(dueTime)}</p>
          </div>
        </div>
      </div>
    );
  };

  const CreationPreviewBlock = ({ block }: { block: NonNullable<typeof creationPreview> }) => {
      const top = ((parseInt(block.startTime.split(':')[0]) * 60 + parseInt(block.startTime.split(':')[1])) / (24 * 60)) * 100;
      const height = (block.duration / (24 * 60)) * 100;
      const visualDayIndex = daysOfWeekForMapping.findIndex(d => d.getDay() === block.dayOfWeek);

      return (
          <div className="absolute top-0 h-full pointer-events-none z-40" style={{ left: `${(visualDayIndex / 7) * 100}%`, width: `${(1 / 7) * 100}%` }}>
              <div className="absolute w-[95%] left-[2.5%] p-1 rounded bg-indigo-500/50 border-2 border-dashed border-indigo-300" style={{ top: `${top}%`, height: `${height}%` }}></div>
          </div>
      );
  };

  const PreviewIdealBlock = ({ block }: { block: IdealWeekBlock }) => {
    const [hour, minute] = block.startTime.split(':').map(Number);
    const top = ((hour * 60 + minute) / (24 * 60)) * 100;
    const height = (block.duration / (24 * 60)) * 100;
    const dayCount = 7;
    const visualDayIndex = daysOfWeekForMapping.findIndex(d => d.getDay() === block.dayOfWeek);
    
    const getBlockStyle = (type: IdealWeekBlockType) => {
        const baseColor = type === 'project' ? 'bg-blue-500/80' : 'bg-yellow-500/80';
        const stripes = `bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(255,255,255,0.1)_5px,rgba(255,255,255,0.1)_10px)]`;
        return `${baseColor} ${stripes}`;
    };

    return (
      <div className="absolute top-0 h-full pointer-events-none z-50" style={{ left: `${(visualDayIndex / dayCount) * 100}%`, width: `${(1 / dayCount) * 100}%` }}>
        <div className={`absolute w-[95%] left-[2.5%] p-1 rounded text-xs text-white border-2 flex flex-col justify-between overflow-hidden opacity-60 border-dashed ${getBlockStyle(block.type)} border-white/50`} style={{ top: `${top}%`, height: `${height}%`, minHeight: '20px' }} title={`${block.title} (preview)`}>
          <div>
            <p className="font-bold truncate">{block.title}</p>
            <p className="opacity-80">{formatTime(block.startTime)}</p>
          </div>
        </div>
      </div>
    );
  };


  const tasksByDate = useMemo(() => {
    const grouped = new Map<string, Task[]>();
    tasks.forEach(task => { if (task.dueDate) { if (!grouped.has(task.dueDate)) grouped.set(task.dueDate, []); grouped.get(task.dueDate)!.push(task); } });
    return grouped;
  }, [tasks]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTaskDragging || isHabitDragging || taskToEdit || habitModalState.isOpen) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      
      const key = e.key.toLowerCase();
      if (['d', 'w', 'm', 'q', 'y', 'i'].includes(key)) {
        const targetView = {d: 'day', w: 'week', m: 'month', q: 'quarter', y: 'year', i: 'ideal'}[key] as CalendarViewMode;
        if (visibleViews.includes(targetView as CalendarViewKey) || targetView === 'ideal') {
          e.preventDefault();
          setView(targetView);
        }
      } else if (!isNaN(parseInt(key)) && parseInt(key) > 0 && parseInt(key) <= 9) {
        e.preventDefault();
        setMultiDayCount(parseInt(key));
        setView('multiday');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTaskDragging, isHabitDragging, taskToEdit, habitModalState.isOpen, visibleViews]);

  const handlePrev = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      switch (view) {
        case 'year': newDate.setFullYear(newDate.getFullYear() - 1); break;
        case 'quarter': newDate.setMonth(newDate.getMonth() - 3); break;
        case 'month': newDate.setMonth(newDate.getMonth() - 1); break;
        case 'week': newDate.setDate(newDate.getDate() - 7); break;
        case 'day': newDate.setDate(newDate.getDate() - 1); break;
        case 'multiday': newDate.setDate(newDate.getDate() - multiDayCount); break;
      }
      return newDate;
    });
  };

  const handleNext = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      switch (view) {
        case 'year': newDate.setFullYear(newDate.getFullYear() + 1); break;
        case 'quarter': newDate.setMonth(newDate.getMonth() + 3); break;
        case 'month': newDate.setMonth(newDate.getMonth() + 1); break;
        case 'week': newDate.setDate(newDate.getDate() + 7); break;
        case 'day': newDate.setDate(newDate.getDate() + 1); break;
        case 'multiday': newDate.setDate(newDate.getDate() + multiDayCount); break;
      }
      return newDate;
    });
  };
  
  const handleToday = () => setCurrentDate(new Date());
  const handleDayClick = (date: Date) => { setCurrentDate(date); setView('day'); };
  const getQuarter = (date: Date) => `Q${Math.floor(date.getMonth() / 3) + 1}`;

  const renderHeader = () => {
    let title = '';
    if (view === 'year') title = currentDate.getFullYear().toString();
    else if (view === 'quarter') title = `${getQuarter(currentDate)} ${currentDate.getFullYear()}`;
    else if (view === 'month') title = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    else if (view === 'week') {
      const start = new Date(currentDate); start.setDate(start.getDate() - start.getDay()); const end = new Date(start); end.setDate(end.getDate() + 6);
      title = `${start.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} - ${end.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}`;
    } else if (view === 'day') title = currentDate.toLocaleDateString('default', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    else if (view === 'multiday') {
        const start = new Date(currentDate); const end = new Date(start); end.setDate(end.getDate() + multiDayCount - 1);
        title = `${start.toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} - ${end.toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}`;
    } else if (view === 'ideal') title = 'Ideal Week';

    const allViewOptions: { key: CalendarViewMode, label: string }[] = [{ key: 'year', label: 'Year' }, { key: 'quarter', label: 'Quarter' }, { key: 'month', label: 'Month' }, { key: 'week', label: 'Week' }, { key: 'day', label: 'Day' }];
    const finalViewOptions = allViewOptions.filter(opt => visibleViews.includes(opt.key as CalendarViewKey));
    finalViewOptions.push({ key: 'ideal', label: 'Ideal Week' });

    return (
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <button onClick={handlePrev} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50" disabled={view === 'ideal'}><ChevronLeftIcon className="h-5 w-5" /></button>
          <button onClick={handleToday} className="px-4 py-2 text-sm font-semibold rounded-md border border-gray-300 dark:border-slate-600 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50" disabled={view === 'ideal'}>Today</button>
          <button onClick={handleNext} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50" disabled={view === 'ideal'}><ChevronRightIcon className="h-5 w-5" /></button>
        </div>
        <h2 className="text-xl font-bold text-center flex-1">{title}</h2>
        <div className="bg-gray-100 dark:bg-slate-800 p-1 rounded-lg flex space-x-1">
            {finalViewOptions.map(v => {
                const isActive = view === v.key;
                let activeClasses = 'bg-indigo-600 text-white';
                if (isActive && v.key === 'ideal') activeClasses = 'bg-sky-500 text-white';
                const inactiveClasses = 'text-slate-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700';
                return (
                    <button key={v.key} onClick={() => setView(v.key)} className={`px-3 py-1 text-sm font-medium rounded-md capitalize ${isActive ? activeClasses : inactiveClasses}`}>
                        {v.key === 'quarter' ? (
                            <><span className="sm:hidden">QTR</span><span className="hidden sm:inline">{v.label}</span></>
                        ) : (
                            v.label
                        )}
                    </button>
                )
            })}
        </div>
      </div>
    );
  };
  
  interface MiniMonthProps { date: Date; onDayClick: (date: Date) => void; }
  const MiniMonth: React.FC<MiniMonthProps> = ({ date, onDayClick }) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1); const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate(); const startDayOfWeek = firstDay.getDay();
    const days = Array.from({ length: startDayOfWeek }).map(() => null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    return (
        <div className="bg-gray-100/50 dark:bg-slate-800/50 p-2 rounded-lg">
            <h3 className="font-bold text-center text-indigo-600 dark:text-indigo-400 text-sm">{date.toLocaleString('default', { month: 'long' })}</h3>
            <div className="grid grid-cols-7 gap-1 text-center text-xs mt-2">
                {dayNames.map(d => <div key={d} className="font-semibold text-slate-500 dark:text-slate-400">{d}</div>)}
                {days.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`}></div>;
                    const dayDate = new Date(date.getFullYear(), date.getMonth(), day);
                    const dateString = toLocalDateString(dayDate);
                    const hasTasks = tasksByDate.has(dateString); const isToday = new Date().toDateString() === dayDate.toDateString();
                    return (<div key={day} className={`w-6 h-6 flex items-center justify-center rounded-full cursor-pointer transition-colors hover:bg-indigo-500/50 ${isToday ? 'bg-indigo-600 text-white' : ''} ${hasTasks && !isToday ? 'bg-indigo-200 dark:bg-indigo-500/30' : ''}`} onClick={() => onDayClick(dayDate)}>{day}</div>);
                })}
            </div>
        </div>
    );
  };

  const renderYearView = () => (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{Array.from({ length: 12 }).map((_, i) => (<MiniMonth key={i} date={new Date(currentDate.getFullYear(), i, 1)} onDayClick={handleDayClick} />))}</div>);
  const renderSingleMonthGrid = (date: Date, onDayClick: (d: Date) => void) => {
    const today = new Date(); const firstDay = new Date(date.getFullYear(), date.getMonth(), 1); const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate(); const startDayOfWeek = firstDay.getDay();
    const days: { date: Date, isCurrentMonth: boolean }[] = Array.from({ length: startDayOfWeek }, (_, i) => ({ date: new Date(firstDay.setDate(firstDay.getDate() - startDayOfWeek + i)), isCurrentMonth: false }));
    firstDay.setDate(1); firstDay.setMonth(date.getMonth());
    for (let i = 1; i <= daysInMonth; i++) days.push({ date: new Date(date.getFullYear(), date.getMonth(), i), isCurrentMonth: true });
    const totalDays = days.length > 35 ? 42 : 35;
    while(days.length < totalDays) { lastDay.setDate(lastDay.getDate() + 1); days.push({ date: new Date(lastDay), isCurrentMonth: false }); }
    return days.map(({ date: dayDate, isCurrentMonth }, idx) => {
        const dateString = toLocalDateString(dayDate);
        const dayTasks = tasksByDate.get(dateString) || []; const isToday = today.toDateString() === dayDate.toDateString();
        return (
            <div key={idx} className={`p-2 min-h-[8rem] flex flex-col ${isCurrentMonth ? 'bg-white dark:bg-slate-800/50' : 'bg-gray-100/50 dark:bg-slate-800/20 text-slate-500'} overflow-hidden`}>
                <span className={`font-semibold text-sm self-start transition-colors cursor-pointer hover:text-indigo-500 dark:hover:text-indigo-400 ${isToday ? 'bg-indigo-600 text-white rounded-full h-6 w-6 flex items-center justify-center' : ''}`} onClick={() => onDayClick(dayDate)}>{dayDate.getDate()}</span>
                <div className="mt-1 space-y-1 overflow-y-auto text-slate-900 dark:text-white">{dayTasks.map(task => (<div key={task.id} title={task.title} className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer ${priorityClasses[task.priority]}`} onDoubleClick={() => setTaskToEdit(task)}>{task.title}</div>))}</div>
            </div>
        );
    });
  };
  
  const renderQuarterView = () => {
    const quarterStartMonth = Math.floor(currentDate.getMonth() / 3) * 3;
    const months = [new Date(currentDate.getFullYear(), quarterStartMonth, 1), new Date(currentDate.getFullYear(), quarterStartMonth + 1, 1), new Date(currentDate.getFullYear(), quarterStartMonth + 2, 1)];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (<div className="grid grid-cols-1 md:grid-cols-3 gap-4">{months.map(monthDate => (<div key={monthDate.getMonth()}><h3 className="font-bold text-center text-lg text-indigo-700 dark:text-indigo-300 mb-2">{monthDate.toLocaleString('default', { month: 'long' })}</h3><div className="grid grid-cols-7 gap-px bg-gray-300 dark:bg-slate-700 border border-gray-300 dark:border-slate-700">{dayNames.map(d => <div key={d} className="text-center font-semibold text-xs py-2 bg-gray-100 dark:bg-slate-800">{d}</div>)}{renderSingleMonthGrid(monthDate, handleDayClick)}</div></div>))}</div>);
  };
  
  const renderMonthView = () => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (<div className="grid grid-cols-7 gap-px bg-gray-300 dark:bg-slate-700 border border-gray-300 dark:border-slate-700">{dayNames.map(d => <div key={d} className="text-center font-semibold text-xs py-2 bg-gray-100 dark:bg-slate-800">{d}</div>)}{renderSingleMonthGrid(currentDate, handleDayClick)}</div>)
  };

  interface TimedTaskProps { task: Task; }
  const TimedTask: React.FC<TimedTaskProps> = ({ task }) => {
    if (!task.dueTime) return null;
    const [hour, minute] = task.dueTime.split(':').map(Number);
    const top = ((hour * 60 + minute) / (24 * 60)) * 100; const duration = task.duration || 60; const height = (duration / (24 * 60)) * 100;
    const isOriginalTaskBeingDragged = isTaskDragging && taskDragInfoRef.current?.task.id === task.id;
    return (
      <div data-calendar-item="true" onMouseDown={(e) => handleTaskDragStart(e, task, 'move')} onDoubleClick={() => setTaskToEdit(task)} className={`absolute w-[95%] left-[2.5%] p-1 rounded text-xs text-white border-l-4 flex flex-col justify-between overflow-hidden cursor-move transition-opacity ${priorityClasses[task.priority]} ${isOriginalTaskBeingDragged ? 'opacity-40' : ''}`} style={{ top: `${top}%`, height: `${height}%`, minHeight: '20px' }} title={task.title}>
        <div onMouseDown={(e) => { e.stopPropagation(); handleTaskDragStart(e, task, 'resize-top'); }} className="absolute top-0 left-0 w-full h-2 cursor-ns-resize" />
        <div><p className="font-bold truncate">{task.title}</p><p className="opacity-80">{formatTime(task.dueTime)}</p></div>
        <div onMouseDown={(e) => { e.stopPropagation(); handleTaskDragStart(e, task, 'resize-bottom'); }} className="absolute bottom-0 left-0 w-full h-2 cursor-ns-resize" />
      </div>
    );
  };

  const TimedHabit: React.FC<{ habit: Habit; date: Date; dueTime: string; duration: number; }> = ({ habit, date, dueTime, duration }) => {
    const [hour, minute] = dueTime.split(':').map(Number);
    const top = ((hour * 60 + minute) / (24 * 60)) * 100;
    const height = (duration / (24 * 60)) * 100;
    const dateString = toLocalDateString(date);
    const isCompleted = habit.completedDates.includes(dateString);

    return (
      <div 
        data-calendar-item="true"
        onDoubleClick={() => setHabitModalState({ isOpen: true, habitToEdit: habit })}
        className="absolute w-[95%] left-[2.5%] p-1 rounded text-xs text-white flex flex-col justify-between overflow-hidden" 
        style={{ top: `${top}%`, height: `${height}%`, minHeight: '20px', backgroundColor: habit.color }} 
        title={habit.name}
      >
        <div className="flex items-start gap-1">
          <input
            type="checkbox"
            checked={isCompleted}
            onChange={() => onToggleHabitDate(habit.id, dateString)}
            className="peer appearance-none h-4 w-4 rounded-sm cursor-pointer border-2 bg-white/30 border-white/50 checked:bg-white/90 checked:border-transparent focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-white/50"
            aria-label={`Mark habit ${habit.name} as done`}
          />
           <svg className="absolute w-3 h-3 top-1.5 left-1.5 pointer-events-none hidden peer-checked:block" style={{ color: habit.color }} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
          <p className="font-bold truncate flex-1">{habit.name}</p>
        </div>
        <p className="opacity-80 text-right">{formatTime(dueTime)}</p>
      </div>
    );
  };
  
  const TimeIndicator: React.FC<{ now: Date }> = ({ now }) => {
    const topPercent = ((now.getHours() * 60 + now.getMinutes()) / (24 * 60)) * 100;
    return (<div className="absolute w-full pointer-events-none z-30" style={{ top: `${topPercent}%` }}><div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-red-500" style={{ marginLeft: '-5px' }}></div><div className="h-0.5 flex-1 bg-red-500"></div></div></div>);
  };
  
  const getHabitsForDay = useCallback((date: Date, allHabits: Habit[]): { habit: Habit; dueTime: string; duration: number }[] => {
      const dayOfWeek = date.getDay();
      const timedHabitsForDay = [];

      for (const habit of allHabits) {
          if (!isDateTrackable(date, habit)) continue;

          const isTimed = habit.dueTime || (habit.dailyTimes && Object.keys(habit.dailyTimes).length > 0);
          if (!isTimed) continue;

          const dueTime = (habit.useSameTimeForAllDays === false && habit.dailyTimes?.[dayOfWeek]) 
              ? habit.dailyTimes[dayOfWeek] 
              : habit.dueTime;

          if (dueTime) {
              const duration = (habit.useSameTimeForAllDays === false && habit.dailyDurations?.[dayOfWeek])
                  ? habit.dailyDurations[dayOfWeek]
                  : (habit.duration || 60);
              
              timedHabitsForDay.push({ habit, dueTime, duration });
          }
      }
      return timedHabitsForDay;
  }, []);

  const renderTimeGrid = (days: Date[]) => {
    const hours = Array.from({ length: 24 }, (_, i) => i); const today = new Date();
    const formatHour = (hour: number) => {
      if (hour === 0) return timeFormat === '12h' ? '12 AM' : '00:00';
      if (timeFormat === '12h') { const h = hour % 12 === 0 ? 12 : hour % 12; const ampm = hour < 12 ? ' AM' : ' PM'; return h + (h === 12 ? ampm : ''); } return `${String(hour).padStart(2, '0')}:00`;
    };
    const previewTaskColumn = previewTask ? days.findIndex(d => toLocalDateString(d) === previewTask.dueDate) : -1;
    return (
      <div className="flex border-b border-l border-r border-gray-300 dark:border-slate-700 bg-gray-300 dark:bg-slate-700">
        <div className="w-16 flex-shrink-0 bg-gray-100 dark:bg-slate-800 text-center">
          {hours.map(h => <div key={h} className="h-12 border-t border-gray-300 dark:border-slate-700 text-xs pt-1 text-slate-500 dark:text-slate-400">{formatHour(h)}</div>)}
        </div>
        <div ref={timeGridRef} className="flex-1 grid relative" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`}}>
          {days.map((day, dayIndex) => {
            const dateString = toLocalDateString(day);
            const dayTasks = tasksByDate.get(dateString) || []; const timedTasks = dayTasks.filter(t => t.dueTime); const isToday = today.toDateString() === day.toDateString();
            const dayHabits = getHabitsForDay(day, habits);
            return (<div key={dayIndex} className="relative bg-white/50 dark:bg-slate-800/50" style={{gridColumn: dayIndex + 1}}>{hours.map(h => <div key={h} className="h-12 border-t border-l border-gray-300 dark:border-slate-700"></div>)}{timedTasks.map(task => (<TimedTask key={task.id} task={task} />))}{dayHabits.map(({habit, dueTime, duration}) => <TimedHabit key={habit.id} habit={habit} date={day} dueTime={dueTime} duration={duration}/>)}{isToday && <TimeIndicator now={now} />}</div>)
          })}
          {isTaskDragging && previewTask && previewTaskColumn >= 0 && (<div className="absolute top-0 h-full pointer-events-none z-40" style={{ left: `${(previewTaskColumn / days.length) * 100}%`, width: `${(1 / days.length) * 100}%`}}><PreviewTask task={previewTask} /></div>)}
          {isHabitDragging && <PreviewHabit preview={previewHabit} />}
        </div>
      </div>
    )
  };

  const renderTimeGridWithHeaders = (days: Date[]) => {
    const today = new Date();
    return (
      <div>
        <div className="flex border-t border-x border-gray-300 dark:border-slate-700">
          <div className="w-16 flex-shrink-0 bg-gray-100 dark:bg-slate-800 border-r border-gray-300 dark:border-slate-700"></div>
          <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`}}>{days.map((d, index) => { const isToday = today.toDateString() === d.toDateString(); return (<div key={d.toISOString()} className={`text-center py-2 bg-gray-100 dark:bg-slate-800 ${index > 0 ? 'border-l border-gray-300 dark:border-slate-700' : ''}`}><div className="text-xs text-slate-600 dark:text-slate-400 font-medium">{d.toLocaleDateString('default', { weekday: 'short' })}</div><div className={`mt-1 font-bold text-lg inline-flex items-center justify-center h-7 w-7 rounded-full ${isToday ? 'bg-indigo-600 text-white' : ''}`}>{d.getDate()}</div></div>); })}</div>
        </div>
        {renderTimeGrid(days)}
      </div>
    );
  };

  const renderDynamicDayView = () => renderTimeGridWithHeaders(getVisibleDays());

  interface TimedIdealBlockProps { block: IdealWeekBlock; }
  const TimedIdealBlock: React.FC<TimedIdealBlockProps> = ({ block }) => {
      const [hour, minute] = block.startTime.split(':').map(Number);
      const top = ((hour * 60 + minute) / (24 * 60)) * 100;
      const height = (block.duration / (24 * 60)) * 100;
      const isOriginalBlockBeingDragged = isIdealBlockDragging && idealBlockDragInfoRef.current?.block.id === block.id;

      const getBlockStyle = (type: IdealWeekBlockType) => {
          const baseColor = type === 'project' ? 'bg-blue-500/80' : 'bg-yellow-500/80';
          const stripes = `bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(255,255,255,0.1)_5px,rgba(255,255,255,0.1)_10px)]`;
          return `${baseColor} ${stripes}`;
      };

      return (
          <div
              data-calendar-item="true"
              onMouseDown={(e) => handleIdealBlockDragStart(e, block, 'move')}
              onDoubleClick={() => setIdealBlockModalState({ isOpen: true, blockToEdit: block })}
              className={`absolute w-[95%] left-[2.5%] p-1 rounded text-xs text-white flex flex-col justify-between overflow-hidden cursor-move transition-opacity ${getBlockStyle(block.type)} ${isOriginalBlockBeingDragged ? 'opacity-40' : ''}`}
              style={{ top: `${top}%`, height: `${height}%`, minHeight: '20px' }}
          >
              <div onMouseDown={(e) => { e.stopPropagation(); handleIdealBlockDragStart(e, block, 'resize-top'); }} className="absolute top-0 left-0 w-full h-2 cursor-ns-resize" />
              <div>
                  <p className="font-bold truncate">{block.title}</p>
                  <p className="opacity-80">{formatTime(block.startTime)}</p>
              </div>
              <div onMouseDown={(e) => { e.stopPropagation(); handleIdealBlockDragStart(e, block, 'resize-bottom'); }} className="absolute bottom-0 left-0 w-full h-2 cursor-ns-resize" />
          </div>
      );
  };

  const renderIdealWeek = () => {
    const days = daysOfWeekForMapping;
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const isHabitOnDay = (habit: Habit, dayOfWeek: number) => {
        const startDate = new Date(habit.startDate + 'T00:00:00');
        switch(habit.frequency) {
            case 'Daily': return true;
            case 'Weekly': return habit.weeklyDays ? habit.weeklyDays.includes(dayOfWeek) : startDate.getDay() === dayOfWeek;
            case 'Monthly': return startDate.getDay() === dayOfWeek;
            case 'Custom': return startDate.getDay() === dayOfWeek;
            default: return false;
        }
    };
    
    return (
      <div>
        <div className="flex border-t border-x border-gray-300 dark:border-slate-700">
            <div className="w-16 flex-shrink-0 bg-gray-100 dark:bg-slate-800 border-r border-gray-300 dark:border-slate-700 flex items-center justify-center">
                <button
                    onClick={handleOpenPushConfirm}
                    className="p-2 rounded-lg text-indigo-500 dark:text-indigo-400 hover:bg-gray-200 dark:hover:bg-slate-700 transition-transform duration-150 ease-in-out active:scale-90"
                    title="Push Ideal Week to Calendar"
                >
                    <LogoIcon className="h-7 w-7" />
                </button>
            </div>
          <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(7, minmax(0, 1fr))`}}>{days.map((d, index) => (
            <div key={index} className={`text-center py-2 bg-gray-100 dark:bg-slate-800 ${index > 0 ? 'border-l border-gray-300 dark:border-slate-700' : ''}`}>
              <div className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base">
                <span className="hidden sm:inline">{d.toLocaleDateString('default', { weekday: 'long' })}</span>
                <span className="sm:hidden">{d.toLocaleDateString('default', { weekday: 'short' })}</span>
              </div>
            </div>
          ))}</div>
        </div>
        <div className="flex border-t border-x border-gray-300 dark:border-slate-700">
          <div className="w-16 flex-shrink-0 bg-gray-100 dark:bg-slate-800 border-r border-gray-300 dark:border-slate-700 text-xs text-center py-1">All-day</div>
          <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(7, minmax(0, 1fr))`}}>{days.map((day, dayIndex) => (<div key={dayIndex} className={`p-1 space-y-1 bg-white/50 dark:bg-slate-800/50 ${dayIndex > 0 ? 'border-l border-gray-300 dark:border-slate-700' : ''}`}>{habits.filter(h => (!h.dueTime && (!h.dailyTimes || Object.keys(h.dailyTimes).length === 0)) && isHabitOnDay(h, day.getDay())).map(habit => (<div key={habit.id} data-calendar-item="true" onDoubleClick={() => setHabitModalState({ isOpen: true, habitToEdit: habit, defaults: {} })} className="p-1 rounded text-xs text-white cursor-pointer truncate" style={{ backgroundColor: habit.color }}>{habit.name}</div>))}</div>))}</div>
        </div>
        <div className="flex border-y border-l border-r border-gray-300 dark:border-slate-700 bg-gray-300 dark:bg-slate-700">
            <div className="w-16 flex-shrink-0 bg-gray-100 dark:bg-slate-800 text-center">
                 <div key="0:00" className="h-12 border-t border-gray-300 dark:border-slate-700 text-xs pt-1 text-slate-500 dark:text-slate-400">{formatTime('0:00')}</div>
                {hours.slice(1).map(h => <div key={h} className="h-12 border-t border-gray-300 dark:border-slate-700 text-xs pt-1 text-slate-500 dark:text-slate-400">{formatTime(`${h}:00`)}</div>)}
            </div>
             <div ref={timeGridRef} className="flex-1 grid relative" style={{ gridTemplateColumns: `repeat(7, minmax(0, 1fr))`}} onMouseDown={handleTimeGridMouseDown}>
                {days.map((day, dayIndex) => {
                    const dayOfWeek = day.getDay();
                    return (
                        <div key={dayIndex} className="relative bg-white/50 dark:bg-slate-800/50" style={{gridColumn: dayIndex + 1}}>
                            {hours.map(h => <div key={h} className="h-12 border-t border-l border-gray-300 dark:border-slate-700"></div>)}
                            {habits.filter(h => (h.dueTime || (h.dailyTimes && Object.keys(h.dailyTimes).length > 0)) && isHabitOnDay(h, dayOfWeek)).map(habit => {
                                const habitTime = (habit.useSameTimeForAllDays === false && habit.dailyTimes?.[dayOfWeek]) ? habit.dailyTimes[dayOfWeek] : habit.dueTime;
                                if (!habitTime) return null;
                                const duration = (habit.useSameTimeForAllDays === false && habit.dailyDurations?.[dayOfWeek]) ? habit.dailyDurations[dayOfWeek] : (habit.duration || 60);
                                const [hour, minute] = habitTime.split(':').map(Number);
                                const top = ((hour * 60 + minute) / (24 * 60)) * 100;
                                const height = (duration / (24 * 60)) * 100;
                                const isOriginalHabitBeingDragged = isHabitDragging && habitDragInfoRef.current?.originalHabit.id === habit.id && habitDragInfoRef.current?.originalDayOfWeek === dayOfWeek;
                                 return (
                                    <div
                                        key={`${habit.id}-${dayOfWeek}`}
                                        data-calendar-item="true"
                                        onMouseDown={(e) => handleHabitDragStart(e, habit, dayOfWeek, 'move')}
                                        onDoubleClick={(e) => { e.stopPropagation(); setHabitModalState({ isOpen: true, habitToEdit: habit, defaults: {} }); }}
                                        className={`absolute w-[95%] left-[2.5%] p-1 rounded text-xs text-white cursor-move flex flex-col justify-between overflow-hidden transition-opacity ${isOriginalHabitBeingDragged ? 'opacity-20' : ''}`}
                                        style={{ top: `${top}%`, height: `${height}%`, backgroundColor: habit.color }}
                                    >
                                        <div onMouseDown={(e) => { e.stopPropagation(); handleHabitDragStart(e, habit, dayOfWeek, 'resize-top'); }} className="absolute top-0 left-0 w-full h-2 cursor-ns-resize" />
                                        <div><p className="font-bold truncate">{habit.name}</p><p className="opacity-80">{formatTime(habitTime)}</p></div>
                                        <div onMouseDown={(e) => { e.stopPropagation(); handleHabitDragStart(e, habit, dayOfWeek, 'resize-bottom'); }} className="absolute bottom-0 left-0 w-full h-2 cursor-ns-resize" />
                                    </div>
                                 )
                            })}
                            {idealWeekBlocks.filter(b => b.dayOfWeek === dayOfWeek).map(block => (
                                <TimedIdealBlock key={block.id} block={block} />
                            ))}
                        </div>
                    )
                })}
                {isHabitDragging && <PreviewHabit preview={previewHabit} />}
                {isIdealBlockDragging && previewIdealBlock && <PreviewIdealBlock block={previewIdealBlock} />}
                {isCreatingBlock && creationPreview && <CreationPreviewBlock block={creationPreview} />}
            </div>
        </div>
      </div>
    );
  };
  
  const inputStyle = "appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 dark:bg-slate-700 text-slate-900 dark:text-white";
  const pickerIndicatorStyle = `
    input[type="date"]::-webkit-calendar-picker-indicator {
      filter: invert(0.8) brightness(0.8);
    }
    .dark input[type="date"]::-webkit-calendar-picker-indicator {
      filter: invert(0.6);
    }
  `;

  return (
    <div className="bg-white dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl shadow-lg p-4 sm:p-6">
      <style>{pickerIndicatorStyle}</style>
      {renderHeader()}
      <div className="mt-4">
        {view === 'year' && renderYearView()}
        {view === 'quarter' && renderQuarterView()}
        {view === 'month' && renderMonthView()}
        {(view === 'week' || view === 'day' || view === 'multiday') && renderDynamicDayView()}
        {view === 'ideal' && renderIdealWeek()}
      </div>

      {taskToEdit && <TaskModal projectId={taskToEdit.projectId} projects={projects} taskToEdit={taskToEdit} onClose={() => setTaskToEdit(null)} onSaveTask={handleSaveTask} />}
      {habitModalState.isOpen && <HabitModal habitToEdit={habitModalState.habitToEdit} onClose={() => setHabitModalState({ isOpen: false, habitToEdit: null })} onSave={handleSaveHabit} defaults={habitModalState.defaults} />}
      {idealBlockModalState.isOpen && (
        <IdealWeekBlockModal
            blockToEdit={idealBlockModalState.blockToEdit}
            defaults={idealBlockModalState.defaults}
            onClose={() => setIdealBlockModalState({ isOpen: false })}
            onSave={handleSaveIdealBlock}
            onDelete={onDeleteIdealWeekBlock}
            projects={projects}
            goals={goals}
            onAddProject={onAddProject}
            onConvertToHabit={handleConvertToHabit}
        />
      )}
       {isPushConfirmOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-4 pt-20 sm:pt-4" aria-modal="true" role="dialog">
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 text-center">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Push to Calendar</h2>
                    <p className="text-slate-600 dark:text-slate-400 mt-2">
                      This will create tasks in your calendar for the selected date range based on your Ideal Week setup.
                    </p>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                        <div>
                            <label htmlFor="start-date-push" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                            <input 
                                type="date" 
                                id="start-date-push" 
                                value={pushStartDate} 
                                onChange={(e) => setPushStartDate(e.target.value)}
                                className={inputStyle}
                            />
                        </div>
                        <div>
                            <label htmlFor="end-date-push" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Date</label>
                            <input 
                                type="date" 
                                id="end-date-push" 
                                value={pushEndDate} 
                                onChange={(e) => setPushEndDate(e.target.value)}
                                min={pushStartDate}
                                className={inputStyle}
                            />
                        </div>
                    </div>
                     <p className="text-xs text-slate-500 mt-2 text-left">
                        Existing tasks will not be affected. Tasks will not be created for past dates.
                    </p>

                    <div className="mt-6 flex justify-center gap-4">
                        <button onClick={() => setIsPushConfirmOpen(false)} className="px-6 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                        <button onClick={handleConfirmPush} className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">Confirm</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default CalendarView;