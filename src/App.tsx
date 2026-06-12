/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Trash2, 
  FolderSync, 
  History, 
  Play, 
  HelpCircle,
  PlusCircle,
  ListRestart,
  Download,
  Trophy,
  QrCode
} from 'lucide-react';
import { Session, Team, Player, GameRecord } from './types';
import { 
  getInitials, 
  generateId, 
  defaultTeams, 
  RANDOM_PLAYER_NAMES,
  GROUP_COLORS
} from './utils';

// Import our cohesive modular components
import SessionSettingsCard from './components/SessionSettingsCard';
import PlayerEntryCard from './components/PlayerEntryCard';
import TeamQueueView from './components/TeamQueueView';
import CreateSessionModal from './components/CreateSessionModal';

export default function App() {
  // State for session settings
  const [session, setSession] = useState<Session>({
    gameName: 'Basketball at Rec Center',
    gameDetail: 'Court 3, 5:00 PM (Winner stay 1)',
    teamSize: 5
  });

  // State for roster queue list of Teams
  const [teams, setTeams] = useState<Team[]>(defaultTeams);

  // State for recording and preserving Today's Game History
  const [gameHistory, setGameHistory] = useState<GameRecord[]>([]);

  // Toggle layout between matches played list and player/squad win rates leaderboard
  const [historyView, setHistoryView] = useState<'matches' | 'leaderboard' | 'roster'>('matches');

  // Modal dialog open/closed state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // QR Code popover visibility state
  const [showQrPopover, setShowQrPopover] = useState<boolean>(false);

  // Manage sessions settings editing state inside left rail
  const [isEditingSession, setIsEditingSession] = useState<boolean>(false);

  // Quick system notification toast messages
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Auto-clear toast after delay
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Dynamic UTC live clock state and update action
  const [utcTime, setUtcTime] = useState<string>('2026-06-11 19:10');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = String(now.getUTCMonth() + 1).padStart(2, '0');
      const day = String(now.getUTCDate()).padStart(2, '0');
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      setUtcTime(`${year}-${month}-${day} ${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // State for active courts count (2 teams per court)
  const [courtCount, setCourtCount] = useState<number>(1);

  // Fetch initial data from backend
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(data => {
        if (data.session) setSession(data.session);
        if (data.teams) setTeams(data.teams);
        if (data.gameHistory) setGameHistory(data.gameHistory);
        if (data.courtCount) setCourtCount(data.courtCount);
        setIsDataLoaded(true);
      })
      .catch(err => console.error('Failed to load data from backend:', err));
  }, []);

  // Persist edits to backend
  useEffect(() => {
    if (!isDataLoaded) return;
    
    fetch('/api/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session,
        teams,
        gameHistory,
        courtCount
      })
    }).catch(err => console.error('Failed to save data to backend:', err));
  }, [session, teams, gameHistory, courtCount, isDataLoaded]);

  // Synchronously repack all players into teams of the new size whenever standard team size changes
  useEffect(() => {
    const N = session.teamSize;
    if (teams.length === 0) return;

    // Gather all players from the entire roster queue in their current sequence
    const allPlayers = teams.flatMap((t) => t.players);
    if (allPlayers.length === 0) return;

    // Re-pack into teams of size N, preserving sequence
    const newTeams: Team[] = [];
    for (let i = 0; i < allPlayers.length; i += N) {
      const chunk = allPlayers.slice(i, i + N);
      const teamIdx = newTeams.length + 1;
      newTeams.push({
        id: 'team-' + generateId() + '-' + teamIdx,
        name: `Team ${teamIdx}`,
        players: chunk,
        status: 'waiting',
        createdAt: Date.now() + teamIdx
      });
    }

    setTeams(newTeams);
  }, [session.teamSize]);

  // Court count alteration handlers
  const handleIncreaseCourts = () => {
    setCourtCount((prev) => prev + 1);
    notify('Added an active court lobby!', 'success');
  };

  const handleDecreaseCourts = () => {
    setCourtCount((prev) => {
      if (prev <= 1) return 1;
      return prev - 1;
    });
    notify('Removed a court lobby.', 'info');
  };

  // Disband team and requeue its players individually to the waiting list according to current rules
  const handleRequeuePlayers = (teamId: string) => {
    const teamToRequeue = teams.find((t) => t.id === teamId);
    if (!teamToRequeue) return;

    const playersToRequeue = [...teamToRequeue.players];
    const originalTeamName = teamToRequeue.name;

    setTeams((prev) => {
      // Find the index of the disbanded team
      const disbandedIdx = prev.findIndex((t) => t.id === teamId);
      if (disbandedIdx === -1) return prev;

      // Filter out this disbanded team
      let nextTeams = prev.filter((t) => t.id !== teamId);
      const N = session.teamSize;

      // Clean split of active vs waiting teams
      const activeThreshold = courtCount * 2;
      
      let activePart = nextTeams.slice(0, activeThreshold);
      let waitingPart = nextTeams.slice(activeThreshold);

      // If the disbanded team was on an active court (index < activeThreshold),
      // we must pull the first waiting team to take its slot!
      if (disbandedIdx < activeThreshold) {
        const waitingQueue = nextTeams.slice(activeThreshold);
        if (waitingQueue.length > 0) {
          const firstWaiting = waitingQueue[0];
          // Replace disbanded position with the first waiting team
          const rawActive = prev.slice(0, activeThreshold).map((t) => {
            if (t.id === teamId) {
              return firstWaiting;
            }
            return t;
          }).filter((t) => t.id !== teamId);

          activePart = rawActive;
          waitingPart = waitingQueue.slice(1);
          nextTeams = [...activePart, ...waitingPart];
        }
      }

      playersToRequeue.forEach((player) => {
        let addedToExisting = false;
        // Find existing custom waiting team that has slot open
        for (let i = 0; i < waitingPart.length; i++) {
          if (waitingPart[i].players.length < N) {
            // Update in nextTeams too
            const nextListIdx = nextTeams.findIndex(t => t.id === waitingPart[i].id);
            if (nextListIdx !== -1) {
              nextTeams[nextListIdx] = {
                ...nextTeams[nextListIdx],
                players: [...nextTeams[nextListIdx].players, player]
              };
              waitingPart[i] = nextTeams[nextListIdx];
              addedToExisting = true;
              break;
            }
          }
        }

        if (!addedToExisting) {
          // Spawn new waiting team for this player
          const nextTeamNumber = nextTeams.reduce((max, t) => {
            const match = t.name.match(/Team\s+(\d+)/);
            if (match) {
              const num = parseInt(match[1], 10);
              return num > max ? num : max;
            }
            return max;
          }, 0) + 1;

          const newTeam: Team = {
            id: 'team-' + generateId() + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            name: `Team ${nextTeamNumber}`,
            players: [player],
            status: 'waiting',
            createdAt: Date.now()
          };
          nextTeams.push(newTeam);
          waitingPart.push(newTeam);
        }
      });

      return nextTeams;
    });

    notify(`Disbanded ${originalTeamName} & queued players individually!`, 'info');
  };

  // Fill active team to the standard size by pulling waiting list players or auto-filling players
  const handleFillTeam = (teamId: string) => {
    let alreadyFull = false;

    setTeams((prev) => {
      const teamIdx = prev.findIndex((t) => t.id === teamId);
      if (teamIdx === -1) return prev;

      const targetTeam = prev[teamIdx];
      const needed = session.teamSize - targetTeam.players.length;
      if (needed <= 0) {
        alreadyFull = true;
        return prev;
      }

      let playersAcquired: Player[] = [];
      let remainingNeeded = needed;

      const nextTeams = [...prev];
      const activeThreshold = courtCount * 2;

      // 1. Gather all waiting list players across all waiting teams
      const waitingPart = nextTeams.slice(activeThreshold);
      const waitingPlayers: Player[] = waitingPart.flatMap((t) => t.players);

      // Group wait list players into cohesive blocks so squads are kept together
      const blocks: { type: 'squad' | 'individual'; key: string; players: Player[] }[] = [];
      const visited = new Set<string>();

      waitingPlayers.forEach((player) => {
        if (visited.has(player.id)) return;

        if (player.squadCode) {
          const squadPlayers = waitingPlayers.filter((p) => p.squadCode === player.squadCode);
          squadPlayers.forEach((p) => visited.add(p.id));
          blocks.push({
            type: 'squad',
            key: player.squadCode,
            players: squadPlayers
          });
        } else {
          visited.add(player.id);
          blocks.push({
            type: 'individual',
            key: player.id,
            players: [player]
          });
        }
      });

      const blocksSelected: typeof blocks = [];
      const blocksLeft: typeof blocks = [];

      blocks.forEach((block) => {
        if (remainingNeeded <= 0) {
          blocksLeft.push(block);
          return;
        }

        // To comply with squad integrity: either add single player or add the whole squad
        if (block.type === 'individual') {
          blocksSelected.push(block);
          remainingNeeded -= 1;
        } else {
          // It is a squad! Pull the whole squad intact to avoid separating them
          blocksSelected.push(block);
          remainingNeeded -= block.players.length;
        }
      });

      playersAcquired = blocksSelected.flatMap((b) => b.players);

      // Rebuild the waiting queue teams from blocksLeft, preserving blocks!
      const updatedWaitingTeams: Team[] = [];
      let currentNewTeamPlayers: Player[] = [];

      blocksLeft.forEach((block) => {
        if (currentNewTeamPlayers.length > 0 && currentNewTeamPlayers.length + block.players.length > session.teamSize) {
          updatedWaitingTeams.push({
            id: 'team-' + generateId() + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            name: 'Temp',
            players: currentNewTeamPlayers,
            status: 'waiting',
            createdAt: Date.now()
          });
          currentNewTeamPlayers = [];
        }
        currentNewTeamPlayers.push(...block.players);
      });

      if (currentNewTeamPlayers.length > 0) {
        updatedWaitingTeams.push({
          id: 'team-' + generateId() + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          name: 'Temp',
          players: currentNewTeamPlayers,
          status: 'waiting',
          createdAt: Date.now()
        });
      }

      // Re-assign name indices sequentially
      let nextTeamNum = 1;
      const finalWaiting = updatedWaitingTeams.map((team) => {
        return {
          ...team,
          name: `Team ${nextTeamNum++}`
        };
      });

      // 2. Generate random players if we still need more
      if (remainingNeeded > 0) {
        const existingNamesSet = new Set(
          [...nextTeams.slice(0, activeThreshold), ...finalWaiting].flatMap((t) => t.players.map((p) => p.name.trim().toLowerCase()))
        );

        for (let i = 0; i < remainingNeeded; i++) {
          const randomBase = RANDOM_PLAYER_NAMES[Math.floor(Math.random() * RANDOM_PLAYER_NAMES.length)];
          let resolvedName = randomBase;
          let counter = 2;
          while (existingNamesSet.has(resolvedName.toLowerCase())) {
            resolvedName = `${randomBase}${counter}`;
            counter++;
          }
          existingNamesSet.add(resolvedName.toLowerCase());

          const newPlayer: Player = {
            id: 'p-' + generateId() + '-' + Date.now() + '-' + i,
            name: resolvedName,
            initials: getInitials(resolvedName),
            color: GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)]
          };
          playersAcquired.push(newPlayer);
        }
      }

      // Set playersAcquired in the target team
      const finalTeams = nextTeams.map((t) => {
        if (t.id === teamId) {
          return {
            ...t,
            players: [...t.players, ...playersAcquired]
          };
        }
        return t;
      });

      const updatedActive = finalTeams.slice(0, activeThreshold);
      return [...updatedActive, ...finalWaiting];
    });

    if (alreadyFull) {
      notify('Team is already filled to standard size!', 'info');
    } else {
      notify('Team filled successfully!', 'success');
    }
  };

  // Drops a single player by ID
  const handleDropPlayer = (playerId: string) => {
    let droppedName = '';
    setTeams((prev) => {
      const activeThreshold = courtCount * 2;
      const nextList = prev.map((team) => {
        const isPlayerInTeam = team.players.some((p) => p.id === playerId);
        if (isPlayerInTeam) {
          const target = team.players.find((p) => p.id === playerId);
          if (target) droppedName = target.name;
        }
        return {
          ...team,
          players: team.players.filter((p) => p.id !== playerId)
        };
      });

      // Remove waiting queue teams that are now empty. Keep active courts so they can be "Filled".
      return nextList.filter((team, idx) => {
        if (idx < activeThreshold) return true; // keep on court
        return team.players.length > 0; // discard empty waiting teams
      });
    });
    if (droppedName) {
      notify(`Dropped player "${droppedName}" from the session.`, 'info');
    }
  };

  // Drops all players in a squad by squad code
  const handleDropSquad = (squadCode: string) => {
    setTeams((prev) => {
      const activeThreshold = courtCount * 2;
      const nextList = prev.map((team) => ({
        ...team,
        players: team.players.filter((p) => p.squadCode !== squadCode)
      }));

      // Remove waiting queue teams that are now empty. Keep active courts so they can be "Filled".
      return nextList.filter((team, idx) => {
        if (idx < activeThreshold) return true; // keep on court
        return team.players.length > 0; // discard empty waiting teams
      });
    });
    notify(`Dropped all players in Squad ${squadCode} from the session.`, 'info');
  };

  // Downloads Completed Game Play History as a CSV file
  const handleDownloadHistory = () => {
    if (gameHistory.length === 0) {
      notify("No game history to download yet!", "error");
      return;
    }

    const headers = [
      "Game Number",
      "Court",
      "Team A Name",
      "Team A Players",
      "Team B Name",
      "Team B Players",
      "Winner",
      "Date/Time"
    ];

    const rows = gameHistory.map((game) => {
      const playersA = game.teamA.players.map((p) => p.name).join(", ");
      const playersB = game.teamB.players.map((p) => p.name).join(", ");
      const winnerName = game.winnerSide === "A" ? game.teamA.name : game.teamB.name;
      const formattedDate = new Date(game.timestamp).toLocaleString();

      return [
        game.gameNumber,
        game.courtName || "N/A",
        game.teamA.name,
        playersA,
        game.teamB.name,
        playersB,
        winnerName,
        formattedDate
      ].map((val) => {
        const str = String(val ?? "").replace(/"/g, '""');
        return `"${str}"`;
      });
    });

    const csvContent = [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((row) => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const todayStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", url);
    link.setAttribute("download", `teamup_game_history_${todayStr}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    notify("Downloaded today's game play history successfully!", "success");
  };

  // Helper to compute leaderboard metrics on demand from match records
  const computeLeaderboardData = (history: GameRecord[]) => {
    const playerMap: Record<string, { name: string; wins: number; losses: number; squadCode?: string }> = {};

    history.forEach((game) => {
      const isWinnerA = game.winnerSide === 'A';
      
      // Team A players
      game.teamA.players.forEach((p) => {
        const key = p.name.trim();
        const lowerKey = key.toLowerCase();
        if (!playerMap[lowerKey]) {
          playerMap[lowerKey] = { name: p.name, wins: 0, losses: 0, squadCode: p.squadCode };
        }
        if (isWinnerA) {
          playerMap[lowerKey].wins += 1;
        } else {
          playerMap[lowerKey].losses += 1;
        }
      });

      // Team B players
      game.teamB.players.forEach((p) => {
        const key = p.name.trim();
        const lowerKey = key.toLowerCase();
        if (!playerMap[lowerKey]) {
          playerMap[lowerKey] = { name: p.name, wins: 0, losses: 0, squadCode: p.squadCode };
        }
        if (!isWinnerA) {
          playerMap[lowerKey].wins += 1;
        } else {
          playerMap[lowerKey].losses += 1;
        }
      });
    });

    const playerLeaders = Object.values(playerMap).sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      return a.losses - b.losses;
    });

    return { playerLeaders };
  };

  // Downloads Leaderboard stats as CSV
  const handleDownloadLeaderboard = () => {
    const { playerLeaders } = computeLeaderboardData(gameHistory);

    if (playerLeaders.length === 0) {
      notify("No leaderboard statistics to download yet!", "error");
      return;
    }

    let csvContent = "";

    // 1. Player Leaderboard
    csvContent += `"PLAYER LEADERBOARD (Sorted by Wins)"\n`;
    csvContent += `"Rank","Player Name","Squad","Wins","Losses","Total Matches","Win Rate %"\n`;
    playerLeaders.forEach((p, idx) => {
      const total = p.wins + p.losses;
      const rate = total > 0 ? Math.round((p.wins / total) * 100) : 0;
      csvContent += `"${idx + 1}","${p.name.replace(/"/g, '""')}","${p.squadCode ? `Squad ${p.squadCode}` : 'None'}","${p.wins}","${p.losses}","${total}","${rate}%"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const todayStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", url);
    link.setAttribute("download", `teamup_leaderboard_${todayStr}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    notify("Downloaded today's leaderboard stats successfully!", "success");
  };

  // Downloads Roster Queue as CSV
  const handleDownloadRoster = () => {
    if (teams.length === 0) {
      notify("Roster queue is currently empty!", "error");
      return;
    }

    const headers = [
      "Queue Position",
      "Team Name",
      "Game/Court Status",
      "Player Name",
      "Squad Code",
      "Player Stats (Wins)",
      "Player Stats (Losses)"
    ];

    const rows: string[][] = [];

    teams.forEach((team, tIdx) => {
      const gameIdx = Math.floor(tIdx / 2);
      const teamSide = tIdx % 2 === 0 ? "A" : "B";
      
      let statusStr = "";
      if (gameIdx < courtCount) {
        statusStr = `Active (Court ${gameIdx + 1}, Team ${teamSide})`;
      } else if (gameIdx === courtCount) {
        statusStr = `On Deck (Team ${teamSide})`;
      } else {
        statusStr = `In Queue (Team ${teamSide})`;
      }

      team.players.forEach((player) => {
        rows.push([
          String(tIdx + 1),
          team.name,
          statusStr,
          player.name,
          player.squadCode || "None",
          String(player.wins || 0),
          String(player.losses || 0)
        ].map((val) => {
          const str = String(val ?? "").replace(/"/g, '""');
          return `"${str}"`;
        }));
      });
    });

    const csvContent = [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((row) => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const todayStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", url);
    link.setAttribute("download", `teamup_roster_queue_${todayStr}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    notify("Downloaded live roster queue stats successfully!", "success");
  };

  // Clear completed game history separately with confirmation
  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear Today's Game History? This will remove all completed match records.")) {
      setGameHistory([]);
      notify("Game history cleared completely.", "info");
    }
  };

  // Show a message to user
  const notify = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
  };

  // Adjust session properties
  const handleSessionChange = (updated: Partial<Session>) => {
    setSession((prev) => ({ ...prev, ...updated }));
  };

  // Triggered when starting a brand new session from modal
  const handleCreateNewSession = (newSession: Session, initialTeams: Team[]) => {
    setSession(newSession);
    setTeams(initialTeams);
    setGameHistory([]);
    setIsEditingSession(false);
    notify(`Started new session: ${newSession.gameName}!`, 'success');
  };

  // Adding a new team from user text inputs
  const handleAddTeam = (playerNames: string[]) => {
    // 1. Filter out completely blank players entered by user
    const actualNames = playerNames.map(name => name.trim()).filter(name => name !== '');
    if (actualNames.length === 0) {
      notify('No valid player names were entered!', 'error');
      return;
    }

    // List of active/existing names in lower case
    const existingNamesSet = new Set(
      teams.flatMap((t) => t.players.map((p) => p.name.trim().toLowerCase()))
    );

    const renamedNotices: string[] = [];

    // Assign a matching color to groups wishing to play together
    const groupColor = actualNames.length > 1
      ? GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)]
      : undefined;

    // Resolve squadCode if multiple players register together (squad)
    let groupSquadCode: string | undefined = undefined;
    if (actualNames.length > 1) {
      let maxSquadNum = 0;
      teams.forEach((t) => {
        t.players.forEach((p) => {
          if (p.squadCode) {
            const num = parseInt(p.squadCode, 10);
            if (!isNaN(num) && num > maxSquadNum) {
              maxSquadNum = num;
            }
          }
        });
      });
      let nextSquadNum = maxSquadNum + 1;
      if (nextSquadNum > 99) {
        nextSquadNum = 1;
      }
      groupSquadCode = String(nextSquadNum);
    }

    // Create the new player objects with duplicate name resolution
    const newTeamPlayers: Player[] = actualNames.map((name, index) => {
      let resolvedName = name;
      let counter = 2;
      
      const lowerProposed = name.toLowerCase();
      if (existingNamesSet.has(lowerProposed)) {
        while (existingNamesSet.has(resolvedName.toLowerCase())) {
          resolvedName = `${name}${counter}`;
          counter++;
        }
        renamedNotices.push(`"${name}" changed to "${resolvedName}"`);
      }

      // Add resolved name to the set so other players inside this same batch don't get the same name either!
      existingNamesSet.add(resolvedName.toLowerCase());

      const uniquePlayerId = 'p-' + generateId() + '-' + index;
      return {
        id: uniquePlayerId,
        name: resolvedName,
        initials: getInitials(resolvedName),
        color: groupColor,
        squadCode: groupSquadCode
      };
    });

    // Notify user of renames if any
    if (renamedNotices.length > 0) {
      notify(`Notice: ${renamedNotices.join(', ')} to prevent duplicate names!`, 'info');
    }

    const N = session.teamSize;
    const G = newTeamPlayers.length;

    setTeams((prev) => {
      let isAdded = false;
      let nextTeams = prev.map((team) => {
        // Find the FIRST team that has space for ALL G players
        if (!isAdded && team.players.length + G <= N) {
          isAdded = true;
          return {
            ...team,
            players: [...team.players, ...newTeamPlayers]
          };
        }
        return team;
      });

      if (!isAdded) {
        // Create a new team since none could accommodate the group together
        const nextTeamNumber = prev.reduce((max, t) => {
          const match = t.name.match(/Team\s+(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            return num > max ? num : max;
          }
          return max;
        }, 0) + 1;

        const newTeam: Team = {
          id: 'team-' + generateId(),
          name: `Team ${nextTeamNumber}`,
          players: newTeamPlayers,
          status: prev.length === 0 ? 'active' : 'waiting',
          createdAt: Date.now()
        };
        nextTeams = [...nextTeams, newTeam];
      }

      return nextTeams;
    });

    if (renamedNotices.length === 0) {
      notify(`Assigned players into the rotation queue!`, 'success');
    }
  };

  // Drag handle reorder action or movement
  const handleReorderTeams = (updatedTeams: Team[]) => {
    setTeams(updatedTeams);
  };

  // Rename individual player directly in the card line
  const handleUpdatePlayerName = (teamId: string, playerId: string, newName: string) => {
    if (!newName.trim()) return;

    setTeams((prev) =>
      prev.map((t) => {
        if (t.id === teamId) {
          const updatedPlayers = t.players.map((p) => {
            if (p.id === playerId) {
              return {
                ...p,
                name: newName,
                initials: getInitials(newName)
              };
            }
            return p;
          });
          return { ...t, players: updatedPlayers };
        }
        return t;
      })
    );
    notify('Player name updated successfully', 'info');
  };

  // Swap two players directly across teams (doesn't modify the waiting queue positions)
  const handleSwapPlayers = (player1Id: string, player2Id: string) => {
    if (player1Id === player2Id) return;

    setTeams((prev) => {
      let p1Coords: { teamIdx: number; playerIdx: number } | null = null;
      let p2Coords: { teamIdx: number; playerIdx: number } | null = null;

      prev.forEach((team, tIdx) => {
        team.players.forEach((player, pIdx) => {
          if (player.id === player1Id) {
            p1Coords = { teamIdx: tIdx, playerIdx: pIdx };
          }
          if (player.id === player2Id) {
            p2Coords = { teamIdx: tIdx, playerIdx: pIdx };
          }
        });
      });

      if (!p1Coords || !p2Coords) return prev;

      // Swap players in a copy of the teams array
      const nextTeams = prev.map((t) => ({ ...t, players: [...t.players] }));
      const p1 = nextTeams[p1Coords.teamIdx].players[p1Coords.playerIdx];
      const p2 = nextTeams[p2Coords.teamIdx].players[p2Coords.playerIdx];

      nextTeams[p1Coords.teamIdx].players[p1Coords.playerIdx] = p2;
      nextTeams[p2Coords.teamIdx].players[p2Coords.playerIdx] = p1;

      return nextTeams;
    });

    notify("Players swapped successfully!", "success");
  };

  // Delete team
  const handleDeleteTeam = (teamId: string) => {
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
    notify('Team removed from queue', 'info');
  };

  // Rapid Quick addition of team of currently selected size
  const handleAddQuickTeam = () => {
    const randomSet = Array.from({ length: session.teamSize }).map(() => {
      return RANDOM_PLAYER_NAMES[Math.floor(Math.random() * RANDOM_PLAYER_NAMES.length)];
    });

    handleAddTeam(randomSet);
  };

  // Moves active or chosen team to back of queue (classic playground style)
  const handleRotateTeamToBack = (teamId: string) => {
    setTeams((prev) => {
      const match = prev.find((t) => t.id === teamId);
      if (!match) return prev;
      
      const filtered = prev.filter((t) => t.id !== teamId);
      return [...filtered, match];
    });
    notify('Team moved to end of the rotation queue', 'info');
  };

  // Toggles active/waiting manually
  const handleToggleStatus = (teamId: string) => {
    setTeams((prev) =>
      prev.map((t) => {
        if (t.id === teamId) {
          return {
            ...t,
            status: t.status === 'active' ? 'waiting' : 'active'
          };
        }
        return t;
      })
    );
  };

  // Reset the entire board
  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all teams and reset the queue?')) {
      setTeams([]);
      setGameHistory([]);
      notify('Roster queue and game history cleared', 'info');
    }
  };

  // Record match result: winner stays, loser is disbanded & players are individually requeued to the waiting roster list. Update stats.
  const handleRecordMatchResult = (courtNum: number, teamA: Team, teamB: Team, winnerSide: 'A' | 'B') => {
    const winningTeam = winnerSide === 'A' ? teamA : teamB;
    const losingTeam = winnerSide === 'A' ? teamB : teamA;

    // Create updated team rosters to store in game history
    const recordTeamA: Team = {
      ...teamA,
      players: teamA.players.map((p) => {
        const isWin = winnerSide === 'A';
        return {
          ...p,
          wins: (p.wins || 0) + (isWin ? 1 : 0),
          losses: (p.losses || 0) + (isWin ? 0 : 1)
        };
      })
    };

    const recordTeamB: Team = {
      ...teamB,
      players: teamB.players.map((p) => {
        const isWin = winnerSide === 'B';
        return {
          ...p,
          wins: (p.wins || 0) + (isWin ? 1 : 0),
          losses: (p.losses || 0) + (isWin ? 0 : 1)
        };
      })
    };

    setGameHistory((prevHistory) => {
      const nextGameNumber = prevHistory.length + 1;
      const record: GameRecord = {
        id: 'game-' + generateId() + '-' + Date.now(),
        gameNumber: nextGameNumber,
        courtName: `Court ${courtNum}`,
        teamA: recordTeamA,
        teamB: recordTeamB,
        winnerSide,
        status: 'End',
        timestamp: Date.now()
      };
      return [...prevHistory, record];
    });

    setTeams((prev) => {
      const winId = winningTeam.id;
      const loseId = losingTeam.id;

      // Update player win/loss counts across all teams to preserve history
      const updatedList = prev.map((team) => {
        if (team.id === winId) {
          return {
            ...team,
            players: team.players.map((p) => ({
              ...p,
              wins: (p.wins || 0) + 1,
              losses: p.losses || 0
            }))
          };
        } else if (team.id === loseId) {
          return {
            ...team,
            players: team.players.map((p) => ({
              ...p,
              wins: p.wins || 0,
              losses: (p.losses || 0) + 1
            }))
          };
        }
        return team;
      });

      // Find the fully updated winning and losing teams from the list
      const finalWinningTeam = updatedList.find((t) => t.id === winId);
      const finalLosingTeam = updatedList.find((t) => t.id === loseId);
      if (!finalWinningTeam || !finalLosingTeam) return prev;

      // Get the players from the losing team (with updated losses) to individually requeue
      const playersToRequeue = [...finalLosingTeam.players];

      // Find the index of the losing team in the updated list
      const loserIndex = updatedList.findIndex((t) => t.id === loseId);

      // Separate into active and waiting lists relative to the courtCount
      const activeThreshold = courtCount * 2;
      const N = session.teamSize;
      
      let nextList: Team[] = [];
      let waitingPart: Team[] = [];

      if (loserIndex !== -1 && loserIndex < activeThreshold) {
        // If the losing team was on an active court, try to fill its spot with the first waiting team
        const waitingQueue = updatedList.slice(activeThreshold).filter(t => t.id !== loseId);
        
        if (waitingQueue.length > 0) {
          // Pull the first waiting team to replace the losing team's exact position
          const nextWaitingTeam = { ...waitingQueue[0] };

          // Fill this next waiting team to the standard team size (N) from the players who just lost
          if (nextWaitingTeam.players.length < N) {
            let remainingNeeded = N - nextWaitingTeam.players.length;

            // Build blocks for playersToRequeue
            const blocks: { type: 'squad' | 'individual'; key: string; players: Player[] }[] = [];
            const visited = new Set<string>();
            playersToRequeue.forEach((player) => {
              if (visited.has(player.id)) return;

              if (player.squadCode) {
                const squadPlayers = playersToRequeue.filter((p) => p.squadCode === player.squadCode);
                squadPlayers.forEach((p) => visited.add(p.id));
                blocks.push({
                  type: 'squad',
                  key: player.squadCode,
                  players: squadPlayers
                });
              } else {
                visited.add(player.id);
                blocks.push({
                  type: 'individual',
                  key: player.id,
                  players: [player]
                });
              }
            });

            const keptPlayers: Player[] = [];

            // Pull full blocks that fit the required room, otherwise keep them
            blocks.forEach((block) => {
              if (remainingNeeded >= block.players.length) {
                nextWaitingTeam.players = [...nextWaitingTeam.players, ...block.players];
                remainingNeeded -= block.players.length;
              } else {
                keptPlayers.push(...block.players);
              }
            });

            // Update playersToRequeue with who was left after pulling
            playersToRequeue.splice(0, playersToRequeue.length, ...keptPlayers);
          }
          
          // Replace inside the activeThreshold limit, and filter out the loser
          const activePart = updatedList.slice(0, activeThreshold).map((t, idx) => {
            if (idx === loserIndex) {
              return nextWaitingTeam;
            }
            return t;
          }).filter((t) => t.id !== loseId);
          
          // The remaining waiting teams shift up
          waitingPart = waitingQueue.slice(1);
          
          nextList = [...activePart, ...waitingPart];
        } else {
          // No waiting queue available, just remove the losing team; other courts shift up naturally
          nextList = updatedList.filter((t) => t.id !== loseId);
          waitingPart = [];
        }
      } else {
        // Safe fallback
        nextList = updatedList.filter((t) => t.id !== loseId);
        waitingPart = nextList.slice(activeThreshold);
      }

      // Group remaining playersToRequeue into cohesive blocks to distribute into the waiting queue
      const requeueBlocks: { type: 'squad' | 'individual'; key: string; players: Player[] }[] = [];
      const visitedForRequeue = new Set<string>();
      playersToRequeue.forEach((player) => {
        if (visitedForRequeue.has(player.id)) return;

        if (player.squadCode) {
          const squadPlayers = playersToRequeue.filter((p) => p.squadCode === player.squadCode);
          squadPlayers.forEach((p) => visitedForRequeue.add(p.id));
          requeueBlocks.push({
            type: 'squad',
            key: player.squadCode,
            players: squadPlayers
          });
        } else {
          visitedForRequeue.add(player.id);
          requeueBlocks.push({
            type: 'individual',
            key: player.id,
            players: [player]
          });
        }
      });

      // Distribute each requeue block together to avoid dividing squads
      requeueBlocks.forEach((block) => {
        let addedToExisting = false;
        const blockSize = block.players.length;

        // Try to find an existing waiting team that can fit ALL players in this block
        for (let i = 0; i < waitingPart.length; i++) {
          if (waitingPart[i].players.length + blockSize <= N) {
            const nextListIdx = nextList.findIndex((t) => t.id === waitingPart[i].id);
            if (nextListIdx !== -1) {
              nextList[nextListIdx] = {
                ...nextList[nextListIdx],
                players: [...nextList[nextListIdx].players, ...block.players]
              };
              waitingPart[i] = nextList[nextListIdx];
              addedToExisting = true;
              break;
            }
          }
        }

        if (!addedToExisting) {
          // Spawn a new waiting team for this block (squad or individual)
          const nextTeamNumber = nextList.reduce((max, t) => {
            const match = t.name.match(/Team\s+(\d+)/);
            if (match) {
              const num = parseInt(match[1], 10);
              return num > max ? num : max;
            }
            return max;
          }, 0) + 1;

          const newTeam: Team = {
            id: 'team-' + generateId() + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
            name: `Team ${nextTeamNumber}`,
            players: block.players,
            status: 'waiting',
            createdAt: Date.now()
          };
          nextList.push(newTeam);
          waitingPart.push(newTeam);
        }
      });

      return nextList;
    });

    notify(`Match on Court ${courtNum} completed! ${winningTeam.name} wins!`, 'success');
  };

  return (
    <div className="min-h-screen bg-[#f7f9fb] flex flex-col font-sans select-none antialiased">
      {/* Dynamic Pop up Banner Notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-6 right-6 z-50 pointer-events-none"
          >
            <div className={`shadow-lg border px-4 py-3 rounded text-xs font-semibold flex items-center space-x-2 bg-slate-900 border-slate-800 text-white`}>
              <span className="text-yellow-400">⚡</span>
              <span>{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation Bar */}
      <header id="app-header" className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          {/* Logo */}
          <div id="company-logo" className="flex items-center space-x-2">
            <span id="logo-badge" className="bg-[#0f172a] text-white w-7 h-7 rounded flex items-center justify-center font-extrabold text-xs">
              T
            </span>
            <span id="logo-text" className="text-xl font-extrabold text-slate-900 tracking-tight">
              TeamUp
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Share QR Code Button & Popover */}
            <div className="relative">
              <button
                id="btn-share-lobby-qr"
                onClick={() => setShowQrPopover(!showQrPopover)}
                className={`flex items-center gap-2 px-3.5 py-1.5 border rounded-lg text-xs font-semibold transition cursor-pointer font-sans shadow-2xs ${
                  showQrPopover 
                    ? 'bg-slate-900 border-slate-900 text-white font-medium' 
                    : 'border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
                title="View QR Code to easily open this app on mobile"
              >
                <QrCode size={13} className={showQrPopover ? 'text-yellow-400' : 'text-slate-500'} />
                <span>Mobile Scan QR</span>
              </button>

              <AnimatePresence>
                {showQrPopover && (
                  <>
                    {/* Invisible backdrop to close the popover */}
                    <div 
                      className="fixed inset-0 z-40 bg-transparent" 
                      onClick={() => setShowQrPopover(false)} 
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-5 z-50 text-slate-800 focus:outline-none"
                    >
                      <div className="text-center">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-1.5 font-sans">
                          Scan to Open on Mobile
                        </h4>
                        <p className="text-[10px] text-slate-400 mb-3.5 leading-relaxed font-sans font-medium">
                          Scan this QR Code with your smartphone camera to quickly load this lobby dashboard!
                        </p>
                        
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100/90 inline-block mb-3.5">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=0f172a&data=${encodeURIComponent(window.location.href)}`}
                            alt="Lobby QR Code"
                            className="w-36 h-36 mx-auto object-contain bg-white p-1.5 border border-slate-200 rounded"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 text-[10px] text-slate-500 text-left space-y-1 font-sans font-medium leading-normal">
                          <p className="font-bold text-slate-700">💡 Syncing Note:</p>
                          <p className="leading-snug">
                            This page runs offline via local storage. Devices won't auto-sync unless synchronized through a live backend.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <button
              id="btn-restart-session"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer text-slate-700 font-mono shadow-2xs"
              title="Create/restart a new game session"
            >
              <ListRestart size={13} className="text-slate-500 animate-spin-slow" />
              <span>Create / Restart Session</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main id="app-main-content" className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left panel (Column width 4) */}
          <div id="left-control-panel" className="lg:col-span-4 space-y-6">
            
            {/* Conditional view to replace Session Setting once we set it up */}
            {!isEditingSession ? (
              <div 
                id="active-session-summary-card" 
                className="bg-white border border-slate-200 rounded-lg p-6 w-full shadow-xs"
              >
                <div className="flex justify-between items-center mb-4 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider font-sans">
                      Active Session
                    </span>
                  </div>
                  <button
                    id="btn-edit-session-toggle"
                    onClick={() => setIsEditingSession(true)}
                    className="text-xs text-slate-500 hover:text-slate-900 font-semibold hover:underline flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    ⚙️ Edit Settings
                  </button>
                </div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-snug mb-1">
                  {session.gameName}
                </h3>
                <p className="text-xs text-slate-500 font-medium mb-4">
                  {session.gameDetail}
                </p>
                <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
                  <span>Standard Team Size:</span>
                  <span className="bg-slate-100 px-2.5 py-1 rounded font-mono font-bold text-slate-800 border border-slate-200">
                    {session.teamSize} Players
                  </span>
                </div>
              </div>
            ) : (
              <SessionSettingsCard
                session={session}
                onChange={handleSessionChange}
                onSave={() => setIsEditingSession(false)}
              />
            )}

            <PlayerEntryCard
              teamSize={session.teamSize}
              onAddTeam={handleAddTeam}
            />

          </div>

          {/* Right panel (Column width 8) */}
          <div id="right-queue-panel" className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-6 min-h-[450px]">
            <TeamQueueView
              teams={teams}
              courtCount={courtCount}
              onIncreaseCourts={handleIncreaseCourts}
              onDecreaseCourts={handleDecreaseCourts}
              onRequeuePlayers={handleRequeuePlayers}
              onReorderTeams={handleReorderTeams}
              onUpdatePlayerName={handleUpdatePlayerName}
              onDeleteTeam={handleDeleteTeam}
              onAddQuickTeam={handleAddQuickTeam}
              onRotateTeamToBack={handleRotateTeamToBack}
              onToggleStatus={handleToggleStatus}
              onRecordMatchResult={handleRecordMatchResult}
              onFillTeam={handleFillTeam}
              onDropPlayer={handleDropPlayer}
              onDropSquad={handleDropSquad}
              onSwapPlayers={handleSwapPlayers}
            />
          </div>

        </div>

        {/* Full-width Today's Game History Section */}
        <div id="all-games-schedule-section" className="mt-8 bg-white border border-slate-200 rounded-lg p-6 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 mb-4 gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span>Today's Game History</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold font-mono normal-case">
                  {gameHistory.length} Completed, {Math.ceil(teams.length / 2)} Queued
                </span>
              </h3>
              <p className="text-[10px] text-slate-400">Complete log of matches played today with recorded outcomes, and the live queue of upcoming matches</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
              {/* Leaderboard Layout View Switcher */}
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200/60 shadow-3xs">
                <button
                  type="button"
                  onClick={() => setHistoryView('matches')}
                  className={`px-2.5 py-1 text-[10px] sm:text-[11px] font-bold rounded-md transition-all duration-150 cursor-pointer ${
                    historyView === 'matches'
                      ? 'bg-white text-slate-800 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Match Playlist
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryView('roster')}
                  className={`px-2.5 py-1 text-[10px] sm:text-[11px] font-bold rounded-md transition-all duration-150 cursor-pointer ${
                    historyView === 'roster'
                      ? 'bg-white text-slate-800 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Roster Queue
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryView('leaderboard')}
                  className={`px-2.5 py-1 text-[10px] sm:text-[11px] font-bold rounded-md transition-all duration-150 cursor-pointer ${
                    historyView === 'leaderboard'
                      ? 'bg-white text-slate-800 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Leaderboard
                </button>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <span className="text-slate-400">Total Players:</span>
                <span className="bg-slate-900 text-white px-2.5 py-1 font-bold rounded">
                  {teams.flatMap((t) => t.players).length}
                </span>
              </div>
              
              {historyView === 'roster' ? (
                teams.length > 0 && (
                  <button
                    onClick={handleDownloadRoster}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-850 hover:text-emerald-900 font-bold rounded-lg text-[11px] transition duration-150 cursor-pointer border border-emerald-200/85 hover:border-emerald-300 font-sans shadow-3xs"
                    title="Download live roster queue sequence and stats as Excel-compatible CSV file"
                  >
                    <Download size={12} className="text-emerald-600 font-bold" />
                    <span>Download Roster Queue</span>
                  </button>
                )
              ) : (
                gameHistory.length > 0 && (
                  <div className="flex items-center gap-2">
                    {historyView === 'matches' ? (
                      <button
                        onClick={handleDownloadHistory}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-850 hover:text-sky-900 font-bold rounded-lg text-[11px] transition duration-150 cursor-pointer border border-sky-200/85 hover:border-sky-300 font-sans shadow-3xs"
                        title="Download completed match results as Excel-compatible CSV file"
                      >
                        <Download size={12} className="text-sky-600 font-bold" />
                        <span>Download Play History</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleDownloadLeaderboard}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-850 hover:text-indigo-900 font-bold rounded-lg text-[11px] transition duration-150 cursor-pointer border border-indigo-200/85 hover:border-indigo-300 font-sans shadow-3xs"
                        title="Download player and squad wins leaderboards as Excel-compatible CSV file"
                      >
                        <Download size={12} className="text-indigo-600 font-bold" />
                        <span>Download Stats</span>
                      </button>
                    )}

                    <button
                      onClick={handleClearHistory}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-850 hover:text-rose-900 font-bold rounded-lg text-[11px] transition duration-150 cursor-pointer border border-rose-250 hover:border-rose-350 shadow-3xs"
                      title="Clear today's completed match history records"
                    >
                      <Trash2 size={12} className="text-rose-500" />
                      <span>Clear</span>
                    </button>
                  </div>
                )
              )}
            </div>
          </div>

          {(() => {
            if (historyView === 'leaderboard') {
              const { playerLeaders } = computeLeaderboardData(gameHistory);

              if (playerLeaders.length === 0) {
                return (
                  <div className="text-center py-12 px-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    <Trophy className="mx-auto text-slate-300 mb-3" size={32} />
                    <p className="text-xs text-slate-500 font-bold">No complete games are recorded yet to compile leaderboards.</p>
                    <p className="text-[10px] text-slate-400 mt-1">Play some games, record the winners, and check back to see standings!</p>
                  </div>
                );
              }

              return (
                <div className="mt-2 animate-fade-in flex justify-center">
                  {/* Players Leaderboard */}
                  <div className="bg-slate-50/40 p-6 rounded-xl border border-slate-200/75 flex flex-col w-full max-w-3xl">
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                      <Trophy className="text-amber-500" size={16} />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Individual Leaderboard (Wins)</h4>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 font-mono text-[9px] uppercase tracking-wider">
                            <th className="py-2.5 font-bold w-16 text-center">Rank</th>
                            <th className="py-2.5 font-bold">Player Name</th>
                            <th className="py-2.5 font-bold w-28">Squad</th>
                            <th className="py-2.5 font-bold text-center w-16">Wins</th>
                            <th className="py-2.5 font-bold text-center w-16">Losses</th>
                            <th className="py-2.5 font-bold text-right w-20">Win Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
                          {playerLeaders.map((p, idx) => {
                            const total = p.wins + p.losses;
                            const rate = total > 0 ? Math.round((p.wins / total) * 100) : 0;
                            const isFirst = idx === 0;
                            const isSecond = idx === 1;
                            const isThird = idx === 2;

                            return (
                              <tr key={p.name} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 text-center">
                                  {isFirst ? (
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 font-extrabold text-[10px]">1</span>
                                  ) : isSecond ? (
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-extrabold text-[10px]">2</span>
                                  ) : isThird ? (
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-50 text-amber-850 font-extrabold text-[10px]">3</span>
                                  ) : (
                                    <span className="font-mono text-slate-400 font-semibold">{idx + 1}</span>
                                  )}
                                </td>
                                <td className="py-3 font-semibold text-slate-800 truncate max-w-[160px]">{p.name}</td>
                                <td className="py-3">
                                  {p.squadCode ? (
                                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-indigo-50 border border-indigo-100 rounded text-indigo-600 font-sans">
                                      Squad {p.squadCode}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="py-3 text-center font-bold text-emerald-600 font-mono">{p.wins}</td>
                                <td className="py-3 text-center font-medium text-slate-400 font-mono">{p.losses}</td>
                                <td className="py-3 text-right font-mono font-bold text-slate-755">{rate}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            }

            if (historyView === 'roster') {
              if (teams.length === 0) {
                return (
                  <div className="text-center py-12 px-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    <QrCode className="mx-auto text-slate-300 mb-3 animate-pulse" size={32} />
                    <p className="text-xs text-slate-500 font-bold">Roster queue is currently empty.</p>
                    <p className="text-[10px] text-slate-400 mt-1">Add players or squads on the left to populate the play queue!</p>
                  </div>
                );
              }

              return (
                <div className="mt-2 animate-fade-in flex justify-center">
                  <div className="bg-slate-50/40 p-6 rounded-xl border border-slate-200/75 flex flex-col w-full max-w-4xl">
                    <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                      <QrCode className="text-emerald-500" size={16} />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Roster Play Queue (Top to Bottom)</h4>
                    </div>

                    <div className="relative border-l border-slate-200 pl-6 ml-4 space-y-8 py-2">
                      {teams.map((team, tIdx) => {
                        const gameIdx = Math.floor(tIdx / 2);
                        const teamSide = tIdx % 2 === 0 ? "Team A" : "Team B";
                        
                        let stateBadge = null;
                        let dotColor = "bg-slate-300";
                        
                        if (gameIdx < courtCount) {
                          stateBadge = (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded-sm uppercase tracking-wide border border-emerald-200">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active • Court {gameIdx + 1} ({teamSide})
                            </span>
                          );
                          dotColor = "bg-emerald-500 ring-4 ring-emerald-100";
                        } else if (gameIdx === courtCount) {
                          stateBadge = (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-800 rounded-sm uppercase tracking-wide border border-amber-200">
                              On Deck • Next Up ({teamSide})
                            </span>
                          );
                          dotColor = "bg-amber-500 ring-4 ring-amber-100";
                        } else {
                          stateBadge = (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-600 rounded-sm uppercase tracking-wide border border-slate-200 font-mono">
                              In Queue • Slot {gameIdx + 1} ({teamSide})
                            </span>
                          );
                          dotColor = "bg-slate-400";
                        }

                        return (
                          <div key={team.id || tIdx} className="relative group transition-all duration-150">
                            {/* Point on timeline */}
                            <span className={`absolute -left-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-white transition-all duration-200 ${dotColor}`} />

                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all duration-150">
                              <div className="flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <span className="font-mono text-[10px] font-bold text-slate-400">#{tIdx + 1}</span>
                                  <h5 className="text-xs font-bold text-slate-800">{team.name}</h5>
                                  {stateBadge}
                                </div>
                                
                                {/* Long list of names from top to bottom */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                                  {team.players.map((player) => (
                                    <div 
                                      key={player.id} 
                                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition-all shadow-3xs"
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <span className={`text-xs font-semibold truncate ${player.color || 'text-slate-800'}`}>
                                          {player.name}
                                        </span>
                                        {player.squadCode && (
                                          <span className="shrink-0 px-1.5 py-0.2 text-[8px] font-extrabold bg-indigo-50 border border-indigo-100 rounded text-indigo-600">
                                            Squad {player.squadCode}
                                          </span>
                                        )}
                                      </div>
                                      <span className="shrink-0 font-mono text-[9px] text-slate-450 font-bold">
                                        {player.wins || 0}W - {player.losses || 0}L
                                      </span>
                                    </div>
                                  ))}
                                  {team.players.length === 0 && (
                                    <p className="text-[10px] text-slate-400 italic">No players in team.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            }

            interface GameDisplayItem {
              id: string;
              gameNumber: number;
              teamA: Team | null;
              teamB: Team | null;
              status: 'Active' | 'On Deck' | 'In Queue' | 'End';
              courtName?: string;
              winnerSide?: 'A' | 'B';
            }

            const completedList: GameDisplayItem[] = gameHistory.map((record) => ({
              id: record.id,
              gameNumber: record.gameNumber,
              teamA: record.teamA,
              teamB: record.teamB,
              status: 'End',
              courtName: record.courtName,
              winnerSide: record.winnerSide
            }));

            const ongoingList: GameDisplayItem[] = [];
            const maxTeams = teams.length;
            const totalUpcomingGames = Math.ceil(maxTeams / 2);
            const H = gameHistory.length;

            for (let i = 0; i < totalUpcomingGames; i++) {
              const teamA = teams[2 * i] || null;
              const teamB = teams[2 * i + 1] || null;
              
              let status: 'Active' | 'On Deck' | 'In Queue' = 'In Queue';
              let courtName = '';
              
              if (i < courtCount) {
                status = 'Active';
                courtName = `Court ${i + 1}`;
              } else if (i === courtCount) {
                status = 'On Deck';
              }
              
              ongoingList.push({
                id: `upcoming-${i}`,
                gameNumber: H + i + 1,
                teamA,
                teamB,
                status,
                courtName
              });
            }

            const allGames = [...completedList, ...ongoingList];

            return allGames.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                No games have been scheduled yet. Fill slots on the left and form teams to add games for today.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allGames.map((game) => {
                  const isEnd = game.status === 'End';
                  const teamAWon = isEnd && game.winnerSide === 'A';
                  const teamBWon = isEnd && game.winnerSide === 'B';
                  return (
                    <div 
                      key={game.id || game.gameNumber}
                      className={`flex flex-col border rounded-xl overflow-hidden shadow-2xs hover:shadow-xs transition-all duration-200 ${
                        isEnd ? 'border-slate-200 bg-slate-50/25' : 'border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      {/* Dynamic game Sub-Header */}
                      <div className={`px-4 py-3 flex items-center justify-between text-white ${
                        isEnd ? 'bg-slate-600/90' : 'bg-slate-900'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-white/20 rounded-sm">
                            Game {game.gameNumber}
                          </span>
                          {game.courtName && (
                            <span className="text-[11px] font-semibold text-slate-300">
                              • {game.courtName}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${
                            game.status === 'Active' ? 'bg-emerald-400 animate-pulse' :
                            game.status === 'On Deck' ? 'bg-amber-400' :
                            game.status === 'End' ? 'bg-slate-300' : 'bg-slate-400'
                          }`}></span>
                          <span className="text-[9px] font-bold uppercase tracking-wider font-mono">
                            {game.status}
                          </span>
                        </div>
                      </div>

                      {/* Side-by-side team rosters inside this game column */}
                      <div className="p-4 flex flex-col gap-4 relative">
                        <div className="grid grid-cols-2 gap-4 items-stretch relative">
                          {/* Team A */}
                          <div className={`flex flex-col transition-all duration-200 ${
                            isEnd && !teamAWon ? 'opacity-65' : 'opacity-100'
                          }`}>
                            <div className="text-center pb-1.5 mb-2 border-b border-slate-200 relative">
                              <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                                Team A {teamAWon && '🏆'}
                              </p>
                              <p className="text-xs font-bold text-slate-800 truncate">{game.teamA ? game.teamA.name : '-'}</p>
                              {teamAWon && (
                                <span className="absolute -top-1.5 right-0 text-[8px] bg-emerald-100 text-emerald-800 font-extrabold px-1 py-0.2 rounded uppercase font-mono tracking-wide scale-90">
                                  WON
                                </span>
                              )}
                            </div>
                            {game.teamA ? (
                              <div className="flex flex-col gap-1.5 min-h-[140px]">
                                {game.teamA.players.map((player) => (
                                  <div 
                                    key={player.id} 
                                    className={`flex flex-col p-2 rounded-lg border transition-all ${
                                      teamAWon 
                                        ? 'bg-emerald-50/40 border-emerald-250 shadow-3xs' 
                                        : 'bg-white border-slate-200/80 shadow-3xs'
                                    }`}
                                  >
                                    <span className={`text-xs font-semibold truncate ${player.color || 'text-slate-800'} flex items-center justify-between gap-1.5`} title={player.name}>
                                      <span className="truncate">{player.name}</span>
                                      {player.squadCode && (
                                        <span className="shrink-0 px-1 py-0.2 text-[8px] font-bold bg-indigo-50 border border-indigo-100 rounded text-indigo-600 font-sans">
                                          Squad {player.squadCode}
                                        </span>
                                      )}
                                    </span>
                                    <span className="text-[9px] text-slate-455 font-mono mt-0.5 font-bold">
                                      {player.wins || 0}W - {player.losses || 0}L
                                    </span>
                                  </div>
                                ))}
                                {game.teamA.players.length === 0 && (
                                  <p className="text-[10px] text-slate-400 italic text-center my-auto">No players</p>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-full min-h-[140px] text-[10px] text-slate-455 italic bg-white rounded-lg border border-dashed border-slate-200 p-2 text-center select-none">
                                No Team
                              </div>
                            )}
                          </div>

                          {/* VS Divider in middle */}
                          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-10 select-none">
                            <span className="w-6 h-6 rounded-full bg-slate-900 border-2 border-white text-white font-mono text-[9px] font-extrabold flex items-center justify-center shadow-2xs">
                              VS
                            </span>
                          </div>

                          {/* Team B */}
                          <div className={`flex flex-col transition-all duration-200 ${
                            isEnd && !teamBWon ? 'opacity-65' : 'opacity-100'
                          }`}>
                            <div className="text-center pb-1.5 mb-2 border-b border-slate-200 relative">
                              <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">
                                Team B {teamBWon && '🏆'}
                              </p>
                              <p className="text-xs font-bold text-slate-800 truncate">{game.teamB ? game.teamB.name : '-'}</p>
                              {teamBWon && (
                                <span className="absolute -top-1.5 right-0 text-[8px] bg-emerald-100 text-emerald-800 font-extrabold px-1 py-0.2 rounded uppercase font-mono tracking-wide scale-90">
                                  WON
                                </span>
                              )}
                            </div>
                            {game.teamB ? (
                              <div className="flex flex-col gap-1.5 min-h-[140px]">
                                {game.teamB.players.map((player) => (
                                  <div 
                                    key={player.id} 
                                    className={`flex flex-col p-2 rounded-lg border transition-all ${
                                      teamBWon 
                                        ? 'bg-emerald-50/40 border-emerald-250 shadow-3xs' 
                                        : 'bg-white border-slate-200/80 shadow-3xs'
                                    }`}
                                  >
                                    <span className={`text-xs font-semibold truncate ${player.color || 'text-slate-800'} flex items-center justify-between gap-1.5`} title={player.name}>
                                      <span className="truncate">{player.name}</span>
                                      {player.squadCode && (
                                        <span className="shrink-0 px-1 py-0.2 text-[8px] font-bold bg-indigo-50 border border-indigo-100 rounded text-indigo-600 font-sans">
                                          Squad {player.squadCode}
                                        </span>
                                      )}
                                    </span>
                                    <span className="text-[9px] text-slate-455 font-mono mt-0.5 font-bold">
                                      {player.wins || 0}W - {player.losses || 0}L
                                    </span>
                                  </div>
                                ))}
                                {game.teamB.players.length === 0 && (
                                  <p className="text-[10px] text-slate-400 italic text-center my-auto">No players</p>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-full min-h-[140px] text-[10px] text-slate-455 italic bg-white rounded-lg border border-dashed border-slate-200 p-2 text-center select-none">
                                No Team
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </main>

      {/* Footer credits & details */}
      <footer id="app-footer" className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-xs text-slate-400 font-mono flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>TeamUp</div>
          <div className="flex items-center space-x-3">
            <a 
              href="mailto:superchrisxxx@gmail.com" 
              className="text-slate-500 hover:text-slate-800 hover:underline hover:cursor-pointer transition-colors font-medium"
            >
              Feedback
            </a>
            <span>•</span>
            <span className="text-slate-600 font-semibold">Active UTC: {utcTime}</span>
          </div>
        </div>
      </footer>

      {/* Initialize / Create Session Modal */}
      <CreateSessionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateNewSession}
      />
    </div>
  );
}
