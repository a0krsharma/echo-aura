/**
 * lib/arcadeBots.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Echo Arcade // Autonomous AI Bot Engine
 *
 * $0 Infrastructure Solo & Computer AI Bot logic for:
 * - 8-Ball Pool
 * - Carrom Board
 * - Cyber Ludo
 * - Chess (Grid Protocol)
 * - Uno / Flow Override
 * - Texas Hold'em Poker
 * - Blackjack 21
 * - Bingo 25-Cross
 * - Book Cricket
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
  fireCarromShot,
  firePoolShot,
  playUnoCard,
  drawUnoCard,
  betPoker,
  playBlackjackAction,
  crossBingoNumber,
  flipBookCricketPage,
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
  drawRummyCard,
  discardRummyCard,
  bidCallBreak,
  playCallBreakCard,
  betTeenPatti,
  playSattePeSattaCard,
  playBhabhiCard,
  playMendicotCard,
  discardCheatBluff,
  LUDO_CONFIG,
  type ArcadeMatch,
  type LudoToken,
  type ChessPiece,
  type UnoCard,
  type CarromPiece,
  type PoolBall,
} from "./arcade";

const activeBotRuns = new Set<string>();

/**
 * 8-Ball Pool Bot
 */
export async function executePoolBotShot(match: ArcadeMatch): Promise<void> {
  if (!match.poolState || match.status !== "PLAYING") return;
  const ps = match.poolState;
  const botPlayer = Object.values(match.players || {}).find(
    (p) => p.uid === ps.currentTurnUid && p.isBot
  );
  if (!botPlayer) return;

  const runKey = `${match.id}_pool_bot_${ps.currentTurnUid}`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 1400));
    const balls: PoolBall[] = JSON.parse(ps.ballsStr || "[]");
    const cueBall = balls.find((b) => b.type === "cue");
    const targets = balls.filter((b) => b.type !== "cue" && !b.isPocketed);

    if (!cueBall || targets.length === 0) return;

    // Pick a target ball
    const target = targets[Math.floor(Math.random() * targets.length)];
    const dx = target.x - cueBall.x;
    const dy = target.y - cueBall.y;
    const dist = Math.hypot(dx, dy) || 1;

    const speed = 12 + Math.random() * 6;
    const impulseX = (dx / dist) * speed + (Math.random() - 0.5) * 1.5;
    const impulseY = (dy / dist) * speed + (Math.random() - 0.5) * 1.5;

    cueBall.vx = impulseX;
    cueBall.vy = impulseY;

    await firePoolShot(
      match.id,
      botPlayer.uid,
      impulseX,
      impulseY,
      balls
    );
  } catch (err) {
    console.error("[ArcadeBot] Pool error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 2000);
  }
}

/**
 * Carrom Board Bot
 */
export async function executeCarromBotShot(match: ArcadeMatch): Promise<void> {
  if (!match.carromState || match.status !== "PLAYING") return;
  const cs = match.carromState;
  const botPlayer = Object.values(match.players || {}).find(
    (p) => p.uid === cs.currentTurnUid && p.isBot
  );
  if (!botPlayer) return;

  const runKey = `${match.id}_carrom_bot_${cs.currentTurnUid}`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 1300));
    const pieces: CarromPiece[] = JSON.parse(cs.piecesStr || "[]");
    const striker = pieces.find((p) => p.type === "striker");
    const targets = pieces.filter((p) => p.type !== "striker" && !p.isPocketed);

    if (!striker || targets.length === 0) return;

    // Reposition striker along baseline
    striker.x = 190 + (Math.random() - 0.5) * 60;
    striker.y = 55; // bot baseline

    // Pick target coin
    const target = targets[Math.floor(Math.random() * targets.length)];
    const dx = target.x - striker.x;
    const dy = target.y - striker.y;
    const dist = Math.hypot(dx, dy) || 1;

    const speed = 10 + Math.random() * 5;
    const impulseX = (dx / dist) * speed + (Math.random() - 0.5) * 2;
    const impulseY = (dy / dist) * speed + (Math.random() - 0.5) * 2;

    striker.vx = impulseX;
    striker.vy = impulseY;

    await fireCarromShot(
      match.id,
      botPlayer.uid,
      impulseX,
      impulseY,
      striker.x,
      striker.y,
      pieces
    );
  } catch (err) {
    console.error("[ArcadeBot] Carrom error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 2000);
  }
}

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
 * Blackjack Bot
 */
