'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Crown,
  Flame,
  Zap,
  ArrowLeft,
  Swords,
  Sparkles,
  Shield,
  Medal,
  TrendingUp,
  User,
  Users,
  Search,
  RefreshCw,
} from 'lucide-react';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useAuth } from '@/app/components/AuthProvider';
import LeftSidebar from '@/app/components/LeftSidebar';
import BottomNav from '@/app/components/BottomNav';

export interface LeaderboardUser {
  uid: string;
  handle: string;
  displayName?: string;
  photoUrl?: string;
  auraScore: number;
  arcadeTotalWins: number;
  arcadeElo: number;
  equipped?: {
    title?: string;
    suit?: string;
  };
}

// Fallback seed data if Firestore has few user docs
const SEED_LEADERBOARD: LeaderboardUser[] = [
  {
    uid: 'user_grandmaster',
    handle: '@VORTEX_CHAMP',
    displayName: 'Aarav Sharma',
    auraScore: 4820,
    arcadeTotalWins: 142,
    arcadeElo: 1840,
    equipped: { title: 'title_grandmaster' },
  },
  {
    uid: 'user_shadow',
    handle: '@NEURAL_GHOST',
    displayName: 'Zara Khan',
    auraScore: 3950,
    arcadeTotalWins: 118,
    arcadeElo: 1720,
    equipped: { title: 'title_shadow_broker' },
  },
  {
    uid: 'user_midas',
    handle: '@CYBER_MIDAS',
    displayName: 'Rohan Verma',
    auraScore: 3100,
    arcadeTotalWins: 94,
    arcadeElo: 1650,
  },
  {
    uid: 'user_speed',
    handle: '@LUDO_KING_99',
    displayName: 'Priya Patel',
    auraScore: 2450,
    arcadeTotalWins: 78,
    arcadeElo: 1580,
  },
  {
    uid: 'user_chess',
    handle: '@CHESS_TITAN',
    displayName: 'Aditya Singh',
    auraScore: 1980,
    arcadeTotalWins: 65,
    arcadeElo: 1520,
  },
  {
    uid: 'user_debater',
    handle: '@ECHO_MASTER',
    displayName: 'Ananya Roy',
    auraScore: 1640,
    arcadeTotalWins: 52,
    arcadeElo: 1460,
  },
];

