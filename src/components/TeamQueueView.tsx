/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, 
  Trash2, 
  ChevronUp, 
  ChevronDown, 
  RotateCcw, 
  Edit2, 
  Check, 
  Plus, 
  Play,
  ClipboardList,
  Compass,
  Zap,
  UserX
} from 'lucide-react';
import { Team, Player } from '../types';
import { getInitials } from '../utils';

interface TeamQueueViewProps {
  teams: Team[];
  courtCount: number;
  onIncreaseCourts: () => void;
  onDecreaseCourts: () => void;
  onRequeuePlayers: (teamId: string) => void;
  onReorderTeams: (updatedTeams: Team[]) => void;
  onUpdatePlayerName: (teamId: string, playerId: string, newName: string) => void;
  onDeleteTeam: (teamId: string) => void;
  onAddQuickTeam: () => void;
  onRotateTeamToBack: (teamId: string) => void;
  onToggleStatus: (teamId: string) => void;
  onRecordMatchResult: (courtNum: number, teamA: Team, teamB: Team, winnerSide: 'A' | 'B') => void;
  onFillTeam: (teamId: string) => void;
  onDropPlayer: (playerId: string) => void;
  onDropSquad: (squadCode: string) => void;
  onSwapPlayers?: (player1Id: string, player2Id: string) => void;
}

