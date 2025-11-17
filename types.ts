import React from 'react';

// FIX: Removed self-import which was causing declaration conflicts.

export interface User {
  name: string;
  email: string;
  subscriptionStatus: 'Free' | 'Premium';
  twoFactorEnabled?: boolean;
  phoneNumber?: string;
}

export interface Value {
  id: string;
  text: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  identity: string;
  valueIds: string[];
  order: number;
}

export enum TaskStatus {
  ToDo = 'To Do',
  Done = 'Done',
}

export enum TaskPriority {
  Today = 'Today',
  Upcoming = 'Upcoming',
  Anytime = 'Anytime',
  Someday = 'Someday',
}

export interface Project {
  id: string;
  title: string;
  description: string;
  goalId: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  dueTime: string | null;
  duration: number; // in minutes
  projectId: string | null;
}

export type ReviewCadence = 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Annual';

export interface Review {
  id: string;
  cadence: ReviewCadence;
  period: string; // e.g., "Q3 2024", "2024-W38"
  prompts: Record<string, string>; // question -> answer
  aiInsight: string | null;
  aiAdjustment: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  goalIds?: string[];
}

export type HabitFrequency = 'Daily' | 'Weekly' | 'Monthly' | 'Custom';

export interface HabitCheckpoint {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface Habit {
  id: string;
  name: string;
  description: string;
  color: string;
  completedDates: string[]; // 'YYYY-MM-DD'
  order: number;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string | null; // 'YYYY-MM-DD'
  frequency: HabitFrequency;
  weeklyDays?: number[]; // For 'Weekly' frequency: array of numbers 0 (Sun) to 6 (Sat)
  customFrequencyDays?: number; // e.g., for 'every 3 days'
  dueTime: string | null; // HH:MM, used if useSameTimeForAllDays is true
  duration?: number; // in minutes, used if useSameTimeForAllDays is true
  useSameTimeForAllDays?: boolean; // Defaults to true if timed
  dailyTimes?: { [day: number]: string }; // For different times per day, key is day index 0-6
  dailyDurations?: { [day: number]: number }; // For different durations per day, key is day index 0-6
  checkpoints?: HabitCheckpoint[];
}

export type TimeFormat = '12h' | '24h';
export type CalendarViewKey = 'year' | 'quarter' | 'month' | 'week' | 'day';

export type IdealWeekBlockType = 'task' | 'project';

export interface IdealWeekBlock {
    id: string;
    dayOfWeek: number; // 0 (Sun) to 6 (Sat)
    startTime: string; // HH:MM
    duration: number; // in minutes
    type: IdealWeekBlockType;
    title: string;
    projectId?: string | null;
}