export async function executeBlackjackBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.blackjackState || match.status !== "PLAYING") return;
  const bs = match.blackjackState;
  const botPlayer = Object.values(match.players || {}).find((p) => p.isBot);
  if (!botPlayer) return;

  const runKey = `${match.id}_blackjack_bot`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const botHand = bs.playerHands[botPlayer.uid] || [];
    const action = botHand.length >= 3 ? "STAND" : "HIT";
    await playBlackjackAction(match.id, botPlayer.uid, action);
  } catch (err) {
    console.error("[ArcadeBot] Blackjack error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 1500);
  }
}

/**
 * Bingo Bot
 */
export async function executeBingoBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.bingoState || match.status !== "PLAYING") return;
  const bs = match.bingoState;
  const botPlayer = Object.values(match.players || {}).find((p) => p.isBot);
  if (!botPlayer) return;

  const runKey = `${match.id}_bingo_bot_${bs.crossedNumbers?.length || 0}`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const crossed = new Set(bs.crossedNumbers || []);
    const uncrossed: number[] = [];
    for (let i = 1; i <= 25; i++) {
      if (!crossed.has(i)) uncrossed.push(i);
    }
    if (uncrossed.length === 0) return;
    const chosen = uncrossed[Math.floor(Math.random() * uncrossed.length)];
    await crossBingoNumber(match.id, botPlayer.uid, chosen);
  } catch (err) {
    console.error("[ArcadeBot] Bingo error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 2000);
  }
}

/**
 * Book Cricket Bot
 */
export async function executeBookCricketBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.bookCricketState || match.status !== "PLAYING") return;
  const bcs = match.bookCricketState;
  const botPlayer = Object.values(match.players || {}).find((p) => p.isBot);
  if (!botPlayer) return;

  const runKey = `${match.id}_book_cricket_bot_${bcs.runs}_${bcs.balls}`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    await flipBookCricketPage(match.id, botPlayer.uid);
  } catch (err) {
    console.error("[ArcadeBot] Book Cricket error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 1800);
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

/**
 * Indian 13-Card Rummy Bot
 */
export async function executeRummyBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.rummyState || match.status !== "PLAYING") return;
  const rs = match.rummyState;
  const botPlayer = Object.values(match.players || {}).find(
    (p) => p.uid === rs.currentTurnUid && p.isBot
  );
  if (!botPlayer) return;

  const runKey = `${match.id}_rummy_bot_${rs.hasDrawn}`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 1400));
    if (!rs.hasDrawn) {
      await drawRummyCard(match.id, botPlayer.uid, false);
    } else {
      const hands: Record<string, string[]> = JSON.parse(rs.handsStr || "{}");
      const botHand = hands[botPlayer.uid] || [];
      if (botHand.length > 0) {
        const discardCard = botHand[Math.floor(Math.random() * botHand.length)];
        await discardRummyCard(match.id, botPlayer.uid, discardCard);
      }
    }
  } catch (err) {
    console.error("[ArcadeBot] Rummy error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 2000);
  }
}

/**
 * Call Break Bot
 */
export async function executeCallBreakBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.callBreakState || match.status !== "PLAYING") return;
  const cbs = match.callBreakState;
  const botPlayer = Object.values(match.players || {}).find(
    (p) => p.uid === cbs.currentTurnUid && p.isBot
  );
  if (!botPlayer) return;

  const runKey = `${match.id}_call_break_bot_${cbs.phase}_${cbs.currentTrick.length}`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    if (cbs.phase === "BIDDING") {
      await bidCallBreak(match.id, botPlayer.uid, 3);
    } else {
      const hands: Record<string, string[]> = JSON.parse(cbs.handsStr || "{}");
      const botHand = hands[botPlayer.uid] || [];
      if (botHand.length > 0) {
        const cardToPlay = botHand[0];
        await playCallBreakCard(match.id, botPlayer.uid, cardToPlay);
      }
    }
  } catch (err) {
    console.error("[ArcadeBot] Call Break error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 1800);
  }
}