export default function TeamQueueView({
  teams,
  courtCount,
  onIncreaseCourts,
  onDecreaseCourts,
  onRequeuePlayers,
  onReorderTeams,
  onUpdatePlayerName,
  onDeleteTeam,
  onAddQuickTeam,
  onRotateTeamToBack,
  onToggleStatus,
  onRecordMatchResult,
  onFillTeam,
  onDropPlayer,
  onDropSquad,
  onSwapPlayers
}: TeamQueueViewProps) {
  // Local state for active editing player
  const [editingPlayer, setEditingPlayer] = useState<{ teamId: string; playerId: string } | null>(null);
  const [tempName, setTempName] = useState<string>('');

  // Active player selected for the swapping dropdown menu
  const [activePlayerSelectorId, setActivePlayerSelectorId] = useState<string | null>(null);

  // Auto-dismiss the active player dropdown when clicking outside or pressing Escape
  React.useEffect(() => {
    if (activePlayerSelectorId === null) return;
    
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.player-swap-dropdown-container')) {
        setActivePlayerSelectorId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActivePlayerSelectorId(null);
      }
    };
    
    document.addEventListener('click', handleGlobalClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleGlobalClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activePlayerSelectorId]);

  // Total player count
  const totalPlayers = teams.reduce((acc, t) => acc + t.players.length, 0);

  // Divide teams into active court slots and waiting list
  const activeThreshold = courtCount * 2;
  const waitingTeams = teams.slice(activeThreshold);

  // Move waiting team UP (within the global roster)
  const handleMoveUpWaiting = (waitingIndex: number) => {
    const globalIdx = activeThreshold + waitingIndex;
    if (globalIdx === 0) return;
    
    const nextList = [...teams];
    const item = nextList[globalIdx];
    nextList[globalIdx] = nextList[globalIdx - 1];
    nextList[globalIdx - 1] = item;
    onReorderTeams(nextList);
  };

  // Move waiting team DOWN (within the global roster)
  const handleMoveDownWaiting = (waitingIndex: number) => {
    const globalIdx = activeThreshold + waitingIndex;
    if (globalIdx === teams.length - 1) return;
    
    const nextList = [...teams];
    const item = nextList[globalIdx];
    nextList[globalIdx] = nextList[globalIdx + 1];
    nextList[globalIdx + 1] = item;
    onReorderTeams(nextList);
  };

  // Start inline name edit
  const startEditing = (teamId: string, player: Player) => {
    setEditingPlayer({ teamId, playerId: player.id });
    setTempName(player.name);
  };

  // Save updated inline player name
  const saveName = () => {
    if (editingPlayer) {
      onUpdatePlayerName(editingPlayer.teamId, editingPlayer.playerId, tempName);
      setEditingPlayer(null);
    }
  };

  // Abort editing inline name
  const cancelSave = () => {
    setEditingPlayer(null);
  };

  return (
    <div id="team-queue-panel" className="flex-grow flex flex-col gap-6">
      {/* Header section of Queue */}
      <div id="queue-header-row" className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h1 id="queue-main-title" className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Match Lobby
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1">Multi-Court Rotation & Queue Manager</p>
        </div>
        
        <div id="players-total-badge" className="flex items-center gap-2 text-slate-600 font-medium text-sm">
          <Users size={16} className="text-slate-400" />
          <span className="font-semibold text-slate-900">{totalPlayers}</span> Players Total
        </div>
      </div>

      {/* Lobby Configurations directly below Header row */}
      <div className="pb-5 border-b border-slate-150 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Lobby Configurations</h4>
          <p className="text-[10px] text-slate-400">Add or remove active courts (each court hosts two teams inside Match Arena)</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onDecreaseCourts}
            disabled={courtCount <= 1}
            className={`px-3 py-1.5 border rounded-lg text-xs font-semibold select-none transition-all ${
              courtCount <= 1
                ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 active:scale-95 cursor-pointer'
            }`}
          >
            - Remove Court
          </button>
          
          <span className="font-mono font-bold text-xs px-3.5 py-1.5 bg-slate-900 text-white rounded-lg border border-slate-800">
            {courtCount} {courtCount === 1 ? 'Court Room' : 'Court Rooms'}
          </span>

          <button
            onClick={onIncreaseCourts}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold select-none transition-all active:scale-95 cursor-pointer"
          >
            + Add Court
          </button>
        </div>
      </div>

      {/* 1. ACTIVE COURTS SECTION */}
      <div id="active-courts-section" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></span>
            Active Court Arenas
          </h2>
          <span className="text-xs text-slate-400 font-mono">{courtCount} {courtCount === 1 ? 'court' : 'courts'}</span>
        </div>

        <div className="flex flex-col gap-4">
          {Array.from({ length: courtCount }).map((_, cIdx) => {
            const courtNum = cIdx + 1;
            const teamAIdx = cIdx * 2;
            const teamBIdx = cIdx * 2 + 1;

            const teamA = teams[teamAIdx];
            const teamB = teams[teamBIdx];

            return (
              <div 
                key={courtNum} 
                id={`court-lobby-card-${courtNum}`}
                className="border border-slate-200 rounded-xl p-4 bg-[#f8fafc] shadow-xs flex flex-col justify-between"
              >
                {/* Court header status */}
                <div className="flex items-center justify-between border-b border-slate-150 pb-2 mb-3">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-blue-600"></span>
                    Court {courtNum}
                  </span>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold font-mono">
                    Match Arena
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch mt-1 relative">
                  {/* Team A (Left side) */}
                  {teamA ? (
                    <div className="bg-white border border-slate-150 rounded-lg p-3 shadow-2xs flex flex-col justify-between">
                      <div>
                        {/* Team header containing controls */}
                        <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-100">
                          <span className="text-xs font-bold text-slate-800 font-mono">{teamA.name}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onRotateTeamToBack(teamA.id)}
                              className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 rounded text-[9px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                              title="Move entire team intact to the back of the queue (Keep same team)"
                            >
                              🔄 Requeue Team
                            </button>
                            <button
                              type="button"
                              onClick={() => onRequeuePlayers(teamA.id)}
                              className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 rounded text-[9px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                              title="Disband team and move all players individually to wait queue (Current rules)"
                            >
                              👥 Requeue Players
                            </button>
                            <button
                              type="button"
                              onClick={() => onFillTeam(teamA.id)}
                              className="px-2 py-0.5 bg-green-50 hover:bg-green-100 text-green-600 hover:text-green-700 rounded text-[9px] font-bold transition-all flex items-center gap-1 cursor-pointer font-sans"
                              title="Fill active team to standard team size from wait queue or new players"
                            >
                              ➕ Fill Team
                            </button>
                            <button
                              onClick={() => onDeleteTeam(teamA.id)}
                              className="p-1 text-slate-400 hover:text-red-500 rounded transition"
                              title="Trash team"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                        
                        {/* Players list top to bottom */}
                        <div className="flex flex-col gap-1.5">
                          {teamA.players.map((player) => {
                            const isPlEditing = editingPlayer?.teamId === teamA.id && editingPlayer?.playerId === player.id;
                            const allCurrentPlayers = teams.flatMap((t) => 
                              t.players.map((p) => ({
                                ...p,
                                teamId: t.id,
                                teamName: t.name
                              }))
                            );
                            const otherPlayers = allCurrentPlayers.filter((p) => p.id !== player.id);

                            return (
                              <div key={player.id} className="text-xs text-slate-600 flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded relative group">
                                <span className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="font-mono bg-slate-200 text-slate-700 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0">{player.initials}</span>
                                  {isPlEditing ? (
                                    <input
                                      type="text"
                                      value={tempName}
                                      onChange={(e) => setTempName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveName();
                                        if (e.key === 'Escape') cancelSave();
                                      }}
                                      className="w-full px-1 border border-blue-400 rounded focus:outline-none"
                                      autoFocus
                                    />
                                  ) : (
                                    <div className="relative inline-block text-left min-w-0 flex-1 player-swap-dropdown-container">
                                      <span 
                                        className={`truncate hover:bg-slate-100 rounded px-1.5 -mx-1.5 py-0.5 cursor-pointer font-semibold flex items-center gap-1 ${player.color || 'text-slate-700 hover:text-blue-600'}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActivePlayerSelectorId(player.id);
                                        }}
                                        title="Click to change player or rename"
                                      >
                                        <span className="truncate">{player.name}</span>
                                        <span className="text-[8px] text-slate-400 shrink-0">▼</span>
                                        {player.squadCode && (
                                          <span className="shrink-0 ml-1.5 px-1 py-0.2 text-[8px] font-bold bg-indigo-50 border border-indigo-100 rounded text-indigo-600 inline-block font-sans">
                                            Squad {player.squadCode}
                                          </span>
                                        )}
                                      </span>

                                      {activePlayerSelectorId === player.id && (
                                        <>
                                          <div className="absolute left-0 mt-1.5 w-64 bg-white border border-slate-200 text-slate-800 rounded-lg shadow-xl p-3.5 z-50 text-wrap">
                                            <div className="font-bold text-slate-900 mb-2 pb-1.5 border-b border-slate-100 flex justify-between items-center">
                                              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-sans">Swap Player Spot</span>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setActivePlayerSelectorId(null);
                                                  startEditing(teamA.id, player);
                                                }}
                                                className="bg-blue-50 text-blue-600 hover:text-blue-700 hover:bg-blue-100 px-2 py-1 rounded font-bold font-sans transition-all flex items-center gap-1 cursor-pointer text-[10px]"
                                              >
                                                ✏️ Edit Spelling
                                              </button>
                                            </div>
                                            
                                            <div className="max-h-44 overflow-y-auto space-y-1 pr-1 font-sans">
                                              {otherPlayers.map((otherPl) => (
                                                <button
                                                  key={otherPl.id}
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onSwapPlayers) onSwapPlayers(player.id, otherPl.id);
                                                    setActivePlayerSelectorId(null);
                                                  }}
                                                  className="w-full text-left p-1.5 hover:bg-slate-50 rounded-md transition flex justify-between items-center gap-2 group/item cursor-pointer text-slate-700 hover:text-slate-900"
                                                >
                                                  <span className={`font-semibold truncate text-[11px] ${otherPl.color || 'text-slate-800 group-hover/item:text-blue-600'}`}>
                                                    {otherPl.name}
                                                    {otherPl.squadCode && (
                                                      <span className="ml-1.5 px-1.5 py-0.2 text-[8px] bg-indigo-50 border border-indigo-100 rounded font-extrabold text-indigo-600 inline-block shrink-0">
                                                        Squad {otherPl.squadCode}
                                                      </span>
                                                    )}
                                                  </span>
                                                  <span className="shrink-0 text-[8px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                                                    {otherPl.teamName}
                                                  </span>
                                                </button>
                                              ))}
                                              {otherPlayers.length === 0 && (
                                                <p className="text-[10px] text-slate-400 italic text-center py-2 font-semibold font-mono">No other players found.</p>
                                              )}
                                            </div>

                                            {/* Explaining the function when cursor points at the bottom of the dropdown */}
                                            <div className="mt-2 text-center border-t border-slate-100 pt-2 flex justify-center relative group/help">
                                              <span className="text-[9px] text-slate-400 hover:text-slate-650 cursor-help underline decoration-dotted flex items-center gap-1 font-bold leading-none py-1.5">
                                                ❓ Swapping Single Squad Members?
                                              </span>
                                              
                                              {/* Help pop-up window */}
                                              <div className="absolute bottom-6 left-0 right-0 mx-auto w-56 bg-slate-900 text-slate-100 p-2.5 rounded shadow-xl text-[9px] font-medium leading-normal hidden group-hover/help:block z-50 border border-slate-800 text-left">
                                                <p className="font-bold text-yellow-400 mb-0.5">💡 Swapping Guide:</p>
                                                Selecting a different player from this list swaps their respective spots between teams. It does not alter your team queues, allowing you to easily adjust single members or squads!
                                              </div>
                                            </div>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </span>
                                {!isPlEditing && (
                                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 bg-slate-50 pl-1 z-10">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); startEditing(teamA.id, player); }} 
                                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition"
                                      title="Rename player"
                                    >
                                      <Edit2 size={10} />
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); onDropPlayer(player.id); }} 
                                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                                      title="Drop one person (not playing today)"
                                    >
                                      <UserX size={10} />
                                    </button>
                                    {player.squadCode && (
                                      <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onDropSquad(player.squadCode!); }} 
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                        title={`Drop entire Squad ${player.squadCode} (not playing today)`}
                                      >
                                        <Users size={10} />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-250 bg-slate-50/50 rounded-lg p-6 flex flex-col items-center justify-center text-center text-xs text-slate-400 font-medium">
                      Waiting for Team (Slot A)...
                    </div>
                  )}

                  {/* Team B (Right side) */}
                  {teamB ? (
                    <div className="bg-white border border-slate-150 rounded-lg p-3 shadow-2xs flex flex-col justify-between">
                      <div>
                        {/* Team header containing controls */}
                        <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-slate-100">
                          <span className="text-xs font-bold text-slate-800 font-mono">{teamB.name}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onRotateTeamToBack(teamB.id)}
                              className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 rounded text-[9px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                              title="Move entire team intact to the back of the queue (Keep same team)"
                            >
                              🔄 Requeue Team
                            </button>
                            <button
                              type="button"
                              onClick={() => onRequeuePlayers(teamB.id)}
                              className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 rounded text-[9px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                              title="Disband team and move all players individually to wait queue (Current rules)"
                            >
                              👥 Requeue Players
                            </button>
                            <button
                              type="button"
                              onClick={() => onFillTeam(teamB.id)}
                              className="px-2 py-0.5 bg-green-50 hover:bg-green-100 text-green-600 hover:text-green-700 rounded text-[9px] font-bold transition-all flex items-center gap-1 cursor-pointer font-sans"
                              title="Fill active team to standard team size from wait queue or new players"
                            >
                              ➕ Fill Team
                            </button>
                            <button
                              onClick={() => onDeleteTeam(teamB.id)}
                              className="p-1 text-slate-400 hover:text-red-500 rounded transition"
                              title="Trash team"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                        
                        {/* Players list top to bottom */}
                        <div className="flex flex-col gap-1.5">
                          {teamB.players.map((player) => {
                            const isPlEditing = editingPlayer?.teamId === teamB.id && editingPlayer?.playerId === player.id;
                            const allCurrentPlayers = teams.flatMap((t) => 
                              t.players.map((p) => ({
                                ...p,
                                teamId: t.id,
                                teamName: t.name
                              }))
                            );
                            const otherPlayers = allCurrentPlayers.filter((p) => p.id !== player.id);

                            return (
                              <div key={player.id} className="text-xs text-slate-600 flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded relative group">
                                <span className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="font-mono bg-slate-200 text-slate-700 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0">{player.initials}</span>
                                  {isPlEditing ? (
                                    <input
                                      type="text"
                                      value={tempName}
                                      onChange={(e) => setTempName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveName();
                                        if (e.key === 'Escape') cancelSave();
                                      }}
                                      className="w-full px-1 border border-blue-400 rounded focus:outline-none"
                                      autoFocus
                                    />
                                  ) : (
                                    <div className="relative inline-block text-left min-w-0 flex-1 player-swap-dropdown-container">
                                      <span 
                                        className={`truncate hover:bg-slate-100 rounded px-1.5 -mx-1.5 py-0.5 cursor-pointer font-semibold flex items-center gap-1 ${player.color || 'text-slate-700 hover:text-blue-600'}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActivePlayerSelectorId(player.id);
                                        }}
                                        title="Click to change player or rename"
                                      >
                                        <span className="truncate">{player.name}</span>
                                        <span className="text-[8px] text-slate-400 shrink-0">▼</span>
                                        {player.squadCode && (
                                          <span className="shrink-0 ml-1.5 px-1 py-0.2 text-[8px] font-bold bg-indigo-50 border border-indigo-100 rounded text-indigo-600 inline-block font-sans">
                                            Squad {player.squadCode}
                                          </span>
                                        )}
                                      </span>

                                      {activePlayerSelectorId === player.id && (
                                        <>
                                          <div className="absolute left-0 mt-1.5 w-64 bg-white border border-slate-200 text-slate-800 rounded-lg shadow-xl p-3.5 z-50 text-wrap">
                                            <div className="font-bold text-slate-900 mb-2 pb-1.5 border-b border-slate-100 flex justify-between items-center">
                                              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-sans">Swap Player Spot</span>
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setActivePlayerSelectorId(null);
                                                  startEditing(teamB.id, player);
                                                }}
                                                className="bg-blue-50 text-blue-600 hover:text-blue-700 hover:bg-blue-100 px-2 py-1 rounded font-bold font-sans transition-all flex items-center gap-1 cursor-pointer text-[10px]"
                                              >
                                                ✏️ Edit Spelling
                                              </button>
                                            </div>
                                            
                                            <div className="max-h-44 overflow-y-auto space-y-1 pr-1 font-sans">
                                              {otherPlayers.map((otherPl) => (
                                                <button
                                                  key={otherPl.id}
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onSwapPlayers) onSwapPlayers(player.id, otherPl.id);
                                                    setActivePlayerSelectorId(null);
                                                  }}
                                                  className="w-full text-left p-1.5 hover:bg-slate-50 rounded-md transition flex justify-between items-center gap-2 group/item cursor-pointer text-slate-700 hover:text-slate-900"
                                                >
                                                  <span className={`font-semibold truncate text-[11px] ${otherPl.color || 'text-slate-800 group-hover/item:text-blue-600'}`}>
                                                    {otherPl.name}
                                                    {otherPl.squadCode && (
                                                      <span className="ml-1.5 px-1.5 py-0.2 text-[8px] bg-indigo-50 border border-indigo-100 rounded font-extrabold text-indigo-600 inline-block shrink-0">
                                                        Squad {otherPl.squadCode}
                                                      </span>
                                                    )}
                                                  </span>
                                                  <span className="shrink-0 text-[8px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                                                    {otherPl.teamName}
                                                  </span>
                                                </button>
                                              ))}
                                              {otherPlayers.length === 0 && (
                                                <p className="text-[10px] text-slate-400 italic text-center py-2 font-semibold font-mono">No other players found.</p>
                                              )}
                                            </div>

                                            {/* Explaining the function when cursor points at the bottom of the dropdown */}
                                            <div className="mt-2 text-center border-t border-slate-100 pt-2 flex justify-center relative group/help">
                                              <span className="text-[9px] text-slate-400 hover:text-slate-650 cursor-help underline decoration-dotted flex items-center gap-1 font-bold leading-none py-1.5">
                                                ❓ Swapping Single Squad Members?
                                              </span>
                                              
                                              {/* Help pop-up window */}
                                              <div className="absolute bottom-6 left-0 right-0 mx-auto w-56 bg-slate-900 text-slate-100 p-2.5 rounded shadow-xl text-[9px] font-medium leading-normal hidden group-hover/help:block z-50 border border-slate-800 text-left">
                                                <p className="font-bold text-yellow-400 mb-0.5">💡 Swapping Guide:</p>
                                                Selecting a different player from this list swaps their respective spots between teams. It does not alter your team queues, allowing you to easily adjust single members or squads!
                                              </div>
                                            </div>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </span>
                                {!isPlEditing && (
                                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 bg-slate-50 pl-1 z-10">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); startEditing(teamB.id, player); }} 
                                      className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition"
                                      title="Rename player"
                                    >
                                      <Edit2 size={10} />
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); onDropPlayer(player.id); }} 
                                      className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                                      title="Drop one person (not playing today)"
                                    >
                                      <UserX size={10} />
                                    </button>
                                    {player.squadCode && (
                                      <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); onDropSquad(player.squadCode!); }} 
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                        title={`Drop entire Squad ${player.squadCode} (not playing today)`}
                                      >
                                        <Users size={10} />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-250 bg-slate-50/50 rounded-lg p-6 flex flex-col items-center justify-center text-center text-xs text-slate-400 font-medium">
                      Waiting for Team (Slot B)...
                    </div>
                  )}
                </div>

                {/* Winner staying queue controller bar */}
                {teamA && teamB && (
                  <div className="mt-4 pt-3.5 border-t border-slate-155 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200/80 shadow-3xs">
                    <div className="text-left">
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                        🏆 Record Match Results
                      </span>
                      <p className="text-[10px] text-slate-500 mt-0.5 font-medium leading-normal">
                        Click the winning team. Winner stays on Court {courtNum}, and loser rotates to back of waiting lists!
                      </p>
                      
                      {/* Interactive help tooltip at the bottom of the card */}
                      <div className="relative group/court-help inline-block mt-2">
                        <span className="text-[9px] text-blue-600 hover:text-blue-700 cursor-help underline decoration-dotted flex items-center gap-1 font-bold font-sans">
                          ℹ️ Want to pick single people in a squad?
                        </span>
                        {/* Mini help pop-up window explaining the feature */}
                        <div className="absolute bottom-5 left-0 w-64 bg-slate-900 text-slate-100 p-3 rounded-lg shadow-xl text-[10px] font-medium leading-normal hidden group-hover/court-help:block z-50 border border-slate-800 text-left">
                          <p className="font-bold text-yellow-400 mb-1">💡 Swap Squad Members Directly:</p>
                          Simply click on any player name above. A dropdown list of all session players will appear, allowing you to interchange their team spots without altering any waiting queue positions!
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto shrink-0">
                      <button 
                        onClick={() => onRecordMatchResult(courtNum, teamA, teamB, 'A')}
                        className="flex-1 sm:flex-none px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        👈 {teamA.name} Won
                      </button>
                      <button 
                        onClick={() => onRecordMatchResult(courtNum, teamA, teamB, 'B')}
                        className="flex-1 sm:flex-none px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        {teamB.name} Won 👉
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. WAITING TEAM QUEUE LOBBY */}
      <div id="waiting-lobby" className="space-y-4">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-400"></span>
          Waiting Queue Lobby
        </h2>

        <div className="space-y-3">
          {waitingTeams.length === 0 ? (
            <div 
              id="empty-lobby-alert" 
              className="flex flex-col items-center justify-center p-8 bg-white border border-dashed border-slate-205 rounded-lg text-center"
            >
              <ClipboardList size={32} className="text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-500">No teams waiting in queue currently.</p>
              <p className="text-[10px] text-slate-400 mt-0.5">They will appear here once courts are filled.</p>
            </div>
          ) : (
            waitingTeams.map((team, wIdx) => {
              const globalIdx = activeThreshold + wIdx;

              return (
                <div
                  key={team.id}
                  id={`team-card-${team.id}`}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-3 transition hover:shadow-2xs"
                >
                  {/* Lobby item header */}
                  <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                        Wait #{wIdx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-700 font-mono">{team.name}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Move Up */}
                      <button
                        onClick={() => handleMoveUpWaiting(wIdx)}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
                        title="Move Up"
                      >
                        <ChevronUp size={13} />
                      </button>

                      {/* Move Down */}
                      <button
                        onClick={() => handleMoveDownWaiting(wIdx)}
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
                        title="Move Down"
                      >
                        <ChevronDown size={13} />
                      </button>

                      {/* Rotate to bottom */}
                      <button
                        onClick={() => onRotateTeamToBack(team.id)}
                        className="p-1 text-slate-400 hover:text-blue-500 hover:bg-slate-100 rounded transition"
                        title="Rotate to bottom of queue"
                      >
                        <RotateCcw size={12} />
                      </button>

                      <div className="w-[1px] h-3 bg-slate-200 mx-1"></div>

                      {/* Trash */}
                      <button
                        onClick={() => onDeleteTeam(team.id)}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded transition"
                        title="Remove team"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Players list */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {team.players.map((player) => {
                      const isPlEditing = editingPlayer?.teamId === team.id && editingPlayer?.playerId === player.id;
                      const allCurrentPlayers = teams.flatMap((t) => 
                        t.players.map((p) => ({
                          ...p,
                          teamId: t.id,
                          teamName: t.name
                        }))
                      );
                      const otherPlayers = allCurrentPlayers.filter((p) => p.id !== player.id);

                      return (
                        <div key={player.id} className="text-xs text-slate-600 flex items-center justify-between bg-slate-50 px-2.5 py-1.5 rounded relative group">
                          <span className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="font-mono bg-slate-200 text-slate-700 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shrink-0">{player.initials}</span>
                            {isPlEditing ? (
                              <input
                                type="text"
                                value={tempName}
                                onChange={(e) => setTempName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveName();
                                  if (e.key === 'Escape') cancelSave();
                                }}
                                className="w-full px-1 border border-blue-400 rounded focus:outline-none"
                                autoFocus
                              />
                            ) : (
                              <div className="relative inline-block text-left min-w-0 flex-1 player-swap-dropdown-container">
                                <span 
                                  className={`truncate hover:bg-slate-100 rounded px-1.5 -mx-1.5 py-0.5 cursor-pointer font-semibold flex items-center gap-1 ${player.color || 'text-slate-700 hover:text-blue-600'}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActivePlayerSelectorId(player.id);
                                  }}
                                  title="Click to change player or rename"
                                >
                                  <span className="truncate">{player.name}</span>
                                  <span className="text-[8px] text-slate-400 shrink-0">▼</span>
                                  {player.squadCode && (
                                    <span className="shrink-0 ml-1.5 px-1 py-0.2 text-[8px] font-bold bg-indigo-50 border border-indigo-100 rounded text-indigo-600 inline-block font-sans">
                                      Squad {player.squadCode}
                                    </span>
                                  )}
                                </span>

                                {activePlayerSelectorId === player.id && (
                                  <>
                                    <div className="absolute left-0 mt-1.5 w-64 bg-white border border-slate-200 text-slate-800 rounded-lg shadow-xl p-3.5 z-50 text-wrap">
                                      <div className="font-bold text-slate-900 mb-2 pb-1.5 border-b border-slate-100 flex justify-between items-center">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-sans">Swap Player Spot</span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActivePlayerSelectorId(null);
                                            startEditing(team.id, player);
                                          }}
                                          className="bg-blue-50 text-blue-600 hover:text-blue-700 hover:bg-blue-100 px-2 py-1 rounded font-bold font-sans transition-all flex items-center gap-1 cursor-pointer text-[10px]"
                                        >
                                          ✏️ Edit Spelling
                                        </button>
                                      </div>
                                      
                                      <div className="max-h-44 overflow-y-auto space-y-1 pr-1 font-sans">
                                        {otherPlayers.map((otherPl) => (
                                          <button
                                            key={otherPl.id}
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (onSwapPlayers) onSwapPlayers(player.id, otherPl.id);
                                              setActivePlayerSelectorId(null);
                                            }}
                                            className="w-full text-left p-1.5 hover:bg-slate-50 rounded-md transition flex justify-between items-center gap-2 group/item cursor-pointer text-slate-700 hover:text-slate-900"
                                          >
                                            <span className={`font-semibold truncate text-[11px] ${otherPl.color || 'text-slate-800 group-hover/item:text-blue-600'}`}>
                                              {otherPl.name}
                                              {otherPl.squadCode && (
                                                <span className="ml-1.5 px-1.5 py-0.2 text-[8px] bg-indigo-50 border border-indigo-100 rounded font-extrabold text-indigo-600 inline-block shrink-0">
                                                  Squad {otherPl.squadCode}
                                                </span>
                                              )}
                                            </span>
                                            <span className="shrink-0 text-[8px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                                              {otherPl.teamName}
                                            </span>
                                          </button>
                                        ))}
                                        {otherPlayers.length === 0 && (
                                          <p className="text-[10px] text-slate-400 italic text-center py-2 font-semibold font-mono">No other players found.</p>
                                        )}
                                      </div>

                                      {/* Explaining the function when cursor points at the bottom of the dropdown */}
                                      <div className="mt-2 text-center border-t border-slate-100 pt-2 flex justify-center relative group/help">
                                        <span className="text-[9px] text-slate-400 hover:text-slate-650 cursor-help underline decoration-dotted flex items-center gap-1 font-bold leading-none py-1.5">
                                          ❓ Swapping Single Squad Members?
                                        </span>
                                        
                                        {/* Help pop-up window */}
                                        <div className="absolute bottom-6 left-0 right-0 mx-auto w-56 bg-slate-900 text-slate-100 p-2.5 rounded shadow-xl text-[9px] font-medium leading-normal hidden group-hover/help:block z-50 border border-slate-800 text-left">
                                          <p className="font-bold text-yellow-400 mb-0.5">💡 Swapping Guide:</p>
                                          Selecting a different player from this list swaps their respective spots between teams. It does not alter your team queues, allowing you to easily adjust single members or squads!
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </span>
                          {!isPlEditing && (
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 bg-slate-50 pl-1 z-10">
                              <button 
                                onClick={(e) => { e.stopPropagation(); startEditing(team.id, player); }} 
                                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded transition"
                                title="Rename player"
                              >
                                <Edit2 size={10} />
                              </button>
                              <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onDropPlayer(player.id); }} 
                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                                title="Drop one person (not playing today)"
                              >
                                <UserX size={10} />
                              </button>
                              {player.squadCode && (
                                <button 
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); onDropSquad(player.squadCode!); }} 
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                  title={`Drop entire Squad ${player.squadCode} (not playing today)`}
                                >
                                  <Users size={10} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}

          {/* Quick Add Team button */}
          <button
            id="btn-add-new-team-dashed"
            onClick={onAddQuickTeam}
            className="w-full h-11 border border-dashed border-slate-300 hover:border-slate-400 rounded-lg flex items-center justify-center space-x-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition cursor-pointer mt-2"
          >
            <span className="text-xs font-semibold">+ Add Random Wait Team</span>
          </button>
        </div>
      </div>
    </div>
  );
}
