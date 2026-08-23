/**
 * lib/arcadeBots.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Echo Arcade // Autonomous AI Bot Engine
 *
 * $0 Infrastructure Solo & Computer AI Bot logic for:
 * - Cyber Ludo
 * - Chess (Grid Protocol)
 * - Uno / Flow Override
 * - Texas Hold'em Poker
 * - Blackjack 21
 * - Liar's Dice / Perudo
 * - Hand Cricket (Odd-Even)
 * - Raja Mantri Chor Sipahi
 * - Connect Four
 * - Battleship Radar Command
 * - Sudoku
 * - Gomoku (5 in a Row)
 * - Reversi / Othello
 * - Dots and Boxes
 * - Snakes & Ladders
 * - Quoridor Firewall Runner
 * - Yahtzee / Yacht
 * - Hangman Word Scaffold
 * - Matrix Math Blitz
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  rollLudoDice,
  moveLudoToken,
  passLudoTurn,
  submitSudokuCell,
  makeChessMove,
  dropConnect4Token,
  fireBattleshipShot,
  playUnoCard,
  drawUnoCard,
  betPoker,
  playBlackjackAction,
  makeLiarsDiceBid,
  callLiarsDiceBluff,
  throwHandCricketNumber,
  guessRajaMantriChor,
  makeGomokuMove,
  makeReversiMove,
  claimDotsLine,
  rollSnakesLaddersDice,
  moveQuoridorPawn,
  rollYahtzeeDice,
  LUDO_CONFIG,
  type ArcadeMatch,
  type LudoToken,
  type ChessPiece,
  type UnoCard,
} from "./arcade";

const activeBotRuns = new Set<string>();

/**
 * Ludo Bot
 */
export async function executeLudoBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.ludoState || match.status !== "PLAYING") return;

  const currentTurn = match.ludoState.currentTurn;
  const botPlayer = Object.values(match.players || {}).find(
    (p) => p.team === currentTurn && p.isBot
  );

  if (!botPlayer) return;

  const runKey = `${match.id}_${currentTurn}_${match.ludoState.hasRolled ? "move" : "roll"}`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    if (!match.ludoState.hasRolled) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await rollLudoDice(match.id, botPlayer.uid);
      return;
    }

    const roll = match.ludoState.lastDiceRoll;
    if (!roll) return;

    await new Promise((resolve) => setTimeout(resolve, 800));

    const tokens = match.ludoState.tokens[currentTurn] || [];
    const validTokens: LudoToken[] = [];

    tokens.forEach((t) => {
      if (t.isHome) return;
      if (t.stepCount === 0) {
        if (roll === 6) validTokens.push(t);
      } else {
        if (t.stepCount + roll <= LUDO_CONFIG.TOTAL_STEPS_TO_HOME) {
          validTokens.push(t);
        }
      }
    });

    if (validTokens.length === 0) {
      await passLudoTurn(match.id, botPlayer.uid);
      return;
    }

    let chosenToken = validTokens[0];
    let highestScore = -1;

    for (const tok of validTokens) {
      let score = 0;
      if (tok.stepCount === 0 && roll === 6) {
        score = 50;
      } else {
        const nextStep = tok.stepCount + roll;
        if (nextStep === LUDO_CONFIG.TOTAL_STEPS_TO_HOME) {
          score = 100;
        } else if (nextStep <= 51) {
          const nextPos = (LUDO_CONFIG.START_POS[currentTurn] + nextStep - 1) % 52;
          if (!LUDO_CONFIG.SAFE_STARS.includes(nextPos)) {
            let canCapture = false;
            Object.entries(match.ludoState.tokens).forEach(([team, otherTokens]) => {
              if (team !== currentTurn) {
                if (otherTokens.some((o) => o.boardPosition === nextPos && !o.isHome)) {
                  canCapture = true;
                }
              }
            });
            if (canCapture) score = 90;
          }
          if (score === 0) score = 10 + tok.stepCount;
        } else {
          score = 30 + (nextStep - 51);
        }
      }

      if (score > highestScore) {
        highestScore = score;
        chosenToken = tok;
      }
    }

    await moveLudoToken(match.id, botPlayer.uid, chosenToken.id);
  } catch (err) {
    console.error("[ArcadeBot] Ludo error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 1500);
  }
}

