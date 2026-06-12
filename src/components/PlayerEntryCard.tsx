/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, UserPlus, Sparkles } from 'lucide-react';
import { RANDOM_PLAYER_NAMES } from '../utils';

interface PlayerEntryCardProps {
  teamSize: number;
  onAddTeam: (names: string[]) => void;
}

export default function PlayerEntryCard({ teamSize, onAddTeam }: PlayerEntryCardProps) {
  // Store an array of player names, starting with 1 slot
  const [names, setNames] = useState<string[]>(['']);

  // Sync state whenever teamSize changes: make sure the list of slots doesn't exceed the new teamSize
  useEffect(() => {
    setNames((prev) => {
      if (prev.length > teamSize) {
        return prev.slice(0, teamSize);
      }
      return prev;
    });
  }, [teamSize]);

  // Handle individual input changes
  const handleNameChange = (index: number, val: string) => {
    const updated = [...names];
    updated[index] = val;
    setNames(updated);
  };

  // Select a random name for a specific line
  const handleRandomizeSingle = (index: number) => {
    const randomName = RANDOM_PLAYER_NAMES[Math.floor(Math.random() * RANDOM_PLAYER_NAMES.length)];
    const updated = [...names];
    updated[index] = randomName;
    setNames(updated);
  };

  // Rapidly randomized name set for the entire team
  const handleRandomizeAll = () => {
    const updated = names.map(() => {
      return RANDOM_PLAYER_NAMES[Math.floor(Math.random() * RANDOM_PLAYER_NAMES.length)];
    });
    setNames(updated);
  };

  // Add a new empty player input slot up to team size
  const handleAddSlot = () => {
    if (names.length < teamSize) {
      setNames((prev) => [...prev, '']);
    }
  };

  // Remove an individual player input slot
  const handleRemoveSlot = (index: number) => {
    if (names.length > 1) {
      setNames((prev) => prev.filter((_, i) => i !== index));
    }
  };

  // Submit the entered group of players
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Extract non-empty names actually entered by the user
    const actualNames = names.map((name) => name.trim()).filter((name) => name !== '');

    if (actualNames.length === 0) {
      return;
    }

    onAddTeam(actualNames);

    // Reset fields back to exactly one empty slot
    setNames(['']);
  };

  return (
    <div 
      id="player-entry-card" 
      className="bg-white border border-slate-200 rounded-lg p-6 w-full mt-6"
    >
      {/* Header section of Player Entry (Layout matching Match Lobby) */}
      <div id="entry-header-row" className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h1 id="entry-card-title" className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Player Entry
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-1">If you want to be on the same team, please send them together.</p>
        </div>
        
        <button
          id="btn-shuffle-all"
          type="button"
          onClick={handleRandomizeAll}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-100 cursor-pointer"
          title="Fills all spots with random test names"
        >
          <Sparkles size={14} className="text-blue-500" />
          <span>Auto Fill</span>
        </button>
      </div>

      <form id="player-entry-form" onSubmit={handleSubmit} className="space-y-4 mt-6">
        <div id="player-inputs-container" className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {names.map((name, index) => (
            <div key={index} className="relative flex items-center group">
              <div className="absolute left-3.5 text-slate-400">
                <User size={16} />
              </div>
              <input
                id={`input-player-${index + 1}`}
                type="text"
                value={name}
                onChange={(e) => handleNameChange(index, e.target.value)}
                placeholder={`Player ${index + 1} Name...`}
                className="w-full pl-10 pr-20 py-3 bg-[#f8fafc] border border-slate-200 rounded text-slate-800 text-sm focus:outline-none focus:border-blue-500 font-sans transition-all duration-200"
              />
              
              <div className="absolute right-3.5 flex items-center gap-2">
                <button
                  id={`btn-random-${index + 1}`}
                  type="button"
                  onClick={() => handleRandomizeSingle(index)}
                  className="text-xs text-slate-400 hover:text-blue-600 font-bold transition-all duration-200"
                  title="Roll a random name"
                >
                  🎲
                </button>
                {names.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSlot(index)}
                    className="text-xs text-slate-400 hover:text-red-500 font-bold transition-all duration-200"
                    title="Remove slot"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {names.length < teamSize && (
          <button
            id="btn-add-player-slot"
            type="button"
            onClick={handleAddSlot}
            className="w-full py-2.5 border border-dashed border-slate-300 hover:border-slate-400 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <span>+ Add Player Slot (Max {teamSize})</span>
          </button>
        )}

        <button
          id="btn-bulk-add-team"
          type="submit"
          className="w-full flex items-center justify-center gap-2 bg-[#0f172a] hover:bg-[#1e293b] text-white py-3.5 px-4 rounded text-sm font-semibold transition-all duration-200 cursor-pointer shadow-sm hover:shadow active:scale-[0.98]"
        >
          <UserPlus size={16} />
          Bulk Add Team
        </button>
      </form>
    </div>
  );
}
