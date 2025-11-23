import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Habit } from '../types';
import { FlameIcon, ChevronLeftIcon, ChevronRightIcon, PencilIcon, TrashIcon } from './icons';

interface HabitTrackerProps {
  habit: Habit;
  onToggleDate: (habitId: string, date: string) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (id: string) => void;
}

// Helper function to get local date string, preventing timezone bugs
const getLocalDateString = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
};

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

const calculateHabitStats = (habit: Habit) => {
  const { startDate, frequency, customFrequencyDays } = habit;
  // Provide default empty array for completedDates if undefined
  const completedDates = habit.completedDates || [];
  const total = completedDates.length;
  if (total === 0) {
    return { currentStreak: 0, total };
  }
  
  const completedSet = new Set(completedDates);
  const start = new Date(startDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let dueDates: string[] = [];
  let currentDate = new Date(start);
  while(currentDate <= today) {
    if (isDateTrackable(currentDate, habit)) {
        dueDates.push(getLocalDateString(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  if (dueDates.length === 0) {
    return { currentStreak: 0, total };
  }

  let currentStreak = 0;
  const lastDueDate = dueDates[dueDates.length - 1];
  const lastDueDateIsToday = lastDueDate === getLocalDateString(today);
  
  // Iterate backwards from the last potential due date
  for (let i = dueDates.length - 1; i >= 0; i--) {
      const dueDate = dueDates[i];
      if (completedSet.has(dueDate)) {
          currentStreak++;
      } else {
          // If a past due date was missed, streak is broken.
          // If today is a due date but not completed yet, the streak is whatever it was before today.
          if (i === dueDates.length - 1 && lastDueDateIsToday) {
            continue; // Don't break streak for today if not yet done
          }
          break; // Streak is broken
      }
  }

  return { currentStreak, total };
};

const HabitYearGrid: React.FC<{ habit: Habit; currentDate: Date }> = ({ habit, currentDate }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!scrollContainerRef.current) return;

        const scrollContainer = scrollContainerRef.current;
        const year = currentDate.getFullYear();
        
        const firstOfYear = new Date(year, 0, 1);
        const dayOfWeek = firstOfYear.getDay();
        const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        const firstOfMonth = new Date(year, currentDate.getMonth(), 1);
        const daysFromYearStart = Math.floor((firstOfMonth.getTime() - firstOfYear.getTime()) / (1000 * 3600 * 24));
        
        const totalDaysInGridBeforeMonth = daysFromYearStart + offset;
        const targetColumn = Math.floor(totalDaysInGridBeforeMonth / 7);

        const totalCellWidth = 16.25; // Fine-tuned value for visual alignment
        const containerWidth = scrollContainer.offsetWidth;

        const targetColumnLeftPosition = targetColumn * totalCellWidth;
        
        let desiredScrollLeft = targetColumnLeftPosition - (containerWidth / 2) + (totalCellWidth / 2);

        const maxScrollLeft = scrollContainer.scrollWidth - containerWidth;
        desiredScrollLeft = Math.max(0, desiredScrollLeft);
        desiredScrollLeft = Math.min(maxScrollLeft, desiredScrollLeft);
        
        scrollContainer.scrollTo({
            left: desiredScrollLeft,
            behavior: 'smooth'
        });

    }, [currentDate]);

    const year = currentDate.getFullYear();
    const startDate = new Date(year, 0, 1);
    const dayOfWeek = startDate.getDay();
    const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const daysInYear = ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;

    const days = Array.from({ length: daysInYear + offset }, (_, i) => {
        if (i < offset) return null;
        const date = new Date(year, 0, i - offset + 1);
        const dateString = getLocalDateString(date);
        return {
            date,
            isCompleted: habit.completedDates.includes(dateString),
            isTrackable: isDateTrackable(date, habit),
        };
    });
    
    const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    
    const monthLabels = useMemo(() => {
        const labels = [];
        const firstOfYear = new Date(year, 0, 1);
        
        for (let i = 0; i < 12; i++) {
            const firstOfMonth = new Date(year, i, 1);
            const daysInMonth = new Date(year, i + 1, 0).getDate();

            const daysFromYearStart = Math.floor((firstOfMonth.getTime() - firstOfYear.getTime()) / (1000 * 3600 * 24));
            
            const totalDaysInGridBeforeMonth = daysFromYearStart + offset;
            const startColumn = Math.floor(totalDaysInGridBeforeMonth / 7);
            const endColumn = Math.floor((totalDaysInGridBeforeMonth + daysInMonth - 1) / 7);
            
            const middleColumn = startColumn + ((endColumn - startColumn) / 2);

            labels.push({
                name: firstOfMonth.toLocaleString('default', { month: 'short' }),
                middleColumn: middleColumn,
            });
        }
        return labels;
    }, [year, offset]);

    return (
        <div className="flex gap-3">
             <div className="flex flex-col gap-1 pt-5 text-xs text-slate-500 dark:text-slate-400 shrink-0">
                {weekDays.map((d, i) => <div key={i} className="h-3.5 flex items-center">{d}</div>)}
            </div>

            <div ref={scrollContainerRef} className="overflow-x-auto flex-grow">
                <div className="relative inline-block">
                    <div className="flex h-4 mb-1">
                        {monthLabels.map((month) => (
                            <div 
                                key={month.name} 
                                className="text-xs text-slate-500 dark:text-slate-400 absolute text-center" 
                                style={{ 
                                    left: `${month.middleColumn * 16.25}px`,
                                    transform: 'translateX(-50%)'
                                }}
                            >
                                {month.name}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-flow-col grid-rows-7 gap-1">
                        {days.map((day, i) => {
                            if (!day) return <div key={`empty-${i}`} className="w-3.5 h-3.5" />;
                            const colorStyle = day.isCompleted ? { backgroundColor: habit.color } : {};
                            
                            let baseBg = 'bg-gray-100 dark:bg-slate-800'; // Not trackable day
                            if (day.isTrackable) {
                                baseBg = 'bg-gray-200 dark:bg-slate-700'; // Trackable but not completed
                            }

                            return (
                                <div 
                                    key={i}
                                    className={`w-3.5 h-3.5 rounded-sm ${baseBg}`}
                                    style={colorStyle}
                                    title={day.date.toLocaleDateString()}
                                />
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

const HabitMonthCalendar: React.FC<{ habit: Habit, currentDate: Date, onToggleDate: (date: string) => void }> = ({ habit, currentDate, onToggleDate }) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // Sunday - 0, Monday - 1
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayCells: (Date | null)[] = Array(startDayOfWeek).fill(null);
    for (let i = 1; i <= daysInMonth; i++) {
        dayCells.push(new Date(year, month, i));
    }
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {dayNames.map(d => <div key={d} className="font-semibold text-slate-500 dark:text-slate-400 p-1">{d}</div>)}
                {dayCells.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`}></div>;
                    const dateString = getLocalDateString(day);
                    const isCompleted = habit.completedDates.includes(dateString);
                    const isToday = day.getTime() === today.getTime();
                    const trackable = isDateTrackable(day, habit) && day <= today;

                    return (
                        <button
                            key={idx}
                            onClick={() => onToggleDate(dateString)}
                            disabled={!trackable}
                            className={`
                                w-9 h-9 flex items-center justify-center rounded-lg transition-colors 
                                disabled:opacity-30 disabled:cursor-not-allowed
                                ${isCompleted ? `text-white` : `hover:bg-gray-200 dark:hover:bg-slate-700`}
                                ${isToday ? `ring-2 ring-offset-2 ring-offset-slate-800 dark:ring-offset-slate-900 ring-white` : ''}
                            `}
                             style={{ 
                                backgroundColor: isCompleted ? habit.color : 'transparent', 
                                border: !isCompleted && trackable ? `1px solid ${habit.color}` : (!isCompleted ? '1px solid #475569' : '')
                            }}
                        >
                            {day.getDate()}
                        </button>
                    )
                })}
            </div>
        </div>
    );
};


const HabitTracker: React.FC<HabitTrackerProps> = ({ habit: rawHabit, onToggleDate, onEdit, onDelete }) => {
  // Normalize habit data to ensure all required fields have default values
  const habit = useMemo(() => ({
    ...rawHabit,
    completedDates: rawHabit.completedDates || [],
    weeklyDays: rawHabit.weeklyDays || [],
    customFrequencyDays: rawHabit.customFrequencyDays || undefined,
  }), [rawHabit]);

  const [currentDate, setCurrentDate] = useState(new Date());
  
  const today = useMemo(() => new Date(), []);
  const todayDateString = useMemo(() => getLocalDateString(today), [today]);
  const isTodayCompleted = useMemo(() => habit.completedDates.includes(todayDateString), [habit.completedDates, todayDateString]);
  const isTodayTrackable = useMemo(() => isDateTrackable(today, habit), [today, habit]);

  const handleTodayToggle = () => {
    if(isTodayTrackable) {
        onToggleDate(habit.id, todayDateString);
    }
  };
  
  const stats = useMemo(() => calculateHabitStats(habit), [habit]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
        const newDate = new Date(prev);
        newDate.setDate(1); // avoid month length issues
        const increment = direction === 'prev' ? -1 : 1;
        newDate.setMonth(newDate.getMonth() + increment);
        return newDate;
    })
  };

  return (
    <div className="bg-white dark:bg-slate-800/60 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-start">
            <div className="flex items-start">
                <div className="relative flex items-center justify-center h-6 w-6 mr-4 mt-1 flex-shrink-0">
                    <input
                        type="checkbox"
                        checked={isTodayCompleted}
                        onChange={handleTodayToggle}
                        disabled={!isTodayTrackable}
                        className="peer appearance-none h-6 w-6 rounded-md cursor-pointer border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ 
                            borderColor: habit.color,
                            backgroundColor: isTodayCompleted ? habit.color : 'transparent' 
                        }}
                        aria-label={`Mark ${habit.name} for today`}
                    />
                    <svg
                        className="absolute w-4 h-4 text-white pointer-events-none hidden peer-checked:block"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                        />
                    </svg>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{habit.name}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{habit.description}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => onEdit(habit)} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-slate-700">
                    <PencilIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                </button>
                <button onClick={() => onDelete(habit.id)} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-slate-700">
                    <TrashIcon className="h-5 w-5 text-red-500 dark:text-red-400" />
                </button>
            </div>
        </div>

        <div className="my-6">
            <HabitYearGrid habit={habit} currentDate={currentDate} />
        </div>

        <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    <FlameIcon className="h-6 w-6 text-orange-500" />
                    <div>
                        <p className="font-bold text-lg">{stats.currentStreak}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">Streak</p>
                    </div>
                 </div>
                  <div>
                    <p className="font-bold text-lg">{stats.total}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">Total</p>
                 </div>
            </div>
            <div className="text-center">
                 <div className="flex items-center">
                    <button onClick={() => navigateMonth('prev')} className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-slate-700"><ChevronLeftIcon className="h-5 w-5" /></button>
                    <h4 className="font-semibold w-32 text-center">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h4>
                    <button onClick={() => navigateMonth('next')} className="p-1 rounded-md hover:bg-gray-200 dark:hover:bg-slate-700"><ChevronRightIcon className="h-5 w-5" /></button>
                 </div>
            </div>
        </div>
        
        <div className="mt-4 p-4 bg-gray-100 dark:bg-slate-900/50 rounded-xl">
             <HabitMonthCalendar 
                habit={habit} 
                currentDate={currentDate} 
                onToggleDate={(date) => onToggleDate(habit.id, date)} 
            />
        </div>

    </div>
  );
};

export default HabitTracker;