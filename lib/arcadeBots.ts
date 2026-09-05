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
  fireCarromShot,
  firePoolShot,
  playUnoCard,
  drawUnoCard,
  swapUnoHands,
  acceptUnoDrawPenalty,
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
  rollMonopolyDice,
  buyMonopolyProperty,
  buildMonopolyHouse,
  endMonopolyTurn,
  payJailFine,
  MONOPOLY_TILES,
  type MonopolyPropertyState,
  LUDO_CONFIG,
  type ArcadeMatch,
  type LudoToken,
  type ChessPiece,
  type UnoCard,
  type CarromPiece,
  type PoolBall,
  sendArcadeChatMessage,
} from "./arcade";

const activeBotRuns = new Set<string>();

/**
 * 8-Ball / 5-Discipline Pool Bot
 * (Executed with continuous physics simulation in PoolGame.tsx)
 */
export async function executePoolBotShot(match: ArcadeMatch): Promise<void> {
  // Managed by client-side physics loop in PoolGame.tsx for smooth visual trajectories
  return;
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
    activeBotRuns.delete(runKey);
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
    await tryBotTrashTalk(match.id, botPlayer, 0.15);
  } catch (err) {
    console.error("[ArcadeBot] Ludo error:", err);
  } finally {
    activeBotRuns.delete(runKey);
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
    await tryBotTrashTalk(match.id, botPlayer, 0.15);
  } catch (err) {
    console.error("[ArcadeBot] Chess error:", err);
  } finally {
    activeBotRuns.delete(runKey);
  }
}

/**
 * Uno Bot (Smart Strategy, Stacking Defense & 7-0 Swap AI)
 */
