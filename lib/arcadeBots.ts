/**
 * lib/arcadeBots.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Echo Arcade // Autonomous AI Bot Engine
 *
 * $0 Infrastructure Solo & Computer AI Bot logic for Cyber Ludo & Sudoku.
 * Evaluates tactical moves, token captures, and auto-rolls with realistic
 * delay and zero latency.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  rollLudoDice,
  moveLudoToken,
  passLudoTurn,
  submitSudokuCell,
  LUDO_CONFIG,
  type ArcadeMatch,
  type LudoToken,
} from "./arcade";

// Guard against duplicate concurrent bot executions
const activeBotRuns = new Set<string>();

/**
 * Executes a tactical turn for an AI Bot in Cyber Ludo
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
    // Step 1: If bot hasn't rolled yet, roll the dice
    if (!match.ludoState.hasRolled) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await rollLudoDice(match.id, botPlayer.uid);
      return;
    }

    // Step 2: Bot has rolled. Evaluate best movable token
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

    // Tactical AI Heuristic Ranking:
    // 1. Can we capture an enemy token? (High Priority)
    // 2. Can we enter the Home Triangle? (High Priority)
    // 3. Can we deploy a new token on 6? (Medium Priority)
    // 4. Advance furthest piece forward (Default)

    let chosenToken = validTokens[0];
    let highestScore = -1;

    for (const tok of validTokens) {
      let score = 0;

      if (tok.stepCount === 0 && roll === 6) {
        // Deploying onto board is great if we have few pieces out
        score = 50;
      } else {
        const nextStep = tok.stepCount + roll;
        if (nextStep === LUDO_CONFIG.TOTAL_STEPS_TO_HOME) {
          // Reaching home is top priority!
          score = 100;
        } else if (nextStep <= 51) {
          const nextPos = (LUDO_CONFIG.START_POS[currentTurn] + nextStep - 1) % 52;
          // Check if landing captures an opponent
          if (!LUDO_CONFIG.SAFE_STARS.includes(nextPos)) {
            let canCapture = false;
            Object.entries(match.ludoState.tokens).forEach(([team, otherTokens]) => {
              if (team !== currentTurn) {
                if (otherTokens.some((o) => o.boardPosition === nextPos && !o.isHome)) {
                  canCapture = true;
                }
              }
            });
            if (canCapture) score = 90; // High capture priority!
          }
          if (score === 0) {
            // Favor pieces closer to home
            score = 10 + tok.stepCount;
          }
        } else {
          // In home stretch
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
    console.error("[ArcadeBot] Ludo execution error:", err);
  } finally {
    setTimeout(() => {
      activeBotRuns.delete(runKey);
    }, 1500);
  }
}

/**
 * Executes a periodic move for an AI Bot in Sudoku speed race
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

    // Find all empty/unsolved cells
    const emptyCells: { r: number; c: number }[] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (initialGrid[r][c] === 0 && currentGrid[r][c] !== solutionGrid[r][c]) {
          emptyCells.push({ r, c });
        }
      }
    }

    if (emptyCells.length === 0) return;

    // Pick random empty cell to solve
    const target = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const correctVal = solutionGrid[target.r][target.c];

    await submitSudokuCell(match.id, botPlayer.uid, target.r, target.c, correctVal);
  } catch (err) {
    console.error("[ArcadeBot] Sudoku execution error:", err);
  } finally {
    setTimeout(() => {
      activeBotRuns.delete(runKey);
    }, 6000 + Math.random() * 4000); // 6-10s interval for realistic speed race
  }
}