/**
 * Chess Bot
 */
export async function executeChessBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.chessState || match.status !== "PLAYING") return;
  if (match.chessState.currentTurn !== "b") return;

  const botPlayer = Object.values(match.players || {}).find(
    (p) => p.team === "BLACK" && p.isBot
  );
  if (!botPlayer) return;

  const runKey = `${match.id}_chess_bot_${match.chessState.moveHistory.length}`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const board: (ChessPiece | null)[][] = JSON.parse(match.chessState.boardStr);
    const blackPieces: { r: number; c: number; piece: ChessPiece }[] = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c]?.color === "b") {
          blackPieces.push({ r, c, piece: board[r][c]! });
        }
      }
    }

    const possibleMoves: { from: [number, number]; to: [number, number]; score: number }[] = [];

    blackPieces.forEach(({ r, c, piece }) => {
      if (piece.type === "p") {
        if (r + 1 < 8 && !board[r + 1][c]) {
          possibleMoves.push({ from: [r, c], to: [r + 1, c], score: 1 });
        }
        if (r + 1 < 8 && c - 1 >= 0 && board[r + 1][c - 1]?.color === "w") {
          possibleMoves.push({ from: [r, c], to: [r + 1, c - 1], score: 10 });
        }
        if (r + 1 < 8 && c + 1 < 8 && board[r + 1][c + 1]?.color === "w") {
          possibleMoves.push({ from: [r, c], to: [r + 1, c + 1], score: 10 });
        }
      } else if (piece.type === "n") {
        const knightJumps = [
          [-2, -1], [-2, 1], [-1, -2], [-1, 2],
          [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        knightJumps.forEach(([dr, dc]) => {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            if (!board[nr][nc] || board[nr][nc]?.color === "w") {
              const score = board[nr][nc]?.color === "w" ? 15 : 2;
              possibleMoves.push({ from: [r, c], to: [nr, nc], score });
            }
          }
        });
      } else {
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]];
        dirs.forEach(([dr, dc]) => {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
            if (!board[nr][nc] || board[nr][nc]?.color === "w") {
              const score = board[nr][nc]?.color === "w" ? 12 : 1;
              possibleMoves.push({ from: [r, c], to: [nr, nc], score });
            }
          }
        });
      }
    });

    if (possibleMoves.length === 0) return;

    possibleMoves.sort((a, b) => b.score - a.score);
    const chosen = possibleMoves[0];

    await makeChessMove(match.id, botPlayer.uid, chosen.from, chosen.to);
  } catch (err) {
    console.error("[ArcadeBot] Chess error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 1500);
  }
}

/**
 * Uno Bot
 */
export async function executeUnoBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.unoState || match.status !== "PLAYING") return;

  const us = match.unoState;
  const botPlayer = Object.values(match.players || {}).find(
    (p) => p.uid === us.currentTurnUid && p.isBot
  );
  if (!botPlayer) return;

  const runKey = `${match.id}_uno_bot_${us.currentTurnUid}`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const hands: Record<string, UnoCard[]> = JSON.parse(us.handsStr || "{}");
    const botHand = hands[botPlayer.uid] || [];
    const top = us.discardTop;

    const playableCard = botHand.find(
      (c) => c.color === "WILD" || c.color === top.color || c.value === top.value
    );

    if (playableCard) {
      const chosenColor = playableCard.color === "WILD" ? "RED" : undefined;
      await playUnoCard(match.id, botPlayer.uid, playableCard, chosenColor);
    } else {
      await drawUnoCard(match.id, botPlayer.uid);
    }
  } catch (err) {
    console.error("[ArcadeBot] Uno error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 1500);
  }
}