export async function executeUnoBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.unoState || match.status !== "PLAYING") return;

  const us = match.unoState;
  const botPlayer = Object.values(match.players || {}).find(
    (p) => p.uid === us.currentTurnUid && p.isBot
  );
  if (!botPlayer) return;

  const runKey = `${match.id}_uno_bot_${us.currentTurnUid}_${us.discardTop.color}_${us.discardTop.value}_${us.pendingDrawStack || 0}`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const hands: Record<string, UnoCard[]> = JSON.parse(us.handsStr || "{}");
    const botHand = hands[botPlayer.uid] || [];
    const top = us.discardTop;

    // 1. Handle Pending 7 Swap (Pick opponent with smallest hand)
    if (us.pendingSwapUid === botPlayer.uid) {
      const opponents = Object.entries(hands).filter(([uid]) => uid !== botPlayer.uid);
      opponents.sort((a, b) => a[1].length - b[1].length);
      const targetUid = opponents[0]?.[0];
      if (targetUid) {
        await swapUnoHands(match.id, botPlayer.uid, targetUid);
      }
      return;
    }

    // 2. Handle Active Draw Penalty Stack (+2 or +4)
    if (us.pendingDrawStack && us.pendingDrawStack > 0) {
      const stackType = us.pendingDrawType;
      const matchingStackCard = botHand.find((c) => c.value === stackType);
      if (matchingStackCard) {
        let chosenColor: "RED" | "BLUE" | "GREEN" | "YELLOW" = "RED";
        if (matchingStackCard.color === "WILD") {
          const colorCounts: Record<string, number> = { RED: 0, BLUE: 0, GREEN: 0, YELLOW: 0 };
          botHand.forEach((c) => {
            if (c.color !== "WILD") colorCounts[c.color] = (colorCounts[c.color] || 0) + 1;
          });
          chosenColor = (Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0][0] as any) || "RED";
        }
        await playUnoCard(match.id, botPlayer.uid, matchingStackCard, chosenColor, botHand.length === 2);
        return;
      } else {
        await acceptUnoDrawPenalty(match.id, botPlayer.uid);
        return;
      }
    }

    // 3. Regular Play: Filter playable cards
    const playableCards = botHand.filter(
      (c) => c.color === "WILD" || c.color === top.color || c.value === top.value
    );

    if (playableCards.length > 0) {
      // Prioritize: +4 / +2 / Action cards > 7 / 0 > same color > same value > Wild
      const chosenCard =
        playableCards.find((c) => c.value === "+4" || c.value === "+2" || c.value === "SKIP" || c.value === "REVERSE") ||
        playableCards.find((c) => c.value === "7" || c.value === "0") ||
        playableCards.find((c) => c.color === top.color) ||
        playableCards.find((c) => c.value === top.value) ||
        playableCards[0];

      let chosenColor: "RED" | "BLUE" | "GREEN" | "YELLOW" = "RED";
      if (chosenCard.color === "WILD") {
        const colorCounts: Record<string, number> = { RED: 0, BLUE: 0, GREEN: 0, YELLOW: 0 };
        botHand.forEach((c) => {
          if (c.color !== "WILD") colorCounts[c.color] = (colorCounts[c.color] || 0) + 1;
        });
        chosenColor = (Object.entries(colorCounts).sort((a, b) => b[1] - a[1])[0][0] as any) || "RED";
      }

      const willHaveOneCard = botHand.length === 2;
      const res = await playUnoCard(match.id, botPlayer.uid, chosenCard, chosenColor, willHaveOneCard);
      if (res.requiresHandSwap) {
        // If bot played a 7, swap with smallest opponent hand
        const opponents = Object.entries(hands).filter(([uid]) => uid !== botPlayer.uid);
        opponents.sort((a, b) => a[1].length - b[1].length);
        const targetUid = opponents[0]?.[0];
        if (targetUid) {
          await swapUnoHands(match.id, botPlayer.uid, targetUid);
        }
      }
    } else {
      await drawUnoCard(match.id, botPlayer.uid);
    }
    await tryBotTrashTalk(match.id, botPlayer, 0.15);
  } catch (err) {
    console.error("[ArcadeBot] Uno error:", err);
  } finally {
    activeBotRuns.delete(runKey);
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
    activeBotRuns.delete(runKey);
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
    activeBotRuns.delete(runKey);
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
    activeBotRuns.delete(runKey);
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
    activeBotRuns.delete(runKey);
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
    activeBotRuns.delete(runKey);
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
    activeBotRuns.delete(runKey);
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
    activeBotRuns.delete(runKey);
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

  const grid: (string | null)[][] = JSON.parse(match.gomokuState.gridStr || "[]");
  const runKey = `${match.id}_gomoku_bot_${match.gomokuState.gridStr?.length}_${Date.now()}`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 750));
    const emptyCells: { r: number; c: number; score: number }[] = [];
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];

    const countSequence = (r: number, c: number, color: string, dr: number, dc: number) => {
      let count = 0;
      let nr = r + dr;
      let nc = c + dc;
      while (nr >= 0 && nr < 15 && nc >= 0 && nc < 15 && grid[nr][nc] === color) {
        count++;
        nr += dr;
        nc += dc;
      }
      nr = r - dr;
      nc = c - dc;
      while (nr >= 0 && nr < 15 && nc >= 0 && nc < 15 && grid[nr][nc] === color) {
        count++;
        nr -= dr;
        nc -= dc;
      }
      return count;
    };

    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        if (!grid[r][c]) {
          let cellScore = 0;
          for (const [dr, dc] of directions) {
            const botSeq = countSequence(r, c, "WHITE", dr, dc);
            const humanSeq = countSequence(r, c, "BLACK", dr, dc);

            if (botSeq >= 4) cellScore += 1000; // Win instantly
            else if (humanSeq >= 4) cellScore += 800; // Block human win
            else if (botSeq === 3) cellScore += 200;
            else if (humanSeq === 3) cellScore += 150; // Block human 3
            else if (botSeq === 2) cellScore += 30;
            else if (humanSeq === 2) cellScore += 20;
          }
          // Center preference
          const distToCenter = Math.abs(7 - r) + Math.abs(7 - c);
          cellScore += Math.max(0, 14 - distToCenter);
          emptyCells.push({ r, c, score: cellScore });
        }
      }
    }

    if (emptyCells.length === 0) return;
    emptyCells.sort((a, b) => b.score - a.score);
    const chosen = emptyCells[0];
    await makeGomokuMove(match.id, botPlayer.uid, chosen.r, chosen.c);
  } catch (err) {
    console.error("[ArcadeBot] Gomoku error:", err);
  } finally {
    activeBotRuns.delete(runKey);
  }
}

