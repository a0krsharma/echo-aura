/**
 * lib/arcadeBots.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Echo Arcade // Autonomous AI Bot Engine
 *
 * $0 Infrastructure Solo & Computer AI Bot logic for:
 * - Cyber Ludo
 * - Chess (Grid Protocol)
 * - Connect Four
 * - Battleship Radar Command
 * - Sudoku
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
  LUDO_CONFIG,
  type ArcadeMatch,
  type LudoToken,
  type ChessPiece,
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
      // Simple heuristic moves for AI bot
      if (piece.type === "p") {
        // Forward 1
        if (r + 1 < 8 && !board[r + 1][c]) {
          possibleMoves.push({ from: [r, c], to: [r + 1, c], score: 1 });
        }
        // Capture diagonals
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
        // Other pieces forward/lateral steps
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

    // Prefer center columns (3, 2, 4, 1, 5, 0, 6)
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
