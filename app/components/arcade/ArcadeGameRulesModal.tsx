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
  rummy: {
    id: "rummy",
    name: "Indian 13-Card Rummy",
    rank: 1,
    category: "Card & Bluffing",
    icon: "🃏",
    overview: "The quintessential skill-based 13-card game. Arrange all 13 cards into valid sequences (runs) and sets. A valid declaration requires at least one Pure Sequence without Jokers and a second Sequence.",
    howToPlay: [
      "Each player is dealt 13 cards with a randomly selected Wild Joker rank and an open discard pile.",
      "On your turn, draw one card from either the closed draw deck or open discard pile.",
      "Pure Sequence (Mandatory): 3 or more consecutive cards of the same suit without a Joker (e.g., 4♠-5♠-6♠).",
      "Second Sequence: 3 or more consecutive cards of the same suit, with or without a Joker.",
      "Remaining cards can form valid Sets (same rank in different suits) or additional Sequences.",
      "Discard your 14th card into the finish slot to declare a valid Show with 0 deadwood points."
    ],
    voiceGuide: "Discuss meld combinations and bluff your discard selections over open voice.",
    scoring: "Winner earns +250 Aura; losing players get penalty deadwood points based on unmatched cards.",
    proTip: "Prioritize building your Pure Sequence immediately before utilizing Wild Jokers in secondary sets!"
  },
  call_break: {
    id: "call_break",
    name: "Call Break (Lakdi)",
    rank: 2,
    category: "Card & Bluffing",
    icon: "♠️",
    overview: "4-player strategic trick-taking classic. Spades (♠) are permanent trumps. Players announce trick bids (1-13) before each round and must win at least their bid.",
    howToPlay: [
      "13 cards are dealt to each of 4 players.",
      "Each player announces a bid (1 to 13) representing the number of tricks they intend to take.",
      "The leader plays any card. Subsequent players must follow suit and MUST play a higher card if held.",
      "If void in the led suit, you must play a Spade (trump) if possible; otherwise, any card can be discarded.",
      "The trick is won by the highest card of the led suit, or the highest Spade trump played.",
      "Making bid N awards N + 0.1 per overtrick; failing to reach bid N deducts -N penalty points."
    ],
    voiceGuide: "Coordinate bids, call out trump breaks, and analyze overtrick strategies over live mic.",
    scoring: "+200 Aura for highest cumulative score across 5 rounds.",
    proTip: "Count trumps played early and avoid wasting high Spades on non-critical tricks!"
  },
  teen_patti: {
    id: "teen_patti",
    name: "Teen Patti (3-Card Flush)",
    rank: 3,
    category: "Card & Bluffing",
    icon: "🔥",
    overview: "High-octane 3-card social wagering game. Play Blind (betting 1x stake without seeing cards) or Seen (betting 2x stake after checking cards). Hold the highest 3-card combination or bluff opponents into folding.",
    howToPlay: [
      "An ante (boot) is collected and 3 cards are dealt face-down to each player.",
      "Play Blind (1x stake) or tap 'SEE CARDS' to play Seen (2x stake).",
      "Actions: Chaal (match/raise bet), Pack/Fold (forfeit hand), or Showdown (compare hands when 2 players remain).",
      "Hand Rankings: Trail/Trio (AAA) > Pure Sequence (Straight Flush) > Sequence (Straight) > Color (Flush) > Pair > High Card.",
      "Showdown reveals hands; highest 3-card combination sweeps the accumulated pot."
    ],
    voiceGuide: "Microphone bluffing, audio tells, and confidence baiting are the heart of Teen Patti.",
    scoring: "Winner takes entire accumulated coin pot + Aura bonus.",
    proTip: "Playing Blind exerts psychological pressure and cuts betting costs in half!"
  },
  bhabhi_thulla: {
    id: "bhabhi_thulla",
    name: "Bhabhi / Thulla (Get Away)",
    rank: 8,
    category: "Card & Bluffing",
    icon: "🛡️",
    overview: "Desi trick shedding survival game. The player with the Ace of Spades leads. Follow suit or throw a penalty card ('Thulla') to force the highest bidder to pick up the entire trick. Escape cards to get away!",
    howToPlay: [
      "All cards are dealt out. The player holding the Ace of Spades (A♠) leads the first trick.",
      "Players must follow the led suit. Highest card of the led suit wins the trick and leads next.",
      "If you are void in the led suit, throw a penalty card of another suit ('Thulla').",
      "When a Thulla is thrown, the player who threw the highest card of the led suit must pick up all cards into their hand!",
      "Players who shed all cards successfully 'Get Away'. The last player holding cards is named the Bhabhi."
    ],
    voiceGuide: "Audio trash-talk and celebrating when you escape and avoid becoming the room's Bhabhi.",
    scoring: "Winner gets +200 Aura; the Bhabhi suffers public title penalty.",
    proTip: "Dump high Aces and Kings early when you have suit coverage to avoid picking up Thulla penalties!"
  },
  mendicot: {
    id: "mendicot",
    name: "Mendicot / Dehla Pakad",
    rank: 9,
    category: "Card & Bluffing",
    icon: "👥",
    overview: "2v2 partnership trick-taking classic. Work with your partner across the table to capture all four 10s (Dehlas/Mendis) to trigger a whitewash victory (Kot).",
    howToPlay: [
      "13 cards dealt per player in fixed opposite partnerships (Team 1 vs Team 2).",
      "Trump is established when a player fails to follow suit (the card discarded sets trump).",
      "Standard trick-taking applies: follow suit if able, otherwise trump or discard.",
      "Capturing 3 or 4 tens (10♠, 10♥, 10♦, 10♣) wins the round for your team.",
      "Capturing all 4 tens achieves a Mendicot / Whitewash!"
    ],
    voiceGuide: "Strategize non-verbal partner signals and analyze opponent voids on voice.",
    scoring: "Winning partnership shares +250 Aura; achieving all 4 10s earns double bonus.",
    proTip: "Save high trumps specifically to capture opponent 10s when they are forced to discard them!"
  },
  cheat_bluff: {
    id: "cheat_bluff",
    name: "Cheat / Bluff (I Doubt It)",
    rank: 10,
    category: "Card & Bluffing",
    icon: "🚨",
    overview: "High-stakes face-down card shedding. Players discard 1 to 4 cards sequentially (Aces, Twos, Threes...) declaring their rank, but are allowed to lie! Challenge bluffs with 'CHEAT!'.",
    howToPlay: [
      "Cards are dealt out. Player 1 discards 1 to 4 cards face-down declaring 'Aces'.",
      "Next players discard sequentially ('Twos', 'Threes', ..., 'Kings', wrapping to 'Aces').",
      "You can place the honest cards or bluff with completely different cards.",
      "Any player can shout 'CHEAT!' before the next play.",
      "If the discarder lied, they pick up the entire discard pile! If they were honest, the challenger picks up the pile.",
      "First player to empty their hand without an unrefuted cheat challenge wins."
    ],
    voiceGuide: "Pure voice deception: control voice pitch, micro-hesitations, and fake alibis over the mic.",
    scoring: "+200 Aura for successfully shedding your hand.",
    proTip: "Discard small 1-card bluffs early so if caught, you pick up a tiny pile!"
  },
  solitaire: {
    id: "solitaire",
    name: "Klondike Solitaire",
    rank: 13,
    category: "Solo Logic & Puzzles",
    icon: "🂠",
    overview: "The world's favorite card puzzle. Arrange 7 tableau columns in alternating red/black descending sequences and transfer all 52 cards onto the 4 foundation piles from Ace to King.",
    howToPlay: [
      "7 tableau columns are dealt (1 to 7 cards, top card face-up).",
      "Build downward on tableau in alternating colors (e.g. Red 6 onto Black 7).",
      "Only Kings (K) can fill empty tableau columns.",
      "Transfer Aces onto the 4 foundation piles, building upward to King in matching suit.",
      "Cycle through the stockpile to uncover unplayed cards."
    ],
    voiceGuide: "Stream your solo gameplay while chatting in background audio rooms.",
    scoring: "+150 Aura upon clearing all 52 cards onto foundations.",
    proTip: "Always prioritize revealing face-down tableau cards before drawing from the stockpile!"
  },
  uno: {
    id: "uno",
    name: "Uno (Flow Override)",
    rank: 6,
    category: "Card & Bluffing",
    icon: "🎴",
    overview: "World-class fast-paced card battle. Match colors and numbers, stack +2 and +4 penalties, execute 7-0 hand swaps, jump in with identical cards, and shout UNO before your final card!",
    howToPlay: [
      "Match the active discard top card by Color or Number/Value.",
      "Action Cards: Skip cancels next player; Reverse swaps turn order; Wild lets you choose the table color.",
      "Stacking (+2 / +4): If a +2 or +4 is played, counter-stack another +2 or +4 to pass the compounded penalty to the next player!",
      "7-0 Hand Rules: Playing a 7 lets you swap entire hands with any opponent; playing a 0 rotates all hands in the active direction.",
      "Jump-In Rule: Holding an exact duplicate card (same color and value) lets you jump in immediately out of turn!",
      "Shout UNO: Tap [ 🚨 SHOUT UNO! ] when holding 1 card remaining. If an opponent catches you before you shout, you suffer a +2 penalty."
    ],
    voiceGuide: "Shout 'UNO!' into the mic and coordinate counter-stacking banter on live audio.",
    scoring: "First player to empty hand wins match + Aura rewards.",
    proTip: "Save your +2 and +4 Wilds to defend against incoming penalty stacks!"
  },
  ludo: {
    id: "ludo",
    name: "15x15 Cyber Ludo",
    rank: 4,
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
    name: "Glow Hockey Neon Clash (USAA Regulations)",
    rank: 16,
    category: "2D Physics & Tabletop",
    icon: "⚡",
    overview: "Official United States Air Hockey Association (USAA) tournament regulations. 60FPS Continuous Collision Detection (CCD) engine with aerostatic air suspension damping, strict centerline enforcement, and 7-second shot clock.",
    howToPlay: [
      "1. STRICT CENTERLINE RULE: Mallets are restricted entirely to their defensive half. Crossing the red centerline is an immediate foul.",
      "2. 7-SECOND POSSESSION CLOCK: Once the puck enters your defensive half, you must advance it across the centerline within 7 seconds or forfeit possession.",
      "3. TOPPING & CLAMPING FOUL: Trapping or clamping the puck beneath the mallet body is illegal. Contact must occur purely on the vertical rim.",
      "4. PRO SHOT MECHANICS: 1. Straight Bullet Drive (0° max speed blast), 2. One-Rail Bank (30°–45° side rail slice), 3. Double-Rail Diamond Wrap (multi-rail misdirection).",
      "5. DEFENSE: Master the Triangle Crease Guard (moving in an arc 5–10 cm in front of the goal slot) to cut down high-velocity angles.",
      "6. SCORING & VICTORY: First player to score 7 points (USAA championship standard) wins the match!"
    ],
    voiceGuide: "Fast-paced trash talk, shot calls, and goal celebrations over open mic audio.",
    scoring: "+150 Aura to the match victor (+double stakes in wager matches).",
    proTip: "Use the AI Difficulty toggle (Amateur, Semi-Pro, USAA World Champion) to practice bank shots and rapid-fire crease defense!"
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
  chess: {
    id: "chess",
    name: "Cyber Chess Grandmaster",
    rank: 5,
    category: "Tactical Boards & Grids",
    icon: "♟️",
    overview: "8x8 timed checkmate battle. Standard FIDE movement rules with timed turns and check/checkmate verification.",
    howToPlay: [
      "White moves first. Players alternate turns moving one piece per legal movement rules.",
      "Pawns move forward 1 square (or 2 on initial move) and capture diagonally.",
      "Knights move in an L-shape and can jump over other pieces.",
      "Bishops move diagonally; Rooks move horizontally and vertically; Queen combines both.",
      "King moves 1 square in any direction. Place the enemy King in inescapable check to win by Checkmate."
    ],
    voiceGuide: "Analyze positional blunders, offer draws, and discuss tactics over live audio.",
    scoring: "+250 Aura for Checkmate victory.",
    proTip: "Control the 4 central squares (e4, d4, e5, d5) early to dominate piece mobility!"
  },
  carrom: {
    id: "carrom",
    name: "Championship Carrom (Official ICF Tournament Laws)",
    rank: 6,
    category: "2D Physics & Tabletop",
    icon: "⚪",
    overview: "Official International Carrom Federation (ICF) tournament rules and laws. 19 pieces (9 White, 9 Black, 1 Red Queen) on 74x74 cm lacquered board with 4 corner drop pockets. Breaker plays White. Features White/Black Slam adjudication, 4 striking grips, powder dynamics (Boric vs Disco), and tactical defense.",
    howToPlay: [
      "1. STRIKER PLACEMENT & STRIKING: Striker must touch both front and rear baseline edges (or fully cover a base circle). Single forward flick using finger/thumb; dragging or pushing is a foul.",
      "2. 4 CORE STRIKING GRIPS: Index Finger Flick (direct accuracy & push pots), Middle Straight (+25% kinetic impulse for breaks & pack splitting), Scissors / Kainchi (sharp 60°+ tangent slices), Thumb Flick (reverse & baseline edge shots).",
      "3. THE QUEEN & MANDATORY COVER: Queen (3 pts) can be pocketed anytime after first pot. Must be covered by pocketing own color on the same or immediate next stroke. If cover fails, Queen returns to center circle.",
      "4. LAST PIECE SEQUENCE: You cannot pocket the Queen as your last piece. Clearing all 9 pieces while Queen remains on the board results in an immediate automatic frame loss!",
      "5. WHITE SLAM & BLACK SLAM (INNING 1 RUNOUT): White Slam = Breaker clears all 9 White + Queen in Turn 1 (+12 pts). Black Slam = Non-breaker clears all 9 Black + Queen in Turn 1 (+12 pts). Recorded as 'WS' / 'BS' on official ICF scorecards.",
      "6. FOULS & DUE MATRIX: Pocketing striker (scratch) ends turn + 1 piece returned to center as Due penalty. Pocketing striker + own piece = 2 pieces returned (potted + 1 Due).",
      "7. 22-POINT QUEEN CAP RULE (ICF LAW 25.4): Once cumulative match score reaches 22+ pts, the 3-pt Queen bonus is no longer added. Single board max score is 12 pts (9 pieces + 3 Queen). Match won at 25 pts."
    ],
    voiceGuide: "Call shots, announce 'Covered' / 'Due' umpire codes, and coordinate defensive locks on live voice chat.",
    scoring: "Board Pts = Remaining Opponent Pieces + (3 pts for Queen if covered and score < 22). Slams award 12 pts.",
    proTip: "Use the top Grip selector (Index, Middle, Kainchi, Thumb) and Powder Chemistry selector (Boric Acid vs Disco Super-Glide) to fine-tune kinetic power and acute tangent slices!"
  },
  pool: {
    id: "pool",
    name: "World Pool Championship (Top 5 Disciplines)",
    rank: 8,
    category: "2D Physics & Tabletop",
    icon: "🎱",
    overview: "Choose and play the top 5 most popular pool disciplines globally: 8-Ball, 9-Ball, 10-Ball, Straight Pool (14.1 Continuous), and One Pocket with authentic tournament racking and official WPA rules.",
    howToPlay: [
      "1. 8-BALL: 15 balls divided into Solids (1-7) and Stripes (9-15). Clear all 7 balls of your group, then legally pocket the 8-Ball to win.",
      "2. 9-BALL: Rotation discipline (balls 1-9). Cue ball must strike lowest-numbered ball first. Legally sinking the 9-ball on any shot instantly wins the rack.",
      "3. 10-BALL: Call-shot rotation discipline (balls 1-10). Hit lowest ball first; call ball and pocket on every shot. Sinking the 10-ball wins the frame.",
      "4. STRAIGHT POOL (14.1): Continuous high-run game (+1 pt per ball). Re-racked at 14 balls with apex empty, using 15th as break ball.",
      "5. ONE POCKET: Tactical chess on green felt. P1 assigned Bot-Left foot pocket, P2 assigned Bot-Right. First player to legally score 8 balls in their designated pocket wins!"
    ],
    voiceGuide: "Call pockets, declare rotation hits, and discuss safety strategies over live voice chat.",
    scoring: "+250 Aura for winning a pool match across any of the 5 popular disciplines.",
    proTip: "Use the top discipline selector to switch between 8-Ball, 9-Ball, 10-Ball, 14.1 Continuous, and One Pocket anytime to practice rotation, bank shots, or tactical safeties!"
  },
  "2048": {
    id: "2048",
    name: "2048 Binary Merge",
    rank: 18,
    category: "Solo Logic & Puzzles",
    icon: "🔢",
    overview: "4x4 sliding tile merge matrix. Slide tiles up, down, left, or right to combine matching numbers and create the legendary 2048 tile!",
    howToPlay: [
      "Swipe or press Arrow keys to slide all tiles in that direction.",
      "When two tiles with the same number collide, they merge into one (2+2=4, 4+4=8, etc.).",
      "A new tile (2 or 4) spawns after every move.",
      "Game ends when the grid fills with no valid merges remaining."
    ],
    voiceGuide: "Share your high scores and celebrate merge streaks with spectators.",
    scoring: "+150 Aura for reaching 2048.",
    proTip: "Keep your highest number tile locked in a single corner (e.g. bottom-right)!"
  },
  puzzle15: {
    id: "puzzle15",
    name: "15-Puzzle Sliding Matrix",
    rank: 32,
    category: "Solo Logic & Puzzles",
    icon: "🧩",
    overview: "4x4 grid of 15 numbered tiles and 1 empty slot. Slide tiles into numerical sequence 1 through 15.",
    howToPlay: [
      "Tap any tile adjacent to the empty slot to slide it into the space.",
      "Arrange the top row first (1-2-3-4), followed by the second row (5-6-7-8).",
      "Solve the bottom two rows systematically until tiles 1 to 15 are ordered."
    ],
    voiceGuide: "Race friends on fastest completion time over live audio.",
    scoring: "+120 Aura for completing the 15-slider.",
    proTip: "Solve row by row from top to bottom rather than column by column!"
  },
  taboo: {
    id: "taboo",
    name: "Taboo Word Shield",
    rank: 30,
    category: "Voice Party & Social Deduction",
    icon: "🚫",
    overview: "Voice vocabulary challenge. Describe the secret keyword to your team without uttering any of the 4 forbidden taboo words!",
    howToPlay: [
      "The speaker sees a secret keyword and 4 forbidden taboo words.",
      "Describe the keyword using voice clues before the 60s buzzer sounds.",
      "If you accidentally say a taboo word, the opposing team hits the BUZZER for a penalty.",
      "Team with the most correctly guessed words wins."
    ],
    voiceGuide: "High-energy fast-talking voice descriptions on open microphone.",
    scoring: "+200 Aura for highest team score.",
    proTip: "Use antonyms, metaphors, and real-life scenarios rather than direct synonyms!"
  },
  melody_buzzer: {
    id: "melody_buzzer",
    name: "Antakshari / Melody Hummer",
    rank: 28,
    category: "Voice Party & Social Deduction",
    icon: "🎵",
    overview: "Voice singing and music relay. Hum or sing melodies on mic; opponents hit the speed buzzer to guess song title and artist.",
    howToPlay: [
      "Speaker hums or sings a tune without saying the song lyrics.",
      "Room participants hit the BUZZER to claim a 5-second guess window.",
      "Correct guess earns +10 pts; wrong guess passes the turn."
    ],
    voiceGuide: "Humming and vocal melody relay across the voice lounge.",
    scoring: "+150 Aura to the music master.",
    proTip: "Focus on the song's most iconic chorus hook rather than the intro!"
  },
  twenty_questions: {
    id: "twenty_questions",
    name: "20 Questions / Decryption",
    rank: 26,
    category: "Voice Party & Social Deduction",
    icon: "❓",
    overview: "Verbal deduction interrogation. Players ask up to 20 Yes/No questions to identify the secret entity chosen by the host.",
    howToPlay: [
      "Host chooses a secret entity (Person, Place, Object, or Concept).",
      "Participants take turns asking Yes/No questions on mic.",
      "Host answers strictly 'Yes', 'No', or 'Irrelevant'.",
      "Guess the secret entity before question #20 to win."
    ],
    voiceGuide: "Cross-examine and narrow down categories through group voice debate.",
    scoring: "+160 Aura for cracking the entity in under 15 questions.",
    proTip: "Start with broad binary filters ('Is it alive?', 'Is it manufactured?') before specifics!"
  },
  two_truths: {
    id: "two_truths",
    name: "Two Truths & a Lie",
    rank: 29,
    category: "Voice Party & Social Deduction",
    icon: "🎭",
    overview: "Social bluffing and audio tell deduction. Speak 2 genuine truths and 1 fabricated lie; room votes on the falsehood.",
    howToPlay: [
      "The speaker states 3 personal statements on mic (2 true, 1 lie).",
      "Room participants cross-examine the speaker's voice inflections and confidence.",
      "Audience votes on which statement is the lie.",
      "Speaker wins points for every player they successfully fool."
    ],
    voiceGuide: "Detect subtle vocal hesitation and micro-bluffs on open mic.",
    scoring: "+140 Aura for successful deception.",
    proTip: "Make your lie simple and believable, and make your true statements surprisingly wild!"
  },
  pitch_arena: {
    id: "pitch_arena",
    name: "Pitch Arena (Absurd Defense)",
    rank: 31,
    category: "Voice Party & Social Deduction",
    icon: "🎙️",
    overview: "60-second rapid absurd defense debate. Deliver an impromptu deadpan presentation defending an absurd product or stance.",
    howToPlay: [
      "Terminal assigns an absurd concept (e.g. 'Edible Keyboards').",
      "Speaker delivers a 60-second high-energy startup elevator pitch.",
      "Audience tips virtual Volt chips to crown the best presenter."
    ],
    voiceGuide: "Charismatic comedic speeches and live audience cheer reactions.",
    scoring: "+180 Aura for the top-voted pitch.",
    proTip: "Adopt a deadpan serious tone as if pitching a multi-billion dollar enterprise!"
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

  // Sync selectedId whenever initialGameType changes or modal opens
  React.useEffect(() => {
    if (initialGameType) {
      const normalized = initialGameType.toLowerCase();
      // Support aliases
      const match = ARCADE_GAME_RULES[normalized] ? normalized : (normalized === "game2048" ? "2048" : normalized);
      if (ARCADE_GAME_RULES[match]) {
        setSelectedId(match);
      } else {
        setSelectedId(initialGameType);
      }
    }
  }, [initialGameType, isOpen]);

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
                    <span className="truncate">{rule.name}</span>
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
                <span>{currentRule.category}</span>
                <span className="text-white border border-neutral-800 bg-neutral-900 px-1.5 py-0.5">
                  OFFICIAL RULES
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