/**
 * Reversi Bot (Legal Flip Validator & Corner Master AI)
 */
export async function executeReversiBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.reversiState || match.status !== "PLAYING") return;
  if (match.reversiState.currentTurn !== "LIGHT") return;

  const botPlayer = Object.values(match.players || {}).find((p) => p.isBot);
  if (!botPlayer) return;

  const board: (string | null)[][] = JSON.parse(match.reversiState.boardStr || "[]");
  const runKey = `${match.id}_reversi_bot_${match.reversiState.lightCount}_${match.reversiState.darkCount}`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 750));
    const currentTurn = "LIGHT";
    const oppColor = "DARK";
    const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

    const legalMoves: { r: number; c: number; flips: number; weight: number }[] = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c] !== null) continue;

        let totalFlipped = 0;
        for (const [dr, dc] of directions) {
          let nr = r + dr;
          let nc = c + dc;
          let count = 0;
          while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === oppColor) {
            count++;
            nr += dr;
            nc += dc;
          }
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === currentTurn && count > 0) {
            totalFlipped += count;
          }
        }

        if (totalFlipped > 0) {
          // Weight corners (high strategic value)
          let weight = totalFlipped;
          const isCorner = (r === 0 || r === 7) && (c === 0 || c === 7);
          const isEdge = r === 0 || r === 7 || c === 0 || c === 7;
          if (isCorner) weight += 50;
          else if (isEdge) weight += 15;

          legalMoves.push({ r, c, flips: totalFlipped, weight });
        }
      }
    }

    if (legalMoves.length === 0) return;

    legalMoves.sort((a, b) => b.weight - a.weight);
    const chosen = legalMoves[0];
    await makeReversiMove(match.id, botPlayer.uid, chosen.r, chosen.c);
  } catch (err) {
    console.error("[ArcadeBot] Reversi error:", err);
  } finally {
    activeBotRuns.delete(runKey);
  }
}

/**
 * Dots and Boxes Bot (Smart Box Hunter AI)
 */
