/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Player {
  id: string;
  name: string;
  initials: string;
  wins?: number;
  losses?: number;
  color?: string;
  squadCode?: string;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
  status: 'active' | 'waiting';
  createdAt: number;
}

export interface Session {
  gameName: string;
  gameDetail: string;
  teamSize: number;
}

export interface GameRecord {
  id: string;
  gameNumber: number;
  courtName: string;
  teamA: Team;
  teamB: Team;
  winnerSide: 'A' | 'B';
  status: 'End';
  timestamp: number;
}

