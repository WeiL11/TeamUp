/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Sparkles, HelpCircle } from 'lucide-react';
import { Session, Team } from '../types';
import { generateId, getInitials } from '../utils';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newSession: Session, initialTeams: Team[]) => void;
}

interface GamePreset {
  name: string;
  detail: string;
  defaultSize: number;
  emoji: string;
}

const PRESETS: GamePreset[] = [
  { name: 'Basketball at Rec Center', detail: 'Court 3, 5:00 PM (Winner stay 1)', defaultSize: 5, emoji: '🏀' },
  { name: 'Pickleball Duos at CC', detail: 'Court 1 (Winners Stay)', defaultSize: 2, emoji: '🏓' },
  { name: 'Volleyball Mixers', detail: 'Rec 16:00  (Winner stay 1)', defaultSize: 6, emoji: '🏐' },
  { name: '3 vs 3 All level Friendly Soccer', detail: '18:00, Field 1, Goal-posts Only', defaultSize: 3, emoji: '⚽' }
];

export default function CreateSessionModal({ isOpen, onClose, onSubmit }: CreateSessionModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<number>(0);
  const [customName, setCustomName] = useState<string>('');
  const [customDetail, setCustomDetail] = useState<string>('');
  const [teamSize, setTeamSize] = useState<number>(5);
  const [populateDemoData, setPopulateDemoData] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const preset = PRESETS[selectedPreset];
    const finalSession: Session = {
      gameName: customName.trim() || preset.name,
      gameDetail: customDetail.trim() || preset.detail,
      teamSize: teamSize
    };

    let generatedTeams: Team[] = [];

    if (populateDemoData) {
      if (teamSize === 2) {
        // Matches the screenshot mockup exactly
        generatedTeams = [
          {
            id: 'team-' + generateId(),
            name: 'Team 1',
            status: 'active',
            createdAt: Date.now() - 60000,
            players: [
              { id: 'p1', name: 'Jordan Smith', initials: 'JS' },
              { id: 'p2', name: 'Alex Kim', initials: 'AK' }
            ]
          },
          {
            id: 'team-' + generateId(),
            name: 'Team 2',
            status: 'waiting',
            createdAt: Date.now(),
            players: [
              { id: 'p3', name: 'Taylor Cruz', initials: 'TC' },
              { id: 'p4', name: 'Riley Jones', initials: 'RJ' }
            ]
          }
        ];
      } else {
        // Create generic players fitting the target team size
        const firstTeamPlayers = Array.from({ length: teamSize }).map((_, i) => {
          const names = ['Jordan Smith', 'Alex Kim', 'Taylor Cruz', 'Riley Jones', 'Chris Evans', 'Morgan Stanley'];
          const n = names[i % names.length] + ` ${String.fromCharCode(65 + i)}`;
          return { id: 'p-f' + i, name: n, initials: getInitials(n) };
        });

        const secondTeamPlayers = Array.from({ length: teamSize }).map((_, i) => {
          const names = ['Sam Parker', 'Jamie Foxx', 'Pat Riley', 'Riley Jones', 'Alex Rivera', 'Tracy Chapman'];
          const n = names[i % names.length] + ` ${String.fromCharCode(71 + i)}`;
          return { id: 'p-s' + i, name: n, initials: getInitials(n) };
        });

        generatedTeams = [
          {
            id: 'team-' + generateId(),
            name: 'Team Alpha',
            status: 'active',
            createdAt: Date.now() - 10000,
            players: firstTeamPlayers
          },
          {
            id: 'team-' + generateId(),
            name: 'Team Bravo',
            status: 'waiting',
            createdAt: Date.now(),
            players: secondTeamPlayers
          }
        ];
      }
    }

    onSubmit(finalSession, generatedTeams);
    onClose();
  };

  const handleSelectPreset = (idx: number) => {
    setSelectedPreset(idx);
    const preset = PRESETS[idx];
    setCustomName(preset.name);
    setCustomDetail(preset.detail);
    setTeamSize(preset.defaultSize);
  };

  return (
    <div 
      id="create-session-modal" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
    >
      <div 
        id="modal-box" 
        className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div id="modal-header" className="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-800">Start New Teaming Session</h3>
            <p className="text-xs text-slate-500">Configure game settings & join lobbies</p>
          </div>
          <button 
            id="btn-close-modal" 
            onClick={onClose} 
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Preset Buttons */}
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Quick Sport Presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  id={`preset-${idx}`}
                  type="button"
                  onClick={() => handleSelectPreset(idx)}
                  className={`px-3 py-2.5 rounded text-left border transition-all text-xs flex items-center gap-2 ${
                    selectedPreset === idx
                      ? 'bg-blue-50 border-blue-400 text-blue-900 font-semibold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <span className="text-base">{preset.emoji}</span>
                  <span className="truncate">{preset.name.split(' at ')[0].split(' Friendly')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3.5">
            {/* Custom fields */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Display Title
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Game Name"
                className="w-full px-3 py-2 bg-[#f8fafc] border border-slate-200 rounded text-slate-800 text-xs focus:outline-none focus:border-blue-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Details (location, time, or type).
              </label>
              <input
                type="text"
                value={customDetail}
                onChange={(e) => setCustomDetail(e.target.value)}
                placeholder="Details"
                className="w-full px-3 py-2 bg-[#f8fafc] border border-slate-200 rounded text-slate-800 text-xs focus:outline-none focus:border-blue-500 font-sans"
              />
            </div>

            <div className="pt-2">
              <div className="flex justify-between items-center mb-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Roster Team Size
                  </label>
                  <span className="text-[11px] text-slate-500 block">Number of players per queue group</span>
                </div>
                <span 
                  id="modal-display-team-size" 
                  className="bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 rounded border border-slate-200 font-mono"
                >
                  {teamSize}
                </span>
              </div>
              
              <div className="relative mt-2 flex items-center">
                <input
                  id="modal-input-team-size-slider"
                  type="range"
                  min="1"
                  max="12"
                  step="1"
                  value={teamSize}
                  onChange={(e) => setTeamSize(parseInt(e.target.value, 10))}
                  className="w-full custom-slider"
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono px-0.5">
                <span>1 Player</span>
                <span>3</span>
                <span>6</span>
                <span>9</span>
                <span>12 (Max)</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
            <button
              id="btn-cancel-create"
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold select-none cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-create"
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Sparkles size={13} />
              Spawn Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