export async function executeDotsAndBoxesBotTurn(match: ArcadeMatch): Promise<void> {
  if (!match.dotsAndBoxesState || match.status !== "PLAYING") return;

  const dbs = match.dotsAndBoxesState;
  const botPlayer = Object.values(match.players || {}).find(
    (p) => p.uid === dbs.currentTurnUid && p.isBot
  );
  if (!botPlayer) return;

  const lines: Record<string, string> = JSON.parse(dbs.linesStr || "{}");
  const boxes: Record<string, string> = JSON.parse(dbs.boxesStr || "{}");
  const runKey = `${match.id}_dots_bot_${Object.keys(lines).length}_${dbs.currentTurnUid}`;
  if (activeBotRuns.has(runKey)) return;
  activeBotRuns.add(runKey);

  try {
    await new Promise((resolve) => setTimeout(resolve, 650));
    
    // 1. Check all 3x3 boxes to see if any box has 3 sides claimed (winning move)
    let winningMove: string | null = null;
    const safeMoves: string[] = [];
    const allUnselected: string[] = [];

    // Helper to get lines of a box
    const getBoxLines = (r: number, c: number) => {
      return {
        top: `h_${r}_${c}`,
        bottom: `h_${r + 1}_${c}`,
        left: `v_${r}_${c}`,
        right: `v_${r}_${c + 1}`,
      };
    };

    // Gather all unselected lines
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (c < 3) {
          const hKey = `h_${r}_${c}`;
          if (!lines[hKey]) allUnselected.push(hKey);
        }
        if (r < 3) {
          const vKey = `v_${r}_${c}`;
          if (!lines[vKey]) allUnselected.push(vKey);
        }
      }
    }

    if (allUnselected.length === 0) return;

    // Scan boxes to find captures or safe lines
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const boxKey = `b_${r}_${c}`;
        if (!boxes[boxKey]) {
          const { top, bottom, left, right } = getBoxLines(r, c);
          const boxLines = [top, bottom, left, right];
          const unclimedInBox = boxLines.filter((l) => !lines[l]);

          if (unclimedInBox.length === 1) {
            // Priority 1: Instant box completion!
            winningMove = unclimedInBox[0];
            break;
          }
        }
      }
      if (winningMove) break;
    }

    // If no instant win, find lines that don't give away a box (i.e. doesn't leave 1 uncompleted line)
    if (!winningMove) {
      for (const candidate of allUnselected) {
        let givesAwayBox = false;
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            const { top, bottom, left, right } = getBoxLines(r, c);
            const boxLines = [top, bottom, left, right];
            if (boxLines.includes(candidate)) {
              const unclimedInBox = boxLines.filter((l) => !lines[l] && l !== candidate);
              if (unclimedInBox.length === 1) {
                givesAwayBox = true;
                break;
              }
            }
          }
          if (givesAwayBox) break;
        }
        if (!givesAwayBox) safeMoves.push(candidate);
      }
    }

    const chosenKey = winningMove || (safeMoves.length > 0 ? safeMoves[Math.floor(Math.random() * safeMoves.length)] : allUnselected[Math.floor(Math.random() * allUnselected.length)]);
    await claimDotsLine(match.id, botPlayer.uid, chosenKey);
  } catch (err) {
    console.error("[ArcadeBot] Dots and boxes error:", err);
  } finally {
    activeBotRuns.delete(runKey);
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
    activeBotRuns.delete(runKey);
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
    activeBotRuns.delete(runKey);
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
    activeBotRuns.delete(runKey);
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
    activeBotRuns.delete(runKey);
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
    activeBotRuns.delete(runKey);
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
    activeBotRuns.delete(runKey);
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
    activeBotRuns.delete(runKey);
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
    activeBotRuns.delete(runKey);
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
    activeBotRuns.delete(runKey);
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
    activeBotRuns.delete(runKey);
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
    activeBotRuns.delete(runKey);
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
    activeBotRuns.delete(runKey);
  }
}

const TRASH_TALK_POOL = [
  "You call that a move? 🥱",
  "Calculating your defeat... 100% certainty.",
  "My CPU runs on your tears.",
  "Error 404: Player skill not found.",
  "I've seen random number generators with better strategy.",
  "Is that your best shot?",
  "I'm not even using 1% of my processing power.",
  "Just forfeit already.",
  "Beep boop. You're terrible. Boop.",
  "This is almost too easy.",
  "Are you even trying?",
  "I was coded in a weekend and I'm still beating you.",
];

export async function tryBotTrashTalk(matchId: string, botPlayer: any, chance = 0.2) {
  if (Math.random() > chance) return;
  const text = TRASH_TALK_POOL[Math.floor(Math.random() * TRASH_TALK_POOL.length)];
  try {
    await sendArcadeChatMessage(matchId, {
      uid: botPlayer.uid,
      handle: botPlayer.handle + " [AI]",
      avatar: "🤖"
    }, text);
  } catch (e) {
    // ignore
  }
}

