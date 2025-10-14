


import React, { useState, useEffect, useRef } from 'react';
import { Habit, HabitFrequency, HabitCheckpoint } from '../types';
import { XIcon, ChevronDownIcon, CalendarIcon, ClockIcon, TaskListIcon, PlusIcon, TrashIcon } from './icons';

interface HabitModalProps {
  habitToEdit?: Habit | null;
  onClose: () => void;
  onSave: (habit: Omit<Habit, 'id' | 'order' | 'completedDates'> | Omit<Habit, 'completedDates' | 'order'>) => void;
  defaults?: Partial<Habit>;
}

const COLORS = [
  // Line 1: Brights
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  // Line 2: Blues, Purples, Pinks & Neutrals
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#78716C', '#A1A1AA', '#A3A3A3',
  // Line 3: Earthy & Deep Tones
  '#556B2F', '#8FBC8F', '#2E8B57', '#3CB371', '#CD853F', '#D2691E', '#8B4513', '#A0522D', '#BC8F8F', '#663399',
  // Line 4: Pastels & Darks
  '#FFDAB9', '#E6E6FA', '#D8BFD8', '#FFF0F5', '#F0FFF0', '#F5FFFA', '#F0FFFF', '#A16207', '#44403C', '#52525B',
];

const inputStyle = "appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-50 dark:bg-slate-700 text-slate-900 dark:text-white";
const pickerIndicatorStyle = `
  input[type="date"]::-webkit-calendar-picker-indicator,
  input[type="time"]::-webkit-calendar-picker-indicator {
    filter: invert(0.8) brightness(0.8);
  }
  .dark input[type="date"]::-webkit-calendar-picker-indicator,
  .dark input[type="time"]::-webkit-calendar-picker-indicator {
    filter: invert(0.6);
  }
`;

