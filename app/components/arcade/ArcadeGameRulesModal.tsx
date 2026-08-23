"use client";

import React, { useState } from "react";
import { HelpCircle, X, BookOpen, Sparkles, Trophy, Mic2, ShieldCheck, Search } from "lucide-react";
import { ArcadeGameType } from "@/lib/arcade";

export interface GameRuleDetail {
  id: string;
  name: string;
  rank: number;
  category: string;
  icon: string;
  overview: string;
  howToPlay: string[];
  voiceGuide: string;
  scoring: string;
  proTip: string;
}

export const ARCADE_GAME_RULES: Record<string, GameRuleDetail> = {
  ludo: {
    id: "ludo",
    name: "15x15 Cyber Ludo",
    rank: 1,
    category: "Tactical Boards & Grids",
    icon: "🎲",
    overview: "Classic 4-player race to the center home terminal. Roll 6 to deploy nodes, capture opponent tokens on open track cells, and navigate safely on star-shielded checkpoints.",
    howToPlay: [
      "Roll the 3D die on your turn.",
      "A roll of 6 allows you to deploy a token from base to the starting track.",
      "Move tokens clockwise around the 52-cell track.",
      "Landing on an opponent token on non-safe tiles captures them back to base.",
      "Navigate all 4 tokens into the central home triangle to win."
    ],
    voiceGuide: "Use open voice for banter, negotiating non-aggression pacts, and celebrating lucky rolls.",
    scoring: "Winner gets +200 Aura Points; capturing opponent tokens awards +25 Aura bonus.",
    proTip: "Keep tokens paired on safe stars until you can strike vulnerable opponent leads!"
  },
  chess: {
    id: "chess",
    name: "Chess Grid Protocol",
    rank: 2,
    category: "Tactical Boards & Grids",
    icon: "♟️",
    overview: "The legendary 8x8 tactical battlefield. Control the center, protect your King, execute tactical pins and forks, and deliver checkmate.",
    howToPlay: [
      "Tap any of your pieces to see highlighted valid move coordinates.",
      "Tap a highlighted destination cell to move or capture.",
      "Standard FIDE chess rules apply: Castling, En Passant, and Pawn Promotion.",
      "Checkmate opponent King to seal victory."
    ],
    voiceGuide: "Analyze positions out loud with spectators or challenge your opponent with tactical psychological pressure.",
    scoring: "Checkmate victory grants +250 Aura; Stalemate splits stakes.",
    proTip: "Develop minor pieces (Knights and Bishops) before launching early Queen assaults."
  },
  pool: {
    id: "pool",
    name: "8-Ball Pool",
    rank: 3,
    category: "2D Physics & Tabletop",
    icon: "🎱",
    overview: "Real-time 2D canvas physics billiard table. Aim your cue stick, pull back for impulse power, pocket your assigned group (Solids or Stripes), and finish on the 8-Ball.",
    howToPlay: [
      "Drag and rotate your finger/mouse to aim the laser cue line.",
      "Pull back the impulse power meter and release to strike the cue ball.",
      "The first ball potted on the open table assigns your group (Solids 1-7 or Stripes 9-15).",
      "Pocket all balls in your group, then call pocket and sink the black 8-ball to win."
    ],
    voiceGuide: "Call out trick shots, bank shots, and combos in live audio to hypetrain the room.",
    scoring: "+200 Aura for sinking the 8-ball legitimately; scratching on the 8-ball forfeits the match.",
    proTip: "Use gentle impulse power on near-pocket shots to avoid cue ball bounce-outs."
  },
  uno: {
    id: "uno",
    name: "Uno / Flow Override",
    rank: 4,
    category: "Card & Bluffing",
    icon: "🎴",
    overview: "High-octane card battle. Match the top discard pile by color, number, or symbol. Drop Skips, Reverses, +2s, and Wild +4s to empty your hand first!",
    howToPlay: [
      "Match the active discard card by color or number.",
      "Action cards trigger instantly: Skip cancels next turn, Reverse swaps turn order.",
      "+2 and +4 Wild force the next player to draw cards and forfeit their turn.",
      "Tap the UNO button when holding only 1 card remaining to avoid penalty."
    ],
    voiceGuide: "Shout 'UNO!' over the live microphone and trash-talk players about to draw +4 cards.",
    scoring: "+150 Aura to the first player with 0 cards.",
    proTip: "Save your Wild +4 cards for late-game defensive reversals!"
  },
  carrom: {
    id: "carrom",
    name: "Carrom Board",
    rank: 5,
    category: "2D Physics & Tabletop",
    icon: "⚪",
    overview: "Traditional tabletop physics. Position your striker on the baseline, aim along target vectors, and flick to pocket White coins, Black coins, and the high-value Red Queen.",
    howToPlay: [
      "Slide the striker along your baseline.",
      "Drag back to set flick trajectory and velocity.",
      "Pocket White coins (+10 pts) or Black coins (+5 pts).",
      "Pocketing the Red Queen (+25 pts) requires a cover coin on the same or next turn."
    ],
    voiceGuide: "Discuss striker rebound angles with spectators on the audio stage.",
    scoring: "Player with the highest total coin points at board clearance wins +180 Aura.",
    proTip: "Target bank shots off the outer wooden frame when direct pocket lines are blocked."
  },
  raja_mantri: {
    id: "raja_mantri",
    name: "Raja Mantri Chor Sipahi",
    rank: 9,
    category: "Nostalgic Paper & Classroom",
    icon: "👑",
    overview: "Classic Indian classroom paper chit bluffing game. 4 folded chits (Raja, Mantri, Sipahi, Chor) are shuffled. Raja reveals and commands Mantri to cross-examine and catch the Chor!",
    howToPlay: [
      "Firebase secretly assigns folded paper chits to all 4 players.",
      "The Raja reveals themselves and calls on mic: 'Mera Mantri Kaun? Chor ka pata lagao!'",
      "The Mantri identifies themselves and cross-examines the other 2 players over live audio.",
      "The Mantri taps the suspect node on-screen.",
      "If correct: Raja gets 1000, Mantri 800, Sipahi 500, Chor 0. If wrong: Chor escapes with 800 and Mantri gets 0!"
    ],
    voiceGuide: "Pure vocal micro-expression analysis! Sipahi and Chor both bluff innocence on the mic.",
    scoring: "Points: Raja (1000), Mantri (800), Sipahi (500), Chor (800 on escape). Winner earns +200 Aura.",
    proTip: "Listen for hesitations, stuttering, or over-defensive explanations during the Mantri's cross-examination."
  },
  hand_cricket: {
    id: "hand_cricket",
    name: "Hand Cricket / Odd-Even",
    rank: 10,
    category: "Nostalgic Paper & Classroom",
    icon: "🏏",
    overview: "The ultimate schoolyard finger showdown. Batsman and Bowler throw numbers 1 to 6 simultaneously. Matching numbers equals OUT; differing numbers score runs for the batsman.",
    howToPlay: [
      "Select a number from 1 to 6 on the keypad.",
      "Both players' choices are revealed simultaneously in lockstep.",
      "If choices match (e.g. 4 vs 4): WICKET! The batsman is OUT.",
      "If choices differ: The batsman scores runs equal to their chosen number.",
      "Innings swap upon wicket; highest runs wins the match."
    ],
    voiceGuide: "Engage in mind games: announce 'I am throwing 6!' over mic to trick the bowler into matching.",
    scoring: "+150 Aura to the winning captain.",
    proTip: "Alternate between conservative 1-2 runs and sudden 6s to disrupt bowler prediction patterns."
  },
  book_cricket: {
    id: "book_cricket",
    name: "Book Cricket Page Flipper",
    rank: 12,
    category: "Nostalgic Paper & Classroom",
    icon: "📖",
    overview: "Nostalgic textbook cricket. Tap to flip to a random page in the book. The last digit determines your score (2, 4, 6) while 0 or 8 counts as an OUT!",
    howToPlay: [
      "Tap the flip textbook button on your ball turn.",
      "Even digits 2, 4, 6 score direct runs.",
      "Odd digits 1, 3, 5, 7, 9 score 1 single run.",
      "Digits ending in 0 or 8 trigger an immediate Wicket OUT.",
      "Accumulate maximum runs before losing your wicket."
    ],
    voiceGuide: "Give live ball-by-ball radio commentary as pages are flipped on stage.",
    scoring: "+100 Aura awarded based on runs scored.",
    proTip: "Fast rhythm flipping keeps the suspense high for spectators!"
  },
  skribbl: {
    id: "skribbl",
    name: "Vector Skribbl / Pictionary",
    rank: 14,
    category: "Voice Party & Social Deduction",
    icon: "🎨",
    overview: "Real-time vector canvas sketching. Active drawer receives a secret prompt and sketches on canvas while listeners type guesses into chat or guess over mic.",
    howToPlay: [
      "Active drawer sketches on the 2D vector canvas using finger or mouse.",
      "Canvas stroke paths sync in real-time to all connected players.",
      "Listeners receive masked letter hints (e.g. '_ _ _ _ _').",
      "Type guesses in the guess input bar. Correct guesses award instant score points."
    ],
    voiceGuide: "Give funny audio clues (without saying the secret word) while drawing.",
    scoring: "+50 Aura for correct guessers; +75 Aura for the drawer when multiple players guess correctly.",
    proTip: "Draw the overall silhouette or distinctive outlines before filling in small details."
  },
  poker: {
    id: "poker",
    name: "Texas Hold'em Poker",
    rank: 15,
    category: "Card & Bluffing",
    icon: "♠️",
    overview: "Heads-up & multiplayer card protocol. Combine your 2 private hole cards with 5 community cards (Flop, Turn, River) to craft the strongest 5-card poker hand.",
    howToPlay: [
      "Receive 2 secret hole cards.",
      "Pre-flop betting round: Check, Call, Raise, or Fold.",
      "The Flop (3 community cards), Turn (4th card), and River (5th card) are revealed consecutively with betting rounds.",
      "Showdown: Best 5-card poker hand claims the total pot."
    ],
    voiceGuide: "Vocal bluffing at its finest! Talk confidently on a weak hand or act hesitant with pocket Aces.",
    scoring: "Winner takes the accumulated Aura pot.",
    proTip: "Position is power! Acting last allows you to gauge opponent betting aggression."
  },
  glow_hockey: {
    id: "glow_hockey",
    name: "Glow Hockey Neon Clash",
    rank: 16,
    category: "2D Physics & Tabletop",
    icon: "⚡",
    overview: "Ultra-responsive 60FPS neon air hockey. Slide your paddle to deflect the glowing puck at high velocities and score in the opponent's goal slot.",
    howToPlay: [
      "Drag your finger/mouse to control your neon striker paddle.",
      "Deflect the puck with speed to bounce off walls into opponent goal.",
      "First player to score 5 goals wins the round."
    ],
    voiceGuide: "Fast-paced trash talk and goal celebrations over open audio.",
    scoring: "+150 Aura to the winner.",
    proTip: "Slice the puck at sharp 45-degree angles to create unpredictable bank-shot rebounds."
  },
  npat: {
    id: "npat",
    name: "Name, Place, Animal, Thing",
    rank: 17,
    category: "Nostalgic Paper & Classroom",
    icon: "📝",
    overview: "High-speed vocabulary sprint. A letter is announced (e.g. 'S'). Players race to write valid entries across Name, Place, Animal, and Thing categories.",
    howToPlay: [
      "System announces a random letter.",
      "Type valid entries starting with that letter for Name, Place, Animal, and Thing.",
      "Tap Submit Card before time runs out.",
      "Each valid submission earns +40 score points."
    ],
    voiceGuide: "Debate regional places and rare animal names over voice with room participants.",
    scoring: "+40 Aura per successful round.",
    proTip: "Think of uncommon obscure geographic places to ensure unique answers!"
  },
  codenames: {
    id: "codenames",
    name: "Codenames Decryption Grid",
    rank: 18,
    category: "Voice Party & Social Deduction",
    icon: "🕵️",
    overview: "5x5 word matrix deduction. Spymasters view secret role keys and give one-word clues with a number. Operatives tap grid cards to reveal agents while avoiding the Assassin!",
    howToPlay: [
      "5x5 grid contains 25 word cards.",
      "Spymasters see the color key (Red, Blue, Neutral, Assassin).",
      "Spymaster gives a clue on voice (e.g. 'Ocean 2').",
      "Operatives tap cards to reveal their team's agents.",
      "Revealing the black Assassin card causes instant round defeat!"
    ],
    voiceGuide: "Spymasters must maintain a completely neutral vocal tone to avoid giving illegal audio hints.",
    scoring: "+200 Aura for the winning team.",
    proTip: "Link multiple words with conceptual categories (e.g., 'Physics 3' for Wave, Laser, Energy)."
  },
  bingo: {
    id: "bingo",
    name: "Bingo 25-Cross Grid",
    rank: 27,
    category: "Nostalgic Paper & Classroom",
    icon: "🔢",
    overview: "Fill a 5x5 grid with numbers 1 to 25. Players take turns calling numbers over live voice. Crossing 5 complete horizontal, vertical, or diagonal rows spells B-I-N-G-O to win!",
    howToPlay: [
      "Every player gets a randomized 5x5 number grid (1–25).",
      "Players take turns calling numbers over the mic.",
      "Tap called numbers to cross them out on your grid.",
      "Every completed line lights up one letter in B-I-N-G-O.",
      "First player to complete all 5 letters wins."
    ],
    voiceGuide: "Call numbers rhythmically and bluff your line completion status.",
    scoring: "+150 Aura for first B-I-N-G-O declaration.",
    proTip: "Cross numbers near the center tile (row 3, col 3) to advance horizontal, vertical, and both diagonal lines simultaneously!"
  },
  hangman: {
    id: "hangman",
    name: "Hangman Word Scaffold",
    rank: 29,
    category: "Nostalgic Paper & Classroom",
    icon: "🔤",
    overview: "Decrypt the secret system cipher word before the retro ASCII gallows stickman is fully assembled. 6 strikes allowed!",
    howToPlay: [
      "System chooses a secret technical/dictionary keyword.",
      "Tap letters on the A-Z keyboard to guess.",
      "Correct letters reveal their positions in the word.",
      "Wrong letters add a limb to the ASCII gallows.",
      "Complete the word before 6 strikes to survive and win."
    ],
    voiceGuide: "Collaborate with spectators over voice to brainstorm possible vowel and consonant combinations.",
    scoring: "+150 Aura for decrypting the word.",
    proTip: "Always test common vowels (E, A, I, O) and frequent consonants (R, S, T, N) first!"
  },
  liars_dice: {
    id: "liars_dice",
    name: "Liar's Dice / Perudo",
    rank: 30,
    category: "Card & Bluffing",
    icon: "🎲",
    overview: "High-stakes dice bluffing. Players roll 5 dice in secret trays. Bid consecutively on the total global count of a specific face value until someone calls 'BLUFF!'",
    howToPlay: [
      "Roll 5 secret dice hidden in your tray.",
      "Make a bid on the total number of dice showing a specific face (e.g. 'Four 5s').",
      "Next player must raise the quantity or higher face value, or tap [ CALL BLUFF! ].",
      "Showdown reveals all dice: if the bid was true, challenger loses; if false, bidder loses."
    ],
    voiceGuide: "Listen closely to voice inflections, hesitations, and confidence levels when bids escalate.",
    scoring: "+180 Aura to the surviving master bluff.",
    proTip: "1s (Aces) are often wild unless declared otherwise, doubling probability calculations!"
  },
  math_blitz: {
    id: "math_blitz",
    name: "Matrix Math Blitz",
    rank: 45,
    category: "Solo Logic & Puzzles",
    icon: "⚡",
    overview: "1v1 high-speed mental arithmetic duel. Solve incoming math equations rapidly using the on-screen keypad to accumulate points before time expires.",
    howToPlay: [
      "Continuous equations appear on the screen.",
      "Type the answer on the numeric keypad and tap ENTER.",
      "Correct solutions grant instant +20 score points.",
      "First to reach the score cap wins the speed duel."
    ],
    voiceGuide: "Race against opponents with live audio pressure and countdown commentary.",
    scoring: "+20 Aura per correct equation.",
    proTip: "Use mental decomposition (e.g., 28 + 47 = 20 + 40 + 8 + 7 = 75) for sub-second inputs!"
  },
};