/**
 * Teen Patti Bot
 */
export async function executeTeenPattiBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.teenPattiState || match.status !== "PLAYING") return;
  const tps = match.teenPattiState;
  const botPlayer = Object.values(match.players || {}).find(
    (p) => p.uid === tps.currentTurnUid && p.isBot
  );
  if (!botPlayer) return;

  const runKey = `${match.id}_teen_patti_bot_${tps.pot}`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const action = Math.random() < 0.15 ? "PACK" : "CHAAL";
    await betTeenPatti(match.id, botPlayer.uid, action);
  } catch (err) {
    console.error("[ArcadeBot] Teen Patti error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 2000);
  }
}

/**
 * Satte Pe Satta Bot
 */
export async function executeSattePeSattaBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.sattePeSattaState || match.status !== "PLAYING") return;
  const sps = match.sattePeSattaState;
  const botPlayer = Object.values(match.players || {}).find(
    (p) => p.uid === sps.currentTurnUid && p.isBot
  );
  if (!botPlayer) return;

  const runKey = `${match.id}_satte_pe_satta_bot`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const hands: Record<string, string[]> = JSON.parse(sps.handsStr || "{}");
    const botHand = hands[botPlayer.uid] || [];
    if (botHand.length > 0) {
      await playSattePeSattaCard(match.id, botPlayer.uid, botHand[0]);
    }
  } catch (err) {
    console.error("[ArcadeBot] Satte Pe Satta error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 1800);
  }
}

/**
 * Bhabhi / Thulla Bot
 */
export async function executeBhabhiBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.bhabhiThullaState || match.status !== "PLAYING") return;
  const bts = match.bhabhiThullaState;
  const botPlayer = Object.values(match.players || {}).find(
    (p) => p.uid === bts.currentTurnUid && p.isBot
  );
  if (!botPlayer) return;

  const runKey = `${match.id}_bhabhi_bot`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const hands: Record<string, string[]> = JSON.parse(bts.handsStr || "{}");
    const botHand = hands[botPlayer.uid] || [];
    if (botHand.length > 0) {
      await playBhabhiCard(match.id, botPlayer.uid, botHand[0]);
    }
  } catch (err) {
    console.error("[ArcadeBot] Bhabhi error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 1800);
  }
}

/**
 * Mendicot Bot
 */
export async function executeMendicotBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.mendicotState || match.status !== "PLAYING") return;
  const ms = match.mendicotState;
  const botPlayer = Object.values(match.players || {}).find(
    (p) => p.uid === ms.currentTurnUid && p.isBot
  );
  if (!botPlayer) return;

  const runKey = `${match.id}_mendicot_bot`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const hands: Record<string, string[]> = JSON.parse(ms.handsStr || "{}");
    const botHand = hands[botPlayer.uid] || [];
    if (botHand.length > 0) {
      await playMendicotCard(match.id, botPlayer.uid, botHand[0]);
    }
  } catch (err) {
    console.error("[ArcadeBot] Mendicot error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 1800);
  }
}

/**
 * Cheat / Bluff Bot
 */
export async function executeCheatBluffBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.cheatBluffState || match.status !== "PLAYING") return;
  const cbs = match.cheatBluffState;
  const botPlayer = Object.values(match.players || {}).find(
    (p) => p.uid === cbs.currentTurnUid && p.isBot
  );
  if (!botPlayer) return;

  const runKey = `${match.id}_cheat_bluff_bot_${cbs.currentRank}`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 1400));
    const hands: Record<string, string[]> = JSON.parse(cbs.handsStr || "{}");
    const botHand = hands[botPlayer.uid] || [];
    if (botHand.length > 0) {
      const discard = [botHand[0]];
      await discardCheatBluff(match.id, botPlayer.uid, cbs.currentRank, discard);
    }
  } catch (err) {
    console.error("[ArcadeBot] Cheat Bluff error:", err);
  } finally {
    setTimeout(() => activeBotRuns.delete(runKey), 2000);
  }
}