export function getAuraTier(aura: number): { name: string; icon: string; color: string; bg: string } {
  if (aura >= 4000) return { name: 'CELESTIAL', icon: '🌌', color: 'text-purple-300', bg: 'border-purple-500/60 bg-purple-950/60' };
  if (aura >= 2500) return { name: 'GRANDMASTER', icon: '👑', color: 'text-amber-300', bg: 'border-amber-500/60 bg-amber-950/60' };
  if (aura >= 1200) return { name: 'DIAMOND', icon: '💎', color: 'text-cyan-300', bg: 'border-cyan-500/60 bg-cyan-950/60' };
  if (aura >= 600)  return { name: 'GOLD', icon: '🥇', color: 'text-yellow-300', bg: 'border-yellow-500/60 bg-yellow-950/60' };
  if (aura >= 200)  return { name: 'SILVER', icon: '🥈', color: 'text-neutral-300', bg: 'border-neutral-500/60 bg-neutral-900/60' };
  return { name: 'BRONZE', icon: '🥉', color: 'text-amber-600', bg: 'border-amber-800/60 bg-neutral-950' };
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'arcade' | 'aura'>('arcade');
  const [usersList, setUsersList] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const db = getFirebaseDb();
      const orderField = activeTab === 'arcade' ? 'arcadeTotalWins' : 'auraScore';
      const q = query(collection(db, 'users'), orderBy(orderField, 'desc'), limit(50));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const fetched = snap.docs.map((d) => {
          const data = d.data();
          return {
            uid: d.id,
            handle: data.handle || `@USER_${d.id.slice(0, 4)}`,
            displayName: data.displayName || data.name || '',
            photoUrl: data.photoUrl || data.photoURL,
            auraScore: data.auraScore || 0,
            arcadeTotalWins: data.arcadeTotalWins || 0,
            arcadeElo: data.arcadeElo || 1000,
            equipped: data.equipped || {},
          } as LeaderboardUser;
        });
        setUsersList(fetched);
      } else {
        setUsersList(SEED_LEADERBOARD);
      }
    } catch (e) {
      console.warn('[Leaderboard] Falling back to seed ranks:', e);
      setUsersList(SEED_LEADERBOARD);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [activeTab]);

  // Sort and filter
  const sortedUsers = [...usersList].sort((a, b) => {
    if (activeTab === 'arcade') {
      return (b.arcadeTotalWins || 0) - (a.arcadeTotalWins || 0) || (b.arcadeElo || 0) - (a.arcadeElo || 0);
    }
    return (b.auraScore || 0) - (a.auraScore || 0);
  });

  const filteredUsers = sortedUsers.filter(
    (u) =>
      u.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.displayName && u.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const top1 = filteredUsers[0];
  const top2 = filteredUsers[1];
  const top3 = filteredUsers[2];

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col md:flex-row select-none">
      {/* Sidebar Navigation */}
      <LeftSidebar />

      {/* Main Container */}
      <main className="flex-1 md:pl-56 pb-24 md:pb-12 min-h-screen flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-black/90 backdrop-blur-md border-b border-neutral-900 px-4 md:px-8 py-3.5 flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-3">
            <Link
              href="/arcade"
              className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl text-neutral-400 hover:text-white transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h1 className="text-sm font-black uppercase tracking-wider text-white">
                  ARENA LEADERBOARD
                </h1>
                <span className="text-[9px] px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-400 font-bold uppercase">
                  SEASON 1 LIVE
                </span>
              </div>
              <p className="text-[10px] text-neutral-400">
                Ranked Arcade Victories • Global Aura Mastery • Real-Time Standings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLeaderboard}
              disabled={isLoading}
              className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded-xl text-neutral-300 hover:text-white transition-all cursor-pointer"
              title="Refresh Ranks"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              href="/arcade"
              className="px-3 py-1.5 bg-white text-black font-black text-xs uppercase rounded-xl hover:bg-neutral-200 transition-all shadow-md"
            >
              [ 🎮 PLAY ARCADE ]
            </Link>
          </div>
        </header>

        {/* Main Content Arena */}
        <div className="flex-1 p-4 md:p-8 max-w-5xl w-full mx-auto space-y-6">
          {/* Tab Switcher & Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-950 border border-neutral-800 p-3 rounded-2xl">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('arcade')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold uppercase transition flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'arcade'
                    ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>ARCADE CHAMPIONS</span>
              </button>

              <button
                onClick={() => setActiveTab('aura')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold uppercase transition flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'aura'
                    ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>AURA MASTERS</span>
              </button>
            </div>

            {/* Search filter */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search players..."
                className="w-full bg-black border border-neutral-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
              />
            </div>
          </div>

          {/* ── Top 3 Podium Showcase ── */}
          {filteredUsers.length >= 3 && !searchQuery && (
            <div className="grid grid-cols-3 gap-3 md:gap-4 items-end pt-6 pb-2">
              {/* #2 Silver */}
              {top2 && (
                <div className="bg-gradient-to-b from-neutral-900 to-black border border-neutral-700 rounded-2xl p-4 flex flex-col items-center text-center relative shadow-xl">
                  <div className="absolute -top-3 w-7 h-7 rounded-full bg-neutral-300 text-black font-black text-xs flex items-center justify-center shadow-lg">
                    2
                  </div>
                  <div className="w-12 h-12 rounded-full bg-neutral-800 border-2 border-neutral-400 flex items-center justify-center text-xl mt-2 mb-2">
                    🥈
                  </div>
                  <span className="font-bold text-xs text-white truncate max-w-[100px] sm:max-w-none">
                    {top2.handle}
                  </span>
                  <span className="text-[10px] text-neutral-400 mt-1">
                    {activeTab === 'arcade' ? `🏆 ${top2.arcadeTotalWins} Wins` : `⚡ ${top2.auraScore} Aura`}
                  </span>
                  <span className={`mt-2 text-[8px] font-bold px-2 py-0.5 rounded border uppercase ${getAuraTier(top2.auraScore).bg} ${getAuraTier(top2.auraScore).color}`}>
                    {getAuraTier(top2.auraScore).name}
                  </span>
                </div>
              )}

              {/* #1 Gold Champion */}
              {top1 && (
                <div className="bg-gradient-to-b from-amber-950/40 via-neutral-900 to-black border-2 border-amber-400 rounded-2xl p-5 flex flex-col items-center text-center relative shadow-[0_0_35px_rgba(251,191,36,0.2)] scale-105 z-10">
                  <div className="absolute -top-4 w-9 h-9 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-black font-black text-sm flex items-center justify-center shadow-2xl">
                    👑
                  </div>
                  <div className="w-14 h-14 rounded-full bg-amber-950 border-2 border-amber-400 flex items-center justify-center text-2xl mt-2 mb-2 shadow-inner">
                    🥇
                  </div>
                  <span className="font-black text-sm text-amber-300 truncate max-w-[120px] sm:max-w-none">
                    {top1.handle}
                  </span>
                  <span className="text-xs font-bold text-white mt-1">
                    {activeTab === 'arcade' ? `🏆 ${top1.arcadeTotalWins} Wins • ${top1.arcadeElo} Elo` : `⚡ ${top1.auraScore.toLocaleString()} Aura`}
                  </span>
                  <span className={`mt-2 text-[9px] font-black px-2.5 py-0.5 rounded-full border uppercase ${getAuraTier(top1.auraScore).bg} ${getAuraTier(top1.auraScore).color}`}>
                    {getAuraTier(top1.auraScore).icon} {getAuraTier(top1.auraScore).name}
                  </span>
                </div>
              )}

              {/* #3 Bronze */}
              {top3 && (
                <div className="bg-gradient-to-b from-neutral-900 to-black border border-amber-900/60 rounded-2xl p-4 flex flex-col items-center text-center relative shadow-xl">
                  <div className="absolute -top-3 w-7 h-7 rounded-full bg-amber-700 text-white font-black text-xs flex items-center justify-center shadow-lg">
                    3
                  </div>
                  <div className="w-12 h-12 rounded-full bg-neutral-800 border-2 border-amber-700 flex items-center justify-center text-xl mt-2 mb-2">
                    🥉
                  </div>
                  <span className="font-bold text-xs text-white truncate max-w-[100px] sm:max-w-none">
                    {top3.handle}
                  </span>
                  <span className="text-[10px] text-neutral-400 mt-1">
                    {activeTab === 'arcade' ? `🏆 ${top3.arcadeTotalWins} Wins` : `⚡ ${top3.auraScore} Aura`}
                  </span>
                  <span className={`mt-2 text-[8px] font-bold px-2 py-0.5 rounded border uppercase ${getAuraTier(top3.auraScore).bg} ${getAuraTier(top3.auraScore).color}`}>
                    {getAuraTier(top3.auraScore).name}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Ranked Table Roster ── */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-4 py-3 border-b border-neutral-900 bg-neutral-900/50 flex justify-between items-center text-xs font-bold text-neutral-400">
              <span className="w-12 text-center">RANK</span>
              <span className="flex-1 pl-2">PLAYER</span>
              <span className="w-24 text-center">AURA TIER</span>
              <span className="w-24 text-right">
                {activeTab === 'arcade' ? 'WINS / ELO' : 'AURA SCORE'}
              </span>
            </div>

            <div className="divide-y divide-neutral-900">
              {filteredUsers.map((p, idx) => {
                const rank = idx + 1;
                const tier = getAuraTier(p.auraScore);
                const isCurrentUser = user?.uid === p.uid;

                return (
                  <div
                    key={p.uid}
                    className={`px-4 py-3.5 flex items-center justify-between text-xs transition-colors ${
                      isCurrentUser
                        ? 'bg-amber-950/20 border-l-4 border-amber-400'
                        : 'hover:bg-neutral-900/40'
                    }`}
                  >
                    {/* Rank Number */}
                    <div className="w-12 flex items-center justify-center font-black">
                      {rank === 1 ? (
                        <span className="text-amber-400 text-sm">🥇 #1</span>
                      ) : rank === 2 ? (
                        <span className="text-neutral-300 text-sm">🥈 #2</span>
                      ) : rank === 3 ? (
                        <span className="text-amber-600 text-sm">🥉 #3</span>
                      ) : (
                        <span className="text-neutral-500 font-mono">#{rank}</span>
                      )}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 pl-2 flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center font-bold text-xs text-neutral-300 shrink-0">
                        {p.handle.slice(1, 3).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/${p.handle.replace(/^@/, '')}`}
                            className="font-bold text-white hover:underline truncate"
                          >
                            {p.handle}
                          </Link>
                          {p.equipped?.title === 'title_grandmaster' && (
                            <span className="text-[8px] px-1.5 py-0.2 bg-amber-950 border border-amber-500 text-amber-300 rounded font-black uppercase shrink-0">
                              👑 GRANDMASTER
                            </span>
                          )}
                          {p.equipped?.title === 'title_shadow_broker' && (
                            <span className="text-[8px] px-1.5 py-0.2 bg-purple-950 border border-purple-500 text-purple-300 rounded font-black uppercase shrink-0">
                              🕵️ SHADOW BROKER
                            </span>
                          )}
                        </div>
                        {p.displayName && (
                          <div className="text-[10px] text-neutral-500 truncate">{p.displayName}</div>
                        )}
                      </div>
                    </div>

                    {/* Aura Tier */}
                    <div className="w-24 flex items-center justify-center">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase flex items-center gap-1 ${tier.bg} ${tier.color}`}
                      >
                        <span>{tier.icon}</span>
                        <span className="hidden sm:inline">{tier.name}</span>
                      </span>
                    </div>

                    {/* Wins / Aura */}
                    <div className="w-24 text-right flex flex-col justify-center">
                      {activeTab === 'arcade' ? (
                        <>
                          <span className="font-black text-emerald-400">{p.arcadeTotalWins} WINS</span>
                          <span className="text-[9px] text-neutral-500">{p.arcadeElo} Elo</span>
                        </>
                      ) : (
                        <span className="font-black text-amber-400">⚡ {p.auraScore.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Tier Legend ── */}
          <div className="p-4 bg-neutral-950 border border-neutral-900 rounded-2xl space-y-2">
            <span className="text-[10px] text-neutral-500 uppercase tracking-widest block font-bold">
              // AURA LEVEL TIERS & REWARDS
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
              {[
                { tier: 'CELESTIAL', aura: '4,000+ Aura', icon: '🌌', color: 'text-purple-400' },
                { tier: 'GRANDMASTER', aura: '2,500+ Aura', icon: '👑', color: 'text-amber-400' },
                { tier: 'DIAMOND', aura: '1,200+ Aura', icon: '💎', color: 'text-cyan-400' },
                { tier: 'GOLD', aura: '600+ Aura', icon: '🥇', color: 'text-yellow-400' },
                { tier: 'SILVER', aura: '200+ Aura', icon: '🥈', color: 'text-neutral-300' },
                { tier: 'BRONZE', aura: '0+ Aura', icon: '🥉', color: 'text-amber-600' },
              ].map((t) => (
                <div key={t.tier} className="p-2 rounded-xl bg-neutral-900 border border-neutral-800">
                  <div className={`font-bold ${t.color} flex items-center gap-1`}>
                    <span>{t.icon}</span>
                    <span className="text-[11px]">{t.tier}</span>
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">{t.aura}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Nav for Mobile */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