/**
 * Hand Cricket Bot
 */
export async function executeHandCricketBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.handCricketState || match.status !== "PLAYING") return;

  const hcs = match.handCricketState;
  const botPlayer = Object.values(match.players || {}).find((p) => p.isBot);
  if (!botPlayer) return;

  const isBotBatsman = botPlayer.uid === hcs.batsmanUid;
  const needChoice = isBotBatsman ? hcs.currentBatsmanChoice === null : hcs.currentBowlerChoice === null;
  if (!needChoice) return;

  const runKey = `${match.id}_hc_bot_${hcs.innings1Score}_${hcs.currentInnings}`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 900));
    const randomChoice = Math.floor(Math.random() * 6) + 1;
    await throwHandCricketNumber(match.id, botPlayer.uid, randomChoice);
  } catch (err) {
    console.error("[ArcadeBot] Hand cricket error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 1500);
  }
}

/**
 * Raja Mantri Chor Sipahi Bot
 */
export async function executeRajaMantriBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.rajaMantriState || match.status !== "PLAYING") return;

  const rms = match.rajaMantriState;
  if (rms.phase === "RESOLVED") return;

  const chits: Record<string, string> = JSON.parse(rms.chitsStr || "{}");
  const mantriUid = Object.entries(chits).find(([, r]) => r === "MANTRI")?.[0];
  if (!mantriUid) return;

  const isMantriBot = match.players[mantriUid]?.isBot;
  if (!isMantriBot) return;

  const runKey = `${match.id}_raja_mantri_bot`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const nonMantriPlayers = Object.keys(match.players).filter((u) => u !== mantriUid && chits[u] !== "RAJA");
    if (nonMantriPlayers.length === 0) return;

    const suspect = nonMantriPlayers[Math.floor(Math.random() * nonMantriPlayers.length)];
    await guessRajaMantriChor(match.id, mantriUid, suspect);
  } catch (err) {
    console.error("[ArcadeBot] Raja mantri error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 2500);
  }
}

/**
 * Poker Bot
 */
export async function executePokerBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.pokerState || match.status !== "PLAYING") return;

  const ps = match.pokerState;
  const botPlayer = Object.values(match.players || {}).find(
    (p) => p.uid === ps.currentTurnUid && p.isBot
  );
  if (!botPlayer) return;

  const runKey = `${match.id}_poker_bot_${ps.pot}_${ps.round}`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const actions: ("CHECK" | "CALL" | "RAISE")[] = ["CHECK", "CALL", "CALL", "RAISE"];
    const chosen = actions[Math.floor(Math.random() * actions.length)];
    await betPoker(match.id, botPlayer.uid, chosen, 20);
  } catch (err) {
    console.error("[ArcadeBot] Poker error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 1500);
  }
}

/**
 * Liar's Dice Bot
 */
export async function executeLiarsDiceBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.liarsDiceState || match.status !== "PLAYING") return;

  const lds = match.liarsDiceState;
  const botPlayer = Object.values(match.players || {}).find(
    (p) => p.uid === lds.currentTurnUid && p.isBot
  );
  if (!botPlayer) return;

  const runKey = `${match.id}_liars_dice_bot_${lds.currentBid?.count || 0}`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    if (lds.currentBid && lds.currentBid.count >= 4) {
      await callLiarsDiceBluff(match.id, botPlayer.uid);
    } else {
      const nextCount = lds.currentBid ? lds.currentBid.count + 1 : 1;
      const nextFace = Math.floor(Math.random() * 6) + 1;
      await makeLiarsDiceBid(match.id, botPlayer.uid, nextCount, nextFace);
    }
  } catch (err) {
    console.error("[ArcadeBot] Liar's Dice error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 1500);
  }
}

/**
 * Gomoku Bot
 */
