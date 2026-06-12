/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Team, Player } from './types';

// Distinct, high-contrast Tailwind text colors to display groups who wish to play together in identical colors
export const GROUP_COLORS = [
  'text-indigo-600',
  'text-emerald-600',
  'text-rose-600',
  'text-purple-600',
  'text-amber-700',
  'text-teal-600',
  'text-pink-600',
  'text-blue-600',
  'text-violet-600',
  'text-fuchsia-600',
  'text-orange-600',
  'text-red-500'
];

// Large list of popular sports stars and casual player first names for the quick randomizer
export const RANDOM_PLAYER_NAMES = [
  'Jordan',
  'Alex',
  'Taylor',
  'Riley',
  'LeBron',
  'Steph',
  'Kevin',
  'Giannis',
  'Caitlin',
  'Sabrina',
  'Kobe',
  'Michael',
  'Serena',
  'Luka',
  'Klay',
  'Kyrie',
  'Devin',
  'Neymar',
  'Zion',
  'Anthony',
  'Nikola',
  'Marcus',
  'Jimmy',
  'Ja',
  'Acantha',
  'Zayn',
  'Kelsey',
  'Breanna',
  "A'ja",
  'Chris',
  'John',
  'Sam',
  'David',
  'Ryan',
  'Emma',
  'Olivia',
  'Sophia',
  'James',
  'Mason',
  'Benjamin'
];

/**
 * Extracts initials from a standard full name
 */
export function getInitials(name: string): string {
  const clean = name.trim();
  if (!clean) return '??';
  
  const parts = clean.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  
  const first = parts[0][0] || '';
  const last = parts[parts.length - 1][0] || '';
  return (first + last).toUpperCase();
}

/**
 * Generates a unique, short ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Demo seed data that matches the exact state of the provided mockup
 */
export const defaultTeams: Team[] = [
  {
    id: 'team-active-1',
    name: 'Team 1',
    status: 'active',
    createdAt: Date.now() - 60000 * 5, // 5 mins ago
    players: [
      { id: 'p1', name: 'Jordan Smith', initials: 'JS' },
      { id: 'p2', name: 'Alex Kim', initials: 'AK' }
    ]
  },
  {
    id: 'team-waiting-2',
    name: 'Team 2',
    status: 'waiting',
    createdAt: Date.now() - 60000 * 2, // 2 mins ago
    players: [
      { id: 'p3', name: 'Taylor Cruz', initials: 'TC' },
      { id: 'p4', name: 'Riley Jones', initials: 'RJ' }
    ]
  }
];