interface ArcadeGameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGameType?: string;
}

export default function ArcadeGameRulesModal({
  isOpen,
  onClose,
  initialGameType = "ludo",
}: ArcadeGameRulesModalProps) {
  const [selectedId, setSelectedId] = useState<string>(initialGameType);
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const currentRule = ARCADE_GAME_RULES[selectedId] || ARCADE_GAME_RULES.ludo;
  const filteredList = Object.values(ARCADE_GAME_RULES).filter(
    (g) =>
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 font-mono text-white select-none">
      <div className="w-full max-w-3xl bg-neutral-950 border-2 border-white max-h-[90vh] flex flex-col shadow-[0_0_50px_rgba(255,255,255,0.15)]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b-2 border-white p-3.5 bg-black">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h2 className="font-extrabold text-xs sm:text-sm uppercase tracking-widest text-white">
              // ARCADE LOUNGE // MASTER RULES & TACTICAL MANUAL
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 border border-neutral-800 hover:border-white text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-neutral-800 bg-neutral-900 flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH GAME RULES, CATEGORIES, OR MECHANICS..."
            className="w-full bg-transparent text-xs font-mono text-white placeholder-neutral-500 uppercase outline-none"
          />
        </div>

        {/* Modal Body: Left game selector + Right rule reader */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-800">
          {/* Game List Sidebar */}
          <div className="max-h-48 md:max-h-[60vh] overflow-y-auto p-2 space-y-1 bg-black">
            {filteredList.map((rule) => {
              const isSelected = rule.id === selectedId;
              return (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() => setSelectedId(rule.id)}
                  className={`w-full p-2 text-left text-xs uppercase flex items-center justify-between transition-all cursor-pointer rounded ${
                    isSelected
                      ? "bg-white text-black font-black"
                      : "bg-neutral-950 text-neutral-300 hover:bg-neutral-900 hover:text-white border border-neutral-800"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span>{rule.icon}</span>
                    <span className="truncate">#{rule.rank} {rule.name}</span>
                  </div>
                  {isSelected && <span className="text-[9px] font-mono shrink-0">● ACTIVE</span>}
                </button>
              );
            })}
          </div>

          {/* Detailed Rule Dossier View */}
          <div className="md:col-span-2 p-4 sm:p-5 overflow-y-auto max-h-[60vh] space-y-4 bg-neutral-950">
            {/* Header info */}
            <div className="border-b border-neutral-800 pb-3 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-neutral-400 font-bold uppercase">
                <span>RANK #{currentRule.rank} // {currentRule.category}</span>
                <span className="text-emerald-400 border border-emerald-800 bg-emerald-950/40 px-1.5 py-0.5">
                  $0 SERVER STACK
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-white uppercase flex items-center gap-2">
                <span>{currentRule.icon}</span>
                <span>{currentRule.name}</span>
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {currentRule.overview}
              </p>
            </div>

            {/* How to play */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-white tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>// STEP-BY-STEP HOW TO PLAY:</span>
              </h4>
              <ul className="space-y-1.5 pl-2">
                {currentRule.howToPlay.map((step, idx) => (
                  <li key={idx} className="text-xs text-neutral-300 flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">[{idx + 1}]</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Voice Guide */}
            <div className="border border-neutral-800 bg-neutral-900 p-3 rounded-lg space-y-1">
              <span className="text-[10px] text-amber-400 font-bold uppercase flex items-center gap-1">
                <Mic2 className="w-3 h-3" />
                <span>VOICE LOUNGE & SOCIAL SYNERGY:</span>
              </span>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {currentRule.voiceGuide}
              </p>
            </div>

            {/* Scoring & Pro Tip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="border border-neutral-800 bg-black p-2.5 rounded space-y-1">
                <span className="text-[10px] text-neutral-400 font-bold uppercase flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-yellow-400" />
                  <span>AURA REWARDS & SCORING:</span>
                </span>
                <p className="text-[11px] text-neutral-300">{currentRule.scoring}</p>
              </div>

              <div className="border border-neutral-800 bg-black p-2.5 rounded space-y-1">
                <span className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>TACTICAL PRO TIP:</span>
                </span>
                <p className="text-[11px] text-neutral-300">{currentRule.proTip}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t-2 border-white p-3 bg-black flex items-center justify-between text-xs">
          <span className="text-[10px] text-neutral-400">
            PRESS [ESC] OR CLICK CLOSE TO RETURN TO ARENA
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-white bg-white text-black font-black text-xs uppercase hover:bg-neutral-200 transition-all cursor-pointer"
          >
            [ CLOSE MANUAL ]
          </button>
        </div>
      </div>
    </div>
  );
}