export async function executeMonopolyBotTurn(match: ArcadeMatch, botUid: string): Promise<void> {
  const ms = match.monopolyState;
  if (!ms || ms.currentTurnUid !== botUid || match.status === "FINISHED") return;

  const positions: Record<string, number> = JSON.parse(ms.positionsStr || "{}");
  const cash: Record<string, number> = JSON.parse(ms.cashStr || "{}");
  const properties: Record<number, MonopolyPropertyState> = JSON.parse(ms.propertiesStr || "{}");
  const inJailTurns: Record<string, number> = JSON.parse(ms.inJailTurnsStr || "{}");

  // If in jail and has cash, pay fine
  if ((inJailTurns[botUid] || 0) > 0 && (cash[botUid] || 0) > 300 && Math.random() > 0.4) {
    try {
      await payJailFine(match.id, botUid);
    } catch (_) {}
  }

  // 1. Roll if not yet rolled
  if (!ms.hasRolledThisTurn) {
    await new Promise((r) => setTimeout(r, 600));
    try {
      await rollMonopolyDice(match.id, botUid);
    } catch (_) {}
    return;
  }

  // 2. Buy property if landed on unowned property and has cash reserve
  const botPos = positions[botUid] || 0;
  const tile = MONOPOLY_TILES[botPos];
  if (tile && tile.price > 0 && !properties[botPos]?.ownerUid) {
    const safetyBuffer = 200;
    if ((cash[botUid] || 0) - tile.price >= safetyBuffer) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        await buyMonopolyProperty(match.id, botUid, botPos);
      } catch (_) {}
    }
  }

  // 3. Build house using VaR_0.95 Solvency Razor
  // Calculate bot's next-turn VaR_0.95 hazard reserve
  let var95Hazard = 0;
  const probs: Record<number, number> = {
    2: 1 / 36, 3: 2 / 36, 4: 3 / 36, 5: 4 / 36, 6: 5 / 36, 7: 6 / 36,
    8: 5 / 36, 9: 4 / 36, 10: 3 / 36, 11: 2 / 36, 12: 1 / 36,
  };
  const outcomes: { cost: number; prob: number }[] = [];
  for (let d = 2; d <= 12; d++) {
    const tIdx = (botPos + d) % 40;
    const tMeta = MONOPOLY_TILES[tIdx];
    const pMeta = properties[tIdx];
    let cost = 0;
    if (tMeta.group === "SPECIAL") {
      if (tMeta.name === "Income Tax") cost = 200;
      else if (tMeta.name === "Luxury Tax") cost = 100;
    } else if (pMeta && pMeta.ownerUid && pMeta.ownerUid !== botUid && !pMeta.isMortgaged) {
      cost = pMeta.houses > 0 ? (tMeta.rent[pMeta.houses] || tMeta.rent[0]) : tMeta.rent[0];
    }
    outcomes.push({ cost, prob: probs[d] || 1 / 36 });
  }
  outcomes.sort((a, b) => b.cost - a.cost);
  let cProb = 0;
  for (const o of outcomes) {
    cProb += o.prob;
    if (cProb >= 0.05) {
      var95Hazard = o.cost;
      break;
    }
  }

  const deployableCapital = Math.max(0, (cash[botUid] || 0) - var95Hazard);

  const botOwned = Object.entries(properties)
    .filter(([_, p]) => p.ownerUid === botUid && p.houses < 4)
    .map(([id]) => Number(id));
  for (const propId of botOwned) {
    const pTile = MONOPOLY_TILES[propId];
    if (pTile && pTile.houseCost > 0 && deployableCapital >= pTile.houseCost) {
      const groupProps = MONOPOLY_TILES.filter((t) => t.group === pTile.group);
      const hasMonopoly = groupProps.every((gp) => properties[gp.id]?.ownerUid === botUid);
      if (hasMonopoly) {
        try {
          await buildMonopolyHouse(match.id, botUid, propId);
        } catch (_) {}
        break;
      }
    }
  }

  // 4. End turn
  await new Promise((r) => setTimeout(r, 700));
  try {
    await endMonopolyTurn(match.id, botUid);
  } catch (_) {}
}