const getTodayString = () => new Date().toISOString().split('T')[0];
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const HabitModal: React.FC<HabitModalProps> = ({ habitToEdit, onClose, onSave, defaults }) => {
  const [name, setName] = useState(defaults?.name || '');
  const [description, setDescription] = useState(defaults?.description || '');
  const [color, setColor] = useState(defaults?.color || COLORS[10]);
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  
  // Scheduling State
  const [startDate, setStartDate] = useState(defaults?.startDate || getTodayString());
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<HabitFrequency>(defaults?.frequency || 'Daily');
  const [weeklyDays, setWeeklyDays] = useState<number[]>(defaults?.weeklyDays || []);
  const [customFrequencyDays, setCustomFrequencyDays] = useState<number>(defaults?.customFrequencyDays || 2);
  const [isTimeScheduled, setIsTimeScheduled] = useState(!!defaults?.dueTime || !!defaults?.dailyTimes);
  const [useSameTime, setUseSameTime] = useState(defaults?.useSameTimeForAllDays !== false);
  const [dueTime, setDueTime] = useState(defaults?.dueTime || '09:00');
  const [duration, setDuration] = useState(defaults?.duration || 60);
  const [dailyTimes, setDailyTimes] = useState<{ [day: number]: string }>(defaults?.dailyTimes || {});
  const [dailyDurations, setDailyDurations] = useState<{ [day: number]: number }>(defaults?.dailyDurations || {});

  // Checkpoint State
  const [checkpoints, setCheckpoints] = useState<HabitCheckpoint[]>([]);
  const [newCheckpointText, setNewCheckpointText] = useState('');

  // UI Visibility State
  const [isSchedulingSettingsVisible, setIsSchedulingSettingsVisible] = useState(true);
  const [isChecklistVisible, setIsChecklistVisible] = useState(false);

  const isEditing = !!habitToEdit;

  useEffect(() => {
    if (isEditing) {
      setName(habitToEdit.name);
      setDescription(habitToEdit.description);
      setColor(habitToEdit.color);
      setStartDate(habitToEdit.startDate);
      setEndDate(habitToEdit.endDate);
      setHasEndDate(!!habitToEdit.endDate);
      setFrequency(habitToEdit.frequency);
      setWeeklyDays(habitToEdit.weeklyDays || []);
      setCustomFrequencyDays(habitToEdit.customFrequencyDays || 2);
      setIsTimeScheduled(!!habitToEdit.dueTime || !!habitToEdit.dailyTimes);
      setUseSameTime(habitToEdit.useSameTimeForAllDays !== false);
      setDueTime(habitToEdit.dueTime || '09:00');
      setDuration(habitToEdit.duration || 60);
      setDailyTimes(habitToEdit.dailyTimes || {});
      setDailyDurations(habitToEdit.dailyDurations || {});
      setCheckpoints(habitToEdit.checkpoints || []);
      setIsSchedulingSettingsVisible(true);
      setIsChecklistVisible(!!habitToEdit.checkpoints && habitToEdit.checkpoints.length > 0);
    } else {
      setIsSchedulingSettingsVisible(false);
      setIsChecklistVisible(false);
    }
  }, [habitToEdit, isEditing]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
            setIsColorPickerOpen(false);
        }
    };
    if (isColorPickerOpen) {
        document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isColorPickerOpen]);

  const handleWeeklyDayToggle = (dayIndex: number) => {
    const isAdding = !weeklyDays.includes(dayIndex);
    
    setWeeklyDays(prev => 
      isAdding ? [...prev, dayIndex].sort() : prev.filter(d => d !== dayIndex)
    );

    if (isAdding) {
        setDailyTimes(prev => {
            if (prev[dayIndex]) return prev;
            return { ...prev, [dayIndex]: '09:00' };
        });
        setDailyDurations(prev => {
            if (prev[dayIndex]) return prev;
            return { ...prev, [dayIndex]: duration };
        });
    } else {
        setDailyTimes(prev => {
            const newTimes = { ...prev };
            delete newTimes[dayIndex];
            return newTimes;
        });
        setDailyDurations(prev => {
            const newDurations = { ...prev };
            delete newDurations[dayIndex];
            return newDurations;
        });
    }
  };
  
  const handleDailyTimeChange = (dayIndex: number, time: string) => {
    setDailyTimes(prev => ({...prev, [dayIndex]: time}));
  };

  const handleDailyDurationChange = (dayIndex: number, newDuration: number) => {
    setDailyDurations(prev => ({ ...prev, [dayIndex]: newDuration }));
  };

  const handleAddCheckpoint = () => {
    if (newCheckpointText.trim()) {
      const newCheckpoint: HabitCheckpoint = {
        id: `chk_${Date.now()}`,
        text: newCheckpointText.trim(),
        isCompleted: false,
      };
      setCheckpoints(prev => [...prev, newCheckpoint]);
      setNewCheckpointText('');
    }
  };

  const handleToggleCheckpoint = (id: string) => {
    setCheckpoints(prev => prev.map(c => c.id === id ? { ...c, isCompleted: !c.isCompleted } : c));
  };
  
  const handleDeleteCheckpoint = (id: string) => {
    setCheckpoints(prev => prev.filter(c => c.id !== id));
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      const habitData = { 
        name, 
        description, 
        color,
        startDate,
        endDate: hasEndDate ? endDate : null,
        frequency,
        weeklyDays: frequency === 'Weekly' ? weeklyDays : undefined,
        customFrequencyDays: frequency === 'Custom' ? customFrequencyDays : undefined,
        duration: isTimeScheduled && useSameTime ? duration : undefined,
        useSameTimeForAllDays: isTimeScheduled ? useSameTime : undefined,
        dueTime: isTimeScheduled && useSameTime ? dueTime : null,
        dailyTimes: isTimeScheduled && !useSameTime ? dailyTimes : undefined,
        dailyDurations: isTimeScheduled && !useSameTime ? dailyDurations : undefined,
        checkpoints: checkpoints.length > 0 ? checkpoints : undefined,
      };
      if (isEditing) {
        onSave({ ...habitData, id: habitToEdit.id });
      } else {
        onSave(habitData);
      }
    }
  };
  
  const showSameTimeToggle = isTimeScheduled && (frequency === 'Daily' || (frequency === 'Weekly' && weeklyDays.length > 1));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-4 pt-8 sm:pt-4">
      <style>{pickerIndicatorStyle}</style>
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{isEditing ? 'Edit Habit' : 'Create a New Habit'}</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">
            <XIcon className="h-6 w-6 text-slate-500 dark:text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto">
          <div className="p-6 space-y-4">
            <div className="flex items-end gap-4">
               <div className="relative" ref={colorPickerRef}>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Color</label>
                  <button
                      type="button"
                      onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                      className="w-10 h-10 p-1 rounded-md border-2 border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 flex-shrink-0"
                      aria-label="Choose color"
                  >
                      <div className="w-full h-full rounded-sm" style={{ backgroundColor: color }}></div>
                  </button>
                  {isColorPickerOpen && (
                      <div className="absolute top-full mt-1 w-72 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-20 p-2 left-0">
                          <div className="grid grid-cols-10 gap-2">
                              {COLORS.map(c => (
                              <button
                                  key={c}
                                  type="button"
                                  onClick={() => {
                                      setColor(c);
                                      setIsColorPickerOpen(false);
                                  }}
                                  className={`w-full h-8 rounded-md transition-transform transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 ring-indigo-500' : ''}`}
                                  style={{ backgroundColor: c }}
                                  aria-label={`Select color ${c}`}
                              />
                              ))}
                          </div>
                      </div>
                  )}
              </div>
              <div className="flex-grow">
                <label htmlFor="habit-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Habit Name</label>
                <input type="text" id="habit-name" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g., Daily Run" className={inputStyle} />
              </div>
            </div>
            <div>
              <label htmlFor="habit-desc" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description (Optional)</label>
              <textarea id="habit-desc" value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Why is this important? What are the rules?" className={inputStyle} />
            </div>

            <div className="border-t border-gray-200 dark:border-slate-700/50 pt-2 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsSchedulingSettingsVisible(v => !v)}
                        className="flex items-center gap-2 p-2 rounded-md text-slate-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700/50"
                        aria-label={isSchedulingSettingsVisible ? "Hide scheduling options" : "Show scheduling options"}
                        title={isSchedulingSettingsVisible ? "Hide scheduling options" : "Show scheduling options"}
                    >
                        <CalendarIcon className="h-6 w-6" />
                        <ClockIcon className="h-6 w-6" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsChecklistVisible(v => !v)}
                        className="flex items-center p-2 rounded-md text-slate-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700/50"
                        aria-label={isChecklistVisible ? "Hide checklist" : "Show checklist"}
                        title={isChecklistVisible ? "Hide checklist" : "Show checklist"}
                    >
                        <TaskListIcon className="h-6 w-6" />
                    </button>
                </div>
                <ChevronDownIcon className={`h-5 w-5 transition-transform text-slate-400 ${isSchedulingSettingsVisible || isChecklistVisible ? 'rotate-180' : ''}`} />
            </div>
            
            <div className={`transition-all duration-300 ease-in-out overflow-hidden space-y-4 ${isSchedulingSettingsVisible ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="start-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date</label>
                        <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} required className={inputStyle} />
                    </div>
                    <div>
                        <label htmlFor="end-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Date</label>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="has-end-date" checked={hasEndDate} onChange={e => setHasEndDate(e.target.checked)} className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500" />
                            <input type="date" id="end-date" value={endDate || ''} onChange={e => setEndDate(e.target.value)} disabled={!hasEndDate} className={`${inputStyle} disabled:opacity-50`} />
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div>
                        <label htmlFor="frequency" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Frequency</label>
                        <select id="frequency" value={frequency} onChange={e => setFrequency(e.target.value as HabitFrequency)} className={`${inputStyle} flex-grow`}>
                            <option value="Daily">Daily</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Custom">Custom</option>
                        </select>
                    </div>
                    {frequency === 'Custom' && (
                        <div>
                            <label htmlFor="custom-days" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Every X Days</label>
                            <input type="number" id="custom-days" value={customFrequencyDays} onChange={e => setCustomFrequencyDays(parseInt(e.target.value) || 1)} min="1" className={inputStyle} />
                        </div>
                    )}
                </div>
                {frequency === 'Weekly' && (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Repeat On</label>
                        <div className="flex justify-around">
                            {WEEK_DAYS.map((day, index) => (
                                <button key={index} type="button" onClick={() => handleWeeklyDayToggle(index)} className={`h-8 w-8 rounded-full text-sm font-semibold transition-colors ${weeklyDays.includes(index) ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600'}`}>{day.charAt(0)}</button>
                            ))}
                        </div>
                    </div>
                )}
                
                {!isTimeScheduled ? (
                    <button type="button" onClick={() => setIsTimeScheduled(true)} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                        + Add Time
                    </button>
                ) : (
                    <div className="space-y-4 p-4 bg-gray-100/50 dark:bg-slate-700/30 rounded-lg">
                        {showSameTimeToggle && (
                            <div className="flex items-center justify-between">
                                <label htmlFor="same-time" className="text-sm font-medium text-slate-700 dark:text-slate-300">Same time for all days</label>
                                <input type="checkbox" id="same-time" checked={useSameTime} onChange={e => setUseSameTime(e.target.checked)} className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"/>
                            </div>
                        )}
                        {useSameTime || !showSameTimeToggle ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="due-time" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Time</label>
                                    <input type="time" id="due-time" value={dueTime} onChange={e => setDueTime(e.target.value)} className={inputStyle} />
                                </div>
                                <div>
                                    <label htmlFor="duration" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Duration (minutes)</label>
                                    <input type="number" id="duration" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 60)} min="15" step="15" className={inputStyle} />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                                    <span>Day</span>
                                    <span className="justify-self-center">Time</span>
                                    <span className="justify-self-center">Duration (min)</span>
                                </div>
                                {(frequency === 'Daily' ? [0,1,2,3,4,5,6] : weeklyDays).map(dayIndex => (
                                    <div key={dayIndex} className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center">
                                        <label htmlFor={`time-${dayIndex}`} className="text-sm font-medium text-slate-700 dark:text-slate-300">{WEEK_DAYS[dayIndex]}</label>
                                        <input type="time" id={`time-${dayIndex}`} value={dailyTimes[dayIndex] || '09:00'} onChange={e => handleDailyTimeChange(dayIndex, e.target.value)} className={`${inputStyle} w-28`} />
                                        <input type="number" id={`duration-${dayIndex}`} value={dailyDurations[dayIndex] || 60} onChange={e => handleDailyDurationChange(dayIndex, parseInt(e.target.value) || 60)} min="15" step="15" className={`${inputStyle} w-24`} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className={`transition-all duration-300 ease-in-out overflow-hidden space-y-4 ${isChecklistVisible ? 'max-h-[1000px] opacity-100 pt-4 border-t border-gray-200 dark:border-slate-700/50' : 'max-h-0 opacity-0'}`}>
                <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">Checkpoints</h3>
                <div className="space-y-2">
                    {checkpoints.map(checkpoint => (
                        <div key={checkpoint.id} className="group flex items-center gap-2 bg-gray-100/50 dark:bg-slate-700/50 p-2 rounded-md">
                            <input
                                type="checkbox"
                                checked={checkpoint.isCompleted}
                                onChange={() => handleToggleCheckpoint(checkpoint.id)}
                                className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 shrink-0"
                            />
                            <span className={`flex-grow text-sm ${checkpoint.isCompleted ? 'line-through text-slate-500' : 'text-slate-800 dark:text-slate-200'}`}>
                                {checkpoint.text}
                            </span>
                            <button
                                type="button"
                                onClick={() => handleDeleteCheckpoint(checkpoint.id)}
                                className="opacity-0 group-hover:opacity-100 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-opacity"
                            >
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newCheckpointText}
                        onChange={e => setNewCheckpointText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCheckpoint(); } }}
                        placeholder="Add a new checkpoint..."
                        className={inputStyle + " flex-grow"}
                    />
                    <button
                        type="button"
                        onClick={handleAddCheckpoint}
                        className="flex-shrink-0 inline-flex items-center justify-center p-2 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        <PlusIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>

          </div>
          <div className="p-4 bg-white/80 dark:bg-slate-800/80 border-t border-gray-200 dark:border-slate-700 flex justify-end sticky bottom-0">
            <button onClick={onClose} type="button" className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 rounded-md hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors mr-2">Cancel</button>
            <button type="submit" className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800 focus:ring-indigo-500 transition-colors">
              {isEditing ? 'Save Changes' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HabitModal;