export async function executeGomokuBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.gomokuState || match.status !== "PLAYING") return;
  if (match.gomokuState.currentTurn !== "WHITE") return;

  const botPlayer = Object.values(match.players || {}).find((p) => p.isBot);
  if (!botPlayer) return;

  const runKey = `${match.id}_gomoku_bot`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 900));
    const grid: (string | null)[][] = JSON.parse(match.gomokuState.gridStr || "[]");
    const emptyCells: [number, number][] = [];

    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        if (!grid[r][c]) emptyCells.push([r, c]);
      }
    }

    if (emptyCells.length === 0) return;
    const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    await makeGomokuMove(match.id, botPlayer.uid, r, c);
  } catch (err) {
    console.error("[ArcadeBot] Gomoku error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 1500);
  }
}

/**
 * Reversi Bot
 */
export async function executeReversiBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.reversiState || match.status !== "PLAYING") return;
  if (match.reversiState.currentTurn !== "LIGHT") return;

  const botPlayer = Object.values(match.players || {}).find((p) => p.isBot);
  if (!botPlayer) return;

  const runKey = `${match.id}_reversi_bot_${match.reversiState.lightCount}`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const board: (string | null)[][] = JSON.parse(match.reversiState.boardStr || "[]");
    const validMoves: [number, number][] = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (!board[r][c]) validMoves.push([r, c]);
      }
    }

    if (validMoves.length === 0) return;
    const [r, c] = validMoves[Math.floor(Math.random() * validMoves.length)];
    await makeReversiMove(match.id, botPlayer.uid, r, c);
  } catch (err) {
    console.error("[ArcadeBot] Reversi error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 1500);
  }
}

/**
 * Dots and Boxes Bot
 */
export async function executeDotsAndBoxesBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.dotsAndBoxesState || match.status !== "PLAYING") return;

  const dbs = match.dotsAndBoxesState;
  const botPlayer = Object.values(match.players || {}).find(
    (p) => p.uid === dbs.currentTurnUid && p.isBot
  );
  if (!botPlayer) return;

  const runKey = `${match.id}_dots_bot_${dbs.p1Score + dbs.p2Score}`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 800));
    const lines: Record<string, string> = JSON.parse(dbs.linesStr || "{}");
    const unselectedKeys: string[] = [];

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (c < 3) {
          const hKey = `h-${r}-${c}`;
          if (!lines[hKey]) unselectedKeys.push(hKey);
        }
        if (r < 3) {
          const vKey = `v-${r}-${c}`;
          if (!lines[vKey]) unselectedKeys.push(vKey);
        }
      }
    }

    if (unselectedKeys.length === 0) return;
    const chosenKey = unselectedKeys[Math.floor(Math.random() * unselectedKeys.length)];
    await claimDotsLine(match.id, botPlayer.uid, chosenKey);
  } catch (err) {
    console.error("[ArcadeBot] Dots and boxes error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 1500);
  }
}

/**
 * Snakes and Ladders Bot
 */
export async function executeSnakesLaddersBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.snakesLaddersState || match.status !== "PLAYING") return;

  const sls = match.snakesLaddersState;
  const botPlayer = Object.values(match.players || {}).find(
    (p) => p.uid === sls.currentTurnUid && p.isBot
  );
  if (!botPlayer) return;

  const runKey = `${match.id}_snakes_bot_${sls.currentTurnUid}`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 900));
    await rollSnakesLaddersDice(match.id, botPlayer.uid);
  } catch (err) {
    console.error("[ArcadeBot] Snakes and ladders error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 1500);
  }
}

/**
 * Quoridor Bot
 */
export async function executeQuoridorBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.quoridorState || match.status !== "PLAYING") return;

  const qs = match.quoridorState;
  const botPlayer = Object.values(match.players || {}).find(
    (p) => p.uid === qs.currentTurnUid && p.isBot
  );
  if (!botPlayer) return;

  const runKey = `${match.id}_quoridor_bot_${qs.p2Pos[0]}`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const [r, c] = qs.p2Pos;
    const nextRow = Math.min(8, r + 1);
    await moveQuoridorPawn(match.id, botPlayer.uid, nextRow, c);
  } catch (err) {
    console.error("[ArcadeBot] Quoridor error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 1500);
  }
}

