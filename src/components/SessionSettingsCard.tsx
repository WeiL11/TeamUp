/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Session } from '../types';

interface SessionSettingsCardProps {
  session: Session;
  onChange: (updated: Partial<Session>) => void;
  onSave?: () => void;
}

export default function SessionSettingsCard({ session, onChange, onSave }: SessionSettingsCardProps) {
  return (
    <div 
      id="session-settings-card" 
      className="bg-white border border-slate-200 rounded-lg p-6 w-full"
    >
      <h2 id="settings-card-title" className="text-lg font-bold text-slate-900 tracking-tight mb-5">
        Session Settings
      </h2>

      <div className="space-y-4">
        {/* Game Name */}
        <div>
          <label 
            id="label-game-name" 
            className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2"
          >
            Game Name
          </label>
          <input
            id="input-game-name"
            type="text"
            value={session.gameName}
            onChange={(e) => onChange({ gameName: e.target.value })}
            placeholder="e.g. Basketball, Soccer, Volleyball"
            className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded text-slate-800 text-sm focus:outline-none focus:border-blue-500 font-sans transition-all duration-200"
          />
        </div>

        {/* Game Detail */}
        <div>
          <label 
            id="label-game-detail" 
            className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2"
          >
            Game Detail
          </label>
          <input
            id="input-game-detail"
            type="text"
            value={session.gameDetail}
            onChange={(e) => onChange({ gameDetail: e.target.value })}
            placeholder="e.g. Court 3, 5:00 PM"
            className="w-full px-4 py-3 bg-[#f8fafc] border border-slate-200 rounded text-slate-800 text-sm focus:outline-none focus:border-blue-500 font-sans transition-all duration-200"
          />
        </div>

        {/* Team Size Slider */}
        <div className="pt-2">
          <div className="flex justify-between items-center mb-2">
            <label 
              id="label-team-size" 
              className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider"
            >
              Team Size
            </label>
            <span 
              id="display-team-size" 
              className="bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 rounded border border-slate-200 font-mono"
            >
              {session.teamSize}
            </span>
          </div>
          
          <div className="relative mt-2 flex items-center">
            <input
              id="input-team-size-slider"
              type="range"
              min="1"
              max="12"
              step="1"
              value={session.teamSize}
              onChange={(e) => onChange({ teamSize: parseInt(e.target.value, 10) })}
              className="w-full custom-slider"
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-mono px-0.5">
            <span>1 Player</span>
            <span>3</span>
            <span>6</span>
            <span>9</span>
            <span>12 (Max)</span>
          </div>
        </div>

        {onSave && (
          <button
            id="btn-save-settings"
            type="button"
            onClick={onSave}
            className="w-full mt-2 bg-[#0f172a] hover:bg-slate-800 text-white font-semibold text-xs py-3 rounded transition-all cursor-pointer shadow-sm active:scale-[0.98]"
          >
            Lock & Apply Settings
          </button>
        )}
      </div>
    </div>
  );
}
