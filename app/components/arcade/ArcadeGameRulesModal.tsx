"use client";

import React, { useState } from "react";
import { HelpCircle, X, BookOpen, Sparkles, Trophy, Mic2, ShieldCheck, Search, Filter } from "lucide-react";

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
      "A roll of 6 allows you to deploy a token from base to the starting track and grants a bonus roll.",
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
    overview: "The legendary 8x8 battlefield. Control the center, protect your King, execute tactical pins and forks, and deliver checkmate in pure high-contrast monochrome.",
    howToPlay: [
      "Tap any of your pieces to see highlighted valid move coordinates.",
      "Pawns move 1 square forward (or 2 on their first move) and capture diagonally.",
      "Knights jump in an 'L' shape (2 squares in one direction, 1 square perpendicular).",
      "Bishops move diagonally; Rooks move horizontally/vertically; Queens move in any straight direction.",
      "Kings move 1 square in any direction. Deliver checkmate to the opponent King to win."
    ],
    voiceGuide: "Analyze positions out loud with spectators or challenge your opponent with tactical psychological pressure.",
    scoring: "Checkmate victory grants +250 Aura; Stalemate splits stakes.",
    proTip: "Control the 4 center squares (d4, d5, e4, e5) and develop minor pieces early!"
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
      "If you cannot play a matching card, tap the Draw Deck to draw.",
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
  connect4: {
    id: "connect4",
    name: "Connect Four & Tic-Tac-Toe",
    rank: 6,
    category: "Tactical Boards & Grids",
    icon: "🔴",
    overview: "Vertical gravity alignment grid. Drop colored tokens into 7 vertical columns to connect 4 in a line horizontally, vertically, or diagonally.",
    howToPlay: [
      "Tap a column to drop your token to the lowest unoccupied slot.",
      "Alternate turns with your opponent.",
      "Form an unbroken line of 4 tokens of your color.",
      "Block opponent lines before they complete a winning connection."
    ],
    voiceGuide: "Set up verbal distractions to bait opponents into missing diagonal threats.",
    scoring: "+120 Aura to the winner.",
    proTip: "Build horizontal double-threats on row 3 so your opponent can only block one side!"
  },
  sudoku: {
    id: "sudoku",
    name: "Sudoku Data Matrix",
    rank: 7,
    category: "Solo Logic & Puzzles",
    icon: "🧩",
    overview: "9x9 number-placement matrix. Fill the grid so that every row, column, and 3x3 box contains digits 1 to 9 with zero duplicate errors.",
    howToPlay: [
      "Tap an empty grid cell to highlight it.",
      "Select a number from 1 to 9 on the keypad.",
      "Every row, column, and 3x3 block must contain digits 1–9 without repeats.",
      "3 mistake strikes result in game over."
    ],
    voiceGuide: "Work through tough logic corners cooperatively with listeners on the voice channel.",
    scoring: "+150 Aura for complete error-free matrix resolution.",
    proTip: "Use candidate elimination: scan for rows that only have one missing number first."
  },
  codenames: {
    id: "codenames",
    name: "Mafia & Codenames Decryption",
    rank: 8,
    category: "Voice Party & Social Deduction",
    icon: "🎭",
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
  raja_mantri: {
    id: "raja_mantri",
    name: "Raja Mantri Chor Sipahi",
    rank: 9,
    category: "Nostalgic Paper & Classroom",
    icon: "👑",
    overview: "Classic Indian classroom paper chit bluffing game. 4 folded chits (Raja 1000, Mantri 800, Sipahi 500, Chor 0) are shuffled. Raja commands Mantri to cross-examine and catch the Chor!",
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
  snakes_and_ladders: {
    id: "snakes_and_ladders",
    name: "Snakes & Ladders (Circuit Jumpers)",
    rank: 11,
    category: "Tactical Boards & Grids",
    icon: "🪜",
    overview: "100-cell circuit race. Roll the die to advance your pawn from tile 1 to 100. Climb ladders to bypass rows, but beware of data snakes that slide you down!",
    howToPlay: [
      "Roll the 6-sided die on your turn.",
      "Your pawn advances step-by-step along the boustrophedon (zigzag) 10x10 track.",
      "Landing on a Ladder base (e.g. 4->14, 28->84, 71->91) immediately teleports you up.",
      "Landing on a Snake head (e.g. 17->7, 62->19, 99->78) drops you down to its tail.",
      "First pawn to land precisely on tile 100 wins the match."
    ],
    voiceGuide: "Live reaction commentary when opponents hit nasty snake drops on tile 99!",
    scoring: "+150 Aura to the first player to reach cell 100.",
    proTip: "Rolls near cell 90+ require exact numbers to reach 100, so manage your rolls carefully!"
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
  wordle: {
    id: "wordle",
    name: "Scrabble & Wordle Cipher",
    rank: 13,
    category: "Solo Logic & Puzzles",
    icon: "🔤",
    overview: "5-letter daily and multiplayer word deciphering. 6 guesses to find the secret terminal word with color-coded feedback.",
    howToPlay: [
      "Type a 5-letter dictionary word and hit ENTER.",
      "Green tile: Letter is correct and in the exact position.",
      "Yellow tile: Letter exists in the word but in a different slot.",
      "Gray tile: Letter does not exist in the word.",
      "Deduce the solution within 6 attempts."
    ],
    voiceGuide: "Compare letter choices and brainstorm linguistic roots with spectators.",
    scoring: "+150 Aura for guessing in fewer than 4 attempts.",
    proTip: "Start with vowel-heavy words like ARISE, CRANE, or AUDIO to eliminate key letters early!"
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
  battleship: {
    id: "battleship",
    name: "Battleship Radar Command",
    rank: 19,
    category: "Tactical Boards & Grids",
    icon: "🚢",
    overview: "10x10 naval sub-grid deduction. Call out grid coordinates (A1 to J10) to locate and sink enemy hidden carriers, destroyers, and submarines.",
    howToPlay: [
      "Place your fleet of 5 ships on your private 10x10 coordinate grid.",
      "Take turns calling coordinate strikes on the opponent's radar grid.",
      "Hits reveal ship segments; Misses show splash markers.",
      "First player to sink all 17 ship segments wins."
    ],
    voiceGuide: "Act surprised or bluff relief when opponents strike near your Carrier!",
    scoring: "+180 Aura to the commanding Admiral.",
    proTip: "Use a checkerboard firing pattern (every alternate square) to locate large ships with 50% fewer shots!"
  },
  minesweeper: {
    id: "minesweeper",
    name: "Minesweeper Clear",
    rank: 22,
    category: "Solo Logic & Puzzles",
    icon: "💣",
    overview: "Classic numerical logic grid. Reveal safe tiles while isolating hidden explosive mines using surrounding numeric adjacency clues.",
    howToPlay: [
      "Tap any tile to reveal what lies beneath.",
      "Numbers indicate how many mines touch that specific square.",
      "Long-press or switch to Flag mode to mark suspect mine tiles.",
      "Clear all non-mine tiles to complete the board."
    ],
    voiceGuide: "Stream your thought process and solve tricky 50/50 corners with spectator guidance.",
    scoring: "+120 Aura for board clearance.",
    proTip: "Look for 1-2-1 corner patterns: the mines are always under the 1s!"
  },
  game2048: {
    id: "game2048",
    name: "2048 Binary Merge",
    rank: 23,
    category: "Solo Logic & Puzzles",
    icon: "🔢",
    overview: "Sliding tile puzzle on a 4x4 matrix. Swipe tiles in 4 directions to merge matching powers of two and build the legendary 2048 tile.",
    howToPlay: [
      "Swipe or use arrow keys to slide all tiles in one direction.",
      "Matching number tiles collide and merge into their sum (2+2=4, 4+4=8, etc.).",
      "A new 2 or 4 tile spawns after every valid move.",
      "Reach 2048 without running out of empty slots to win."
    ],
    voiceGuide: "Share high scores and celebrate big 1024 merges on voice.",
    scoring: "Score equals accumulated merged tile values.",
    proTip: "Always keep your highest value tile locked in one specific corner (e.g. bottom-right)!"
  },
  blackjack: {
    id: "blackjack",
    name: "Blackjack 21 (Data Dealer)",
    rank: 24,
    category: "Card & Bluffing",
    icon: "🃏",
    overview: "Classic casino card table. Build a card hand total closer to 21 than the dealer without going over (busting).",
    howToPlay: [
      "Receive 2 initial cards (Numbered cards = face value, Face cards = 10, Aces = 1 or 11).",
      "HIT to request another card.",
      "STAND to end your turn and hold your hand.",
      "DOUBLE to double your bet for exactly one extra card.",
      "Beat the dealer's final hand to win the payout."
    ],
    voiceGuide: "Debate whether to hit on soft 17s with other players on the audio stage.",
    scoring: "+2x bet payout on standard win; +2.5x payout on natural Blackjack (21 on deal).",
    proTip: "Always stand on hard 17 or higher, and always hit on 8 or lower."
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
  dots_and_boxes: {
    id: "dots_and_boxes",
    name: "Dots and Boxes (Dabba)",
    rank: 28,
    category: "Tactical Boards & Grids",
    icon: "🕸️",
    overview: "Territory grid capture. Take turns connecting adjacent grid dots with lines. Completing the 4th side of a 1x1 box captures it and awards a bonus turn!",
    howToPlay: [
      "Tap between two adjacent dots to draw a connecting line.",
      "Closing the 4th wall of a box captures it with your initials.",
      "Capturing a box grants an immediate bonus line draw.",
      "Player with the most captured boxes at grid completion wins."
    ],
    voiceGuide: "Bait opponents into giving away long chains of boxes.",
    scoring: "+150 Aura to the player with the most boxes.",
    proTip: "Avoid placing the 3rd line on any box until you can trigger a multi-box chain reaction!"
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
    proTip: "1s (Aces) are wild, meaning they count as any called face value!"
  },
  gomoku: {
    id: "gomoku",
    name: "Gomoku (Five in a Row)",
    rank: 36,
    category: "Tactical Boards & Grids",
    icon: "⬛",
    overview: "15x15 intersection matrix. Black and White alternate placing stones on grid intersections to form an unbroken line of 5 stones.",
    howToPlay: [
      "Black places first on any grid intersection.",
      "Players alternate placing stones.",
      "First to connect 5 stones horizontally, vertically, or diagonally wins.",
      "Creating an open 3-in-a-row (unblocked at both ends) creates an unstoppable 4-win threat."
    ],
    voiceGuide: "Discuss positional aesthetics and stone territory with room members.",
    scoring: "+150 Aura to the winner.",
    proTip: "Look for 'four-three' intersections: moves that create both a 4-in-a-row and a 3-in-a-row simultaneously!"
  },
  reversi: {
    id: "reversi",
    name: "Reversi / Othello",
    rank: 37,
    category: "Tactical Boards & Grids",
    icon: "🔄",
    overview: "8x8 disk-flipping duel. Trap opponent disks between two of your own color to flip them. The player with the most disks when the board is full wins.",
    howToPlay: [
      "Place a disk on an empty square flanking opponent disks in any straight line.",
      "All trapped opponent disks flip to your color.",
      "If a player has no legal moves, their turn is skipped.",
      "Highest disk count at full board clearance wins."
    ],
    voiceGuide: "Call out corner flips and board edge control on voice.",
    scoring: "+160 Aura to the player with the most disks.",
    proTip: "Corners are permanent and cannot be flipped back! Control the 4 corner squares at all costs."
  },
  yahtzee: {
    id: "yahtzee",
    name: "Yahtzee / Yacht Dice",
    rank: 40,
    category: "Card & Bluffing",
    icon: "🎲",
    overview: "5-dice probability optimization. Roll dice up to 3 times per turn, locking desired faces to complete scoring combinations (Full House, Straights, Yahtzee 5-of-a-kind).",
    howToPlay: [
      "Roll 5 dice on your turn.",
      "Tap dice to lock/unlock them, and re-roll the rest up to 2 additional times.",
      "Select a scorecard category (e.g. Fives, Three-of-a-kind, Large Straight, Yahtzee).",
      "Accumulate the highest total points across all 13 scorecard rounds."
    ],
    voiceGuide: "Cheer for high-stakes 5-of-a-kind Yahtzee rolls on stage.",
    scoring: "+200 Aura for highest final scorecard total.",
    proTip: "If rolling 3-of-a-kind early, prioritize going for a Full House or 4-of-a-kind!"
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
  quoridor: {
    id: "quoridor",
    name: "Quoridor Firewall Runner",
    rank: 46,
    category: "Tactical Boards & Grids",
    icon: "🧱",
    overview: "9x9 maze and wall-placement race. Advance your pawn to the opposite baseline while placing blocking wall fences to obstruct your opponent's path.",
    howToPlay: [
      "Each turn: Either move your pawn 1 square, or place a 2-unit blocking wall.",
      "Walls block movement across grid edges for both players.",
      "Rules prohibit completely closing off an opponent's path to their goal.",
      "First pawn to reach any square on the opponent's starting edge wins."
    ],
    voiceGuide: "Debate optimal maze detours and defensive wall angles on the mic.",
    scoring: "+180 Aura to the winning runner.",
    proTip: "Save at least 3 walls for the endgame to block opponent final sprints!"
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
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>("ALL");

  if (!isOpen) return null;

  const currentRule = ARCADE_GAME_RULES[selectedId] || ARCADE_GAME_RULES.ludo;
  const allRulesList = Object.values(ARCADE_GAME_RULES).sort((a, b) => a.rank - b.rank);
  const filteredList = allRulesList.filter((g) => {
    const matchesCat = activeCategoryFilter === "ALL" || g.category === activeCategoryFilter;
    const matchesSearch =
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.overview.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const categories = ["ALL", "Tactical Boards & Grids", "Card & Bluffing", "2D Physics & Tabletop", "Nostalgic Paper & Classroom", "Voice Party & Social Deduction", "Solo Logic & Puzzles"];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-mono text-white select-none">
      <div className="w-full max-w-4xl bg-black border-2 border-white max-h-[92vh] flex flex-col shadow-[0_0_60px_rgba(255,255,255,0.2)]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b-2 border-white p-3.5 bg-black">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-white animate-pulse" />
            <h2 className="font-black text-xs sm:text-sm uppercase tracking-widest text-white">
              // ECHO ARCADE // 50-GAME MASTER RULES & TACTICAL MANUAL
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

        {/* Search & Category Filter Bar */}
        <div className="p-3 border-b border-neutral-800 bg-neutral-950 space-y-2">
          <div className="flex items-center gap-2 border border-neutral-800 px-2.5 py-1.5 bg-black">
            <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH ALL 50 GAME RULES (E.G. CHESS, LUDO, POKER, CARROM)..."
              className="w-full bg-transparent text-xs font-mono text-white placeholder-neutral-500 uppercase outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategoryFilter(cat)}
                className={`px-2.5 py-1 border font-bold uppercase whitespace-nowrap transition-all cursor-pointer ${
                  activeCategoryFilter === cat
                    ? "bg-white text-black border-white"
                    : "bg-black text-neutral-400 border-neutral-800 hover:border-neutral-600"
                }`}
              >
                {cat === "ALL" ? "ALL 50 RULES" : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Body: Left game catalog list + Right rule dossier */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-neutral-800">
          {/* Game List Sidebar */}
          <div className="max-h-44 md:max-h-[58vh] overflow-y-auto p-2 space-y-1 bg-black">
            {filteredList.map((rule) => {
              const isSelected = rule.id === selectedId;
              return (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() => setSelectedId(rule.id)}
                  className={`w-full p-2 text-left text-xs uppercase flex items-center justify-between transition-all cursor-pointer ${
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
          <div className="md:col-span-2 p-4 sm:p-5 overflow-y-auto max-h-[58vh] space-y-4 bg-neutral-950">
            {/* Header info */}
            <div className="border-b border-neutral-800 pb-3 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-neutral-400 font-bold uppercase">
                <span>RANK #{currentRule.rank} // {currentRule.category}</span>
                <span className="text-white border border-white bg-black px-1.5 py-0.5">
                  $0 SERVER INFRASTRUCTURE
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
                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                <span>// STEP-BY-STEP UNIVERSAL HOW TO PLAY:</span>
              </h4>
              <ul className="space-y-1.5 pl-1">
                {currentRule.howToPlay.map((step, idx) => (
                  <li key={idx} className="text-xs text-neutral-300 flex items-start gap-2">
                    <span className="text-white font-bold">[{idx + 1}]</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Voice Guide */}
            <div className="border border-neutral-800 bg-neutral-900 p-3 space-y-1">
              <span className="text-[10px] text-white font-black uppercase flex items-center gap-1">
                <Mic2 className="w-3 h-3 text-white" />
                <span>VOICE LOUNGE & SOCIAL INTERACTION:</span>
              </span>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {currentRule.voiceGuide}
              </p>
            </div>

            {/* Scoring & Pro Tip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="border border-neutral-800 bg-black p-2.5 space-y-1">
                <span className="text-[10px] text-neutral-400 font-bold uppercase flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-white" />
                  <span>AURA REWARDS & SCORING:</span>
                </span>
                <p className="text-[11px] text-neutral-300">{currentRule.scoring}</p>
              </div>

              <div className="border border-neutral-800 bg-black p-2.5 space-y-1">
                <span className="text-[10px] text-white font-bold uppercase flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-white" />
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