/**
 * Yahtzee Bot
 */
export async function executeYahtzeeBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.yahtzeeState || match.status !== "PLAYING") return;

  const ys = match.yahtzeeState;
  const botPlayer = Object.values(match.players || {}).find(
    (p) => p.uid === ys.currentTurnUid && p.isBot
  );
  if (!botPlayer) return;

  const runKey = `${match.id}_yahtzee_bot_${ys.rollsRemaining}`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 900));
    await rollYahtzeeDice(match.id, botPlayer.uid, [false, false, false, false, false]);
  } catch (err) {
    console.error("[ArcadeBot] Yahtzee error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 1500);
  }
}

/**
 * Connect 4 Bot
 */
export async function executeConnect4BotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.connect4State || match.status !== "PLAYING") return;
  if (match.connect4State.currentTurn !== "YELLOW") return;

  const botPlayer = Object.values(match.players || {}).find((p) => p.isBot);
  if (!botPlayer) return;

  const runKey = `${match.id}_c4_bot`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const grid: (string | null)[][] = JSON.parse(match.connect4State.gridStr);

    const availableCols: number[] = [];
    for (let c = 0; c < 7; c++) {
      if (grid[0][c] === null) availableCols.push(c);
    }
    if (availableCols.length === 0) return;

    const preferences = [3, 2, 4, 1, 5, 0, 6];
    const targetCol = preferences.find((c) => availableCols.includes(c)) ?? availableCols[0];

    await dropConnect4Token(match.id, botPlayer.uid, targetCol);
  } catch (err) {
    console.error("[ArcadeBot] Connect4 error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 1500);
  }
}

/**
 * Battleship Bot
 */
export async function executeBattleshipBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.battleshipState || match.status !== "PLAYING") return;

  const bs = match.battleshipState;
  const botPlayer = Object.values(match.players || {}).find(
    (p) => p.uid === bs.currentTurnUid && p.isBot
  );
  if (!botPlayer) return;

  const runKey = `${match.id}_battleship_bot`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const shots: [number, number, boolean][] = JSON.parse(bs.p2ShotsStr || "[]");

    const taken = new Set(shots.map(([r, c]) => `${r}-${c}`));
    const untaken: [number, number][] = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (!taken.has(`${r}-${c}`)) {
          untaken.push([r, c]);
        }
      }
    }

    if (untaken.length === 0) return;

    const [r, c] = untaken[Math.floor(Math.random() * untaken.length)];
    await fireBattleshipShot(match.id, botPlayer.uid, r, c);
  } catch (err) {
    console.error("[ArcadeBot] Battleship error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 1500);
  }
}

/**
 * Sudoku Bot
 */
export async function executeSudokuBotMove(match: ArcadeMatch): Promise<void> {
  if (!match.sudokuState || match.status !== "PLAYING") return;

  const botPlayer = Object.values(match.players || {}).find((p) => p.isBot);
  if (!botPlayer) return;

  const runKey = `${match.id}_sudoku_bot`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    const currentGrid: number[][] = JSON.parse(match.sudokuState.currentGridStr || "[]");
    const solutionGrid: number[][] = JSON.parse(match.sudokuState.solutionGridStr || "[]");
    const initialGrid: number[][] = JSON.parse(match.sudokuState.initialGridStr || "[]");

    const emptyCells: { r: number; c: number }[] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (initialGrid[r][c] === 0 && currentGrid[r][c] !== solutionGrid[r][c]) {
          emptyCells.push({ r, c });
        }
      }
    }

    if (emptyCells.length === 0) return;
    const target = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const correctVal = solutionGrid[target.r][target.c];

    await submitSudokuCell(match.id, botPlayer.uid, target.r, target.c, correctVal);
  } catch (err) {
    console.error("[ArcadeBot] Sudoku error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 6000 + Math.random() * 4000);
  }
}
