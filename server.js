const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { Hand } = require("pokersolver");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const {drawCapacity, validateDrawIndices} = require("./draw-capacity");
const {socketHasSeat, canJoinRoom} = require("./session-guards");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true } });
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

const rooms = new Map();
const DISCONNECT_GRACE_MS = 60_000;
const disconnectTimers = new Map();
function cancelDisconnectTimer(token) {
  const timer = disconnectTimers.get(token);
  if (timer) clearTimeout(timer);
  disconnectTimers.delete(token);
}
function expireDisconnectedPlayer(room, token) {
  disconnectTimers.delete(token);
  const p = room.players.find(player => player.resumeToken === token);
  if (!p || p.connected || room.status !== "playing" || p.sittingOut) return;
  if (room.gameType === "blackjack") {
    if (p.blackjackStake && !p.blackjackResult) p.blackjackResult = "Standing";
    blackjackNext(room);
  } else if (room.gameType === "draw" && room.street === "draw") {
    p.drew = true; // Stand pat: retain cards, rather than folding automatically.
    room.message = `${p.name} stood pat after disconnecting`;
    if (room.players.every(x => x.drew || x.folded || x.allIn || x.sittingOut)) finishDrawRound(room);
    else emitRoom(room);
  } else if (!p.folded && !p.allIn) {
    const wasTurn = room.players[room.turnIndex] === p;
    p.folded = true;
    p.acted = true;
    room.lastAction = `${p.name} folded after 60 seconds disconnected`;
    if (activePlayers(room).length === 1) finishHand(room, activePlayers(room));
    else if (wasTurn) {
      if (room.gameType === "brag") advanceBrag(room);
      else advanceTurn(room, room.turnIndex);
    } else emitRoom(room);
  } else emitRoom(room);
}
function scheduleDisconnect(room, player) {
  cancelDisconnectTimer(player.resumeToken);
  const token = player.resumeToken;
  const timer = setTimeout(() => expireDisconnectedPlayer(room, token), DISCONNECT_GRACE_MS);
  timer.unref?.();
  disconnectTimers.set(token, timer);
}

// Server-authoritative turn clock. Re-arming only when the turn/street changes
// prevents repeated broadcasts or a card peek from resetting the countdown.
const TURN_MS = 30_000;
// An active disconnected player retains the full reconnection grace period.
function turnKey(room, player) { return `${room.handNumber}:${room.street}:${player.resumeToken}`; }
const turnTimers = new Map();
function clearTurnClock(room) {
  const entry = turnTimers.get(room.code);
  if (entry) clearTimeout(entry.timer);
  turnTimers.delete(room.code);
  room.turnDeadline = null;
}
function syncTurnClock(room) {
  const player = room.status === "playing" ? room.players[room.turnIndex] : null;
  if (!player || player.folded || player.allIn || room.street === "draw" || !player.connected) {
    clearTurnClock(room);
    return;
  }
  const key = turnKey(room, player);
  if (turnTimers.get(room.code)?.key === key) return;
  clearTurnClock(room);
  const deadline = Date.now() + TURN_MS;
  room.turnDeadline = deadline;
  const timer = setTimeout(() => {
    if (turnTimers.get(room.code)?.key !== key) return;
    turnTimers.delete(room.code);
    room.turnDeadline = null;
    if (room.status !== "playing" || room.players[room.turnIndex] !== player || !player.connected) return;
    if (room.gameType === "blackjack") blackjackAct(room, player, "stand");
    else if (room.gameType === "brag") act(room, player, "fold");
    else act(room, player, room.currentBet === player.roundBet ? "check" : "fold");
  }, TURN_MS);
  timer.unref?.();
  turnTimers.set(room.code, {key, timer});
}

// Draw exchange timer: a player who does not exchange stands pat after 30 seconds.
const drawTimers = new Map();
function clearDrawTimers(room) {
  for (const [key, timer] of drawTimers) {
    if (key.startsWith(`${room.code}:`)) { clearTimeout(timer); drawTimers.delete(key); }
  }
}
function syncDrawTimers(room) {
  if (room.status !== "playing" || room.gameType !== "draw" || room.street !== "draw") {
    clearDrawTimers(room);
    return;
  }
  for (const p of room.players) {
    const key = `${room.code}:${p.resumeToken}`;
    if (p.folded || p.allIn || p.drew || p.sittingOut || !p.connected) {
      if (drawTimers.has(key)) { clearTimeout(drawTimers.get(key)); drawTimers.delete(key); }
      continue;
    }
    if (drawTimers.has(key)) continue;
    const timer = setTimeout(() => {
      drawTimers.delete(key);
      if (room.status !== "playing" || room.street !== "draw" || p.drew || p.folded || !p.connected) return;
      p.drew = true;
      room.message = `${p.name} stood pat when the exchange timer expired`;
      if (room.players.every(x => x.drew || x.folded || x.allIn || x.sittingOut || !x.connected)) finishDrawRound(room);
      else emitRoom(room);
    }, TURN_MS);
    timer.unref?.();
    drawTimers.set(key, timer);
  }
}

// Opt-in persistence. On restart an interrupted hand is cancelled and balances
// are restored to the last completed hand, avoiding partial-pot corruption.
const STATE_FILE = process.env.GILDED_STATE_FILE || "";
let saveTimer = null;
function snapshotRoom(room) {
  return {
    code: room.code, hostToken: room.hostToken, gameType: room.gameType,
    handNumber: room.handNumber, dealerIndex: room.dealerIndex, dealerToken: room.dealerToken || null,
    players: room.players.map(p => ({name:p.name, resumeToken:p.resumeToken, stack:p.stack, avatar:p.avatar}))
  };
}
function persistRooms() {
  if (!STATE_FILE) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const data = {version:1, rooms:[...rooms.values()].map(room => room.status === "playing" && room.preHandSnapshot ? room.preHandSnapshot : snapshotRoom(room))};
      fs.mkdirSync(path.dirname(STATE_FILE), {recursive:true});
      const tmp = `${STATE_FILE}.${process.pid}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(data), {mode:0o600});
      fs.renameSync(tmp, STATE_FILE);
    } catch(e) { console.error("Room persistence failed:", e.message); }
  }, 150);
  saveTimer.unref?.();
}
function loadRooms() {
  if (!STATE_FILE || !fs.existsSync(STATE_FILE)) return;
  try {
    const data = JSON.parse(fs.readFileSync(STATE_FILE,"utf8"));
    if(data.version !== 1 || !Array.isArray(data.rooms)) throw Error("Unsupported snapshot format");
    const usedTokens = new Set();
    for(const entry of data.rooms) {
      if(!entry || typeof entry !== "object" || !/^[A-Z2-9]{4}$/.test(entry.code) || !/^[a-f0-9]{48}$/.test(entry.hostToken) || !Array.isArray(entry.players)) continue;
      if(rooms.has(entry.code) || usedTokens.has(entry.hostToken)) continue;
      const validPlayers = entry.players.slice(0, MAX_ROOM_PLAYERS).filter(p => p && typeof p === "object" && /^[a-f0-9]{48}$/.test(p.resumeToken) && Number.isSafeInteger(p.stack) && p.stack >= 0 && p.stack <= 1000000000 && typeof p.name === "string");
      if(validPlayers.some(p => usedTokens.has(p.resumeToken) || p.resumeToken === entry.hostToken) || new Set(validPlayers.map(p => p.resumeToken)).size !== validPlayers.length) continue;
      const room=createRoom(null);
      rooms.delete(room.code);
      room.code=entry.code; room.hostToken=entry.hostToken;
      room.gameType=["holdem","omaha","draw","blackjack","brag"].includes(entry.gameType)?entry.gameType:"holdem";
      room.handNumber=Number.isSafeInteger(entry.handNumber)?Math.max(0,entry.handNumber):0;
      room.dealerIndex=Number.isSafeInteger(entry.dealerIndex)?entry.dealerIndex:0;
      room.dealerToken=typeof entry.dealerToken === "string" ? entry.dealerToken : null;
      room.players=validPlayers.map(p=>({...newPlayer(null,p.name),id:null,resumeToken:p.resumeToken,stack:p.stack,avatar:normaliseAvatar(p.avatar),connected:false}));
      room.message="Table recovered after restart. Rejoin using your original device.";
      rooms.set(room.code,room);
      usedTokens.add(room.hostToken);
      for(const p of room.players) usedTokens.add(p.resumeToken);
    }
    console.log(`Recovered ${rooms.size} lobby tables`);
  }catch(e){console.error("Unable to restore room snapshots:",e.message);}
}

const MAX_ROOM_PLAYERS = 8;
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];

function code() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 4; i++) result += alphabet[crypto.randomInt(alphabet.length)];
  return result;
}
function makeDeck() {
  const deck = [];
  for (const suit of SUITS) for (const rank of RANKS) {
    const solverSuit = ({ "♠": "s", "♥": "h", "♦": "d", "♣": "c" })[suit];
    deck.push({ rank, suit, code: `${rank}${solverSuit}` });
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
function normaliseAvatar(value) { return Number.isInteger(value) && value >= 1 && value <= 16 ? value : 1; }
function newPlayer(id, name, avatar = 1) {
  return { id, resumeToken: crypto.randomBytes(24).toString("hex"), name: String(name || "Player").trim().slice(0, 18) || "Player", avatar: (Number.isInteger(avatar) && avatar >= 1 && avatar <= 16 ? avatar : 1), stack: 1000,
    hole: [], committed: 0, roundBet: 0, folded: false, allIn: false, acted: false, connected: true, drew: false, sittingOut: false };
}
function roomPublic(room) {
  return {
    code: room.code, status: room.status, hostId: room.hostId, gameType: room.gameType,
    players: room.players.map((p, i) => ({
      id: p.id, name: p.name, avatar: (Number.isInteger(p.avatar) && p.avatar >= 1 && p.avatar <= 16 ? p.avatar : 1), stack: p.stack, committed: p.committed,
      roundBet: p.roundBet, folded: p.folded, allIn: p.allIn, connected: p.connected, sittingOut: !!p.sittingOut, bragSeen: !!p.bragSeen,
      seat: i, isDealer: p.resumeToken === room.dealerToken, isTurn: room.players[room.turnIndex]?.id === p.id
    })),
    dealerCards: room.gameType === "blackjack" ? (room.status === "playing" ? room.dealerCards.map((c,i)=>i===1?null:c) : room.dealerCards) : [], community: room.community, pot: room.pot, currentBet: room.currentBet,
    minRaise: room.minRaise, street: room.street, message: room.message,
    dealerIndex: room.dealerIndex, turnId: room.players[room.turnIndex]?.id || null,
    handNumber: room.handNumber, drawCount: room.players.filter(p=>p.drew).length, smallBlind: room.smallBlind, bigBlind: room.bigBlind,
    winners: room.winners || [], showdown: room.status === "complete" ? (room.showdown || null) : null, lastAction: room.lastAction || "", turnDeadline: room.turnDeadline || null
  };
}
function emitRoom(room) {
  syncTurnClock(room);
  syncDrawTimers(room);
  persistRooms();
  io.to(room.code).emit("update-tv", roomPublic(room));
  for (const p of room.players) {
    if (!p.connected) continue;
    io.to(p.id).emit("update-player", {
      roomCode: room.code, playerId: p.id, hole: room.gameType === "brag" && !p.bragSeen && room.status === "playing" ? p.hole.map(()=>null) : p.hole, blackjackResult: p.blackjackResult || "", blackjackStake: p.blackjackStake || 0,
      stack: p.stack, committed: p.committed, roundBet: p.roundBet, bragSeen: !!p.bragSeen, bragStake: room.bragStake || 20, bragCost: room.gameType === "brag" ? (p.bragSeen ? 2 : 1) * (room.bragStake || 20) : 0, bragStake: room.gameType === "brag" ? room.bragStake : undefined,
      isTurn: room.players[room.turnIndex]?.id === p.id,
      blackjack: room.gameType === "blackjack",
      canCheck: room.currentBet === p.roundBet,
      callAmount: Math.max(0, Math.min(p.stack, room.currentBet - p.roundBet)),
      minRaiseTo: Math.min(p.stack + p.roundBet, room.currentBet + room.minRaise),
      maxRaiseTo: p.stack + p.roundBet,
      pot: room.pot, currentBet: room.currentBet, turnDeadline: room.turnDeadline || null, status: room.status, street: room.street, gameType: room.gameType, canDraw: room.gameType === "draw" && room.street === "draw" && !p.folded && !p.drew && !p.allIn
    });
  }
}
function createRoom(hostId) {
  let roomCode;
  do { roomCode = code(); } while (rooms.has(roomCode));
  const room = {
    code: roomCode, hostId, hostToken: crypto.randomBytes(24).toString("hex"), players: [], status: "lobby", gameType: "holdem", deck: [], community: [],
    pot: 0, currentBet: 0, minRaise: 20, turnIndex: -1, dealerIndex: 0, dealerToken: null,
    dealerCards: [], street: "lobby", message: "Waiting for players to join", handNumber: 0,
    smallBlind: 10, bigBlind: 20, winners: [], lastAction: "", actedThisStreet: new Set()
  };
  rooms.set(roomCode, room);
  persistRooms();
  return room;
}
function nextEligible(room, from, predicate = p => !p.folded && !p.allIn && p.stack >= 0) {
  for (let step = 1; step <= room.players.length; step++) {
    const idx = (from + step + room.players.length) % room.players.length;
    if (!room.players[idx].sittingOut && predicate(room.players[idx])) return idx;
  }
  return -1;
}
function activePlayers(room) { return room.players.filter(p => !p.folded && !p.sittingOut); }
function actionablePlayers(room) { return activePlayers(room).filter(p => !p.allIn && p.stack > 0); }
function roundComplete(room) {
  const able = actionablePlayers(room);
  if (able.length === 0) return true;
  if (able.length === 1) return able[0].acted && able[0].roundBet === room.currentBet;
  return able.every(p => p.acted && p.roundBet === room.currentBet);
}
function cardCode(card) { return card.code; }
// Three-Card Brag house rules: prial > running flush > run > flush > pair > high card.
// A-2-3 is the highest run, followed by A-K-Q; A-2-3 is otherwise ace-low.
function bragScore(cards) {
  if (!Array.isArray(cards) || cards.length !== 3) throw Error("Brag needs three cards");
  const values = cards.map(c => RANKS.indexOf(c.rank) + 2).sort((a,b)=>b-a);
  const sameSuit = cards.every(c => c.suit === cards[0].suit);
  const prial = values[0] === values[2];
  const unique = new Set(values).size === 3;
  const wheel = values.join(',') === '14,3,2';
  const run = unique && (wheel || values[0] - values[2] === 2);
  const runHigh = wheel ? 15 : values[0];
  if (prial) return [6, values[0] === 3 ? 15 : values[0]];
  if (run && sameSuit) return [5, runHigh];
  if (run) return [4, runHigh];
  if (sameSuit) return [3, ...values];
  if (values[0] === values[1] || values[1] === values[2]) {
    const pair = values[1];return [2,pair,values.find(v=>v!==pair)];
  }
  return [1,...values];
}
function compareScores(a,b) {
  for(let i=0;i<Math.max(a.length,b.length);i++){
    const diff=(a[i]||0)-(b[i]||0);if(diff)return diff>0?1:-1;
  }
  return 0;
}
function bragHand(cards) {
  const score=bragScore(cards);
  return {score,compare(other){return compareScores(score,other.score)}};
}
// pokersolver.compare returns -1 for a stronger hand; Brag uses +1.
// Normalise both to the convention expected by settlePots.
function pokerHand(hand) {
  return {
    raw: hand,
    descr: hand.descr,
    compare(other) { const result = hand.compare(other.raw); return result === 0 ? 0 : -result; }
  };
}
function solvePlayerHand(room,p) {
  if(room.gameType === "brag") return bragHand(p.hole);
  if(room.gameType === "draw") return pokerHand(Hand.solve(p.hole.map(cardCode)));
  if(room.gameType !== "omaha") return pokerHand(Hand.solve([...p.hole,...room.community].map(cardCode)));
  // Omaha requires exactly two hole cards and exactly three board cards.
  const candidates=[];
  for(let a=0;a<p.hole.length;a++)for(let b=a+1;b<p.hole.length;b++)
    for(let c=0;c<room.community.length;c++)for(let d=c+1;d<room.community.length;d++)
      for(let e=d+1;e<room.community.length;e++)
        candidates.push(Hand.solve([p.hole[a],p.hole[b],room.community[c],room.community[d],room.community[e]].map(cardCode)));
  if(!candidates.length)throw Error("Incomplete Omaha board");
  return pokerHand(Hand.winners(candidates)[0]);
}
function resetStreet(room) {
  room.currentBet = 0;
  room.minRaise = room.bigBlind;
  room.actedThisStreet = new Set();
  for (const p of room.players) { p.roundBet = 0; p.acted = p.folded || p.allIn; }
}
function drawCommunity(room, count) {
  for (let i = 0; i < count; i++) room.community.push(room.deck.pop());
}
function advanceStreet(room) {
  if(room.gameType === "brag") return showdown(room);
  if(room.gameType === "draw") {
    if(room.street === "pre-draw") {
      room.street="draw";room.turnIndex=-1;
      room.players.forEach(p=>{p.drew=p.folded || p.allIn;});
      room.message="Draw round — select up to three cards to replace, or stand pat";
      if(room.players.every(p=>p.drew || !p.connected)) return finishDrawRound(room);
      return emitRoom(room);
    }
    if(room.street === "post-draw") return showdown(room);
    return;
  }
  if (activePlayers(room).length === 1) return finishHand(room, activePlayers(room));
  if (room.street === "pre-flop") { room.street = "flop"; drawCommunity(room, 3); }
  else if (room.street === "flop") { room.street = "turn"; drawCommunity(room, 1); }
  else if (room.street === "turn") { room.street = "river"; drawCommunity(room, 1); }
  else if (room.street === "river") return showdown(room);
  resetStreet(room);
  room.message = room.street[0].toUpperCase() + room.street.slice(1);
  if (actionablePlayers(room).length <= 1) {
    while (room.community.length < 5) {
      if (room.street === "flop") { room.street = "turn"; drawCommunity(room, 1); }
      else if (room.street === "turn") { room.street = "river"; drawCommunity(room, 1); }
      else if (room.street === "river") break;
      else break;
    }
    if (room.community.length === 5) return showdown(room);
  }
  room.turnIndex = nextEligible(room, room.dealerIndex);
  if (room.turnIndex < 0) return advanceStreet(room);
  emitRoom(room);
}
function finishDrawRound(room) {
  resetStreet(room);room.street="post-draw";room.message="Final betting round";
  room.turnIndex=nextEligible(room,room.dealerIndex);
  if(room.turnIndex<0) return showdown(room);
  emitRoom(room);
}
function settlePots(room, winnersByHand) {
  const eligible = room.players.filter(p => !p.folded);
  const levels = [...new Set(room.players.map(p => p.committed).filter(v => v > 0))].sort((a,b)=>a-b);
  let previous = 0;
  const awards = new Map();
  for (const level of levels) {
    const contributors = room.players.filter(p => p.committed >= level);
    const amount = (level - previous) * contributors.length;
    const contenders = contributors.filter(p => !p.folded);
    let winners = contenders;
    if (contenders.length > 1) {
      const solved = contenders.map(p => ({ p, hand: winnersByHand.get(p.id) })).filter(x => x.hand);
      let best = [];
      for (const item of solved) {
        if (!best.length) best = [item];
        else {
          const cmp = item.hand.compare(best[0].hand);
          if (cmp > 0) best = [item];
          else if (cmp === 0) best.push(item);
        }
      }
      winners = best.map(x => x.p);
    }
    if (winners.length) {
      const share = Math.floor(amount / winners.length);
      let remainder = amount - share * winners.length;
      winners.forEach(p => {
        awards.set(p.id, (awards.get(p.id) || 0) + share + (remainder-- > 0 ? 1 : 0));
      });
    }
    previous = level;
  }
  for (const p of room.players) p.stack += awards.get(p.id) || 0;
  return [...awards.entries()].filter(([, amount]) => amount > 0).map(([id, amount]) => ({
    id, name: room.players.find(p => p.id === id)?.name, amount
  }));
}
function finishHand(room, winners) {
  const hands = new Map();
  if (room.community.length === 5 || room.gameType === "draw" || room.gameType === "brag") {
    for (const p of room.players.filter(p => !p.folded)) {
      try { hands.set(p.id, solvePlayerHand(room,p)); } catch {}
    }
  }
  if (winners && winners.length === 1 && activePlayers(room).length === 1) {
    const winner = winners[0];
    winner.stack += room.pot;
    room.winners = [{ id: winner.id, name: winner.name, amount: room.pot }];
  } else {
    room.winners = settlePots(room, hands);
  }
  const contested = activePlayers(room).length > 1;
  room.showdown = contested ? {
    revealed: room.players.filter(p => !p.folded && p.hole.length).map(p => ({
      id: p.id, name: p.name, cards: p.hole, handName: hands.get(p.id)?.descr || "Hand",
      amount: room.winners.find(w => w.id === p.id)?.amount || 0
    })),
    winners: room.winners.map(w => ({ id: w.id, name: w.name, amount: w.amount }))
  } : { revealed: [], winners: room.winners.map(w => ({ id: w.id, name: w.name, amount: w.amount })) };
  room.pot = 0;
  room.status = "complete";
  room.street = "showdown";
  room.turnIndex = -1;
  room.message = room.winners.length
    ? `Hand complete — ${room.winners.map(w => `${w.name} +${w.amount}`).join(", ")}`
    : "Hand complete";
  emitRoom(room);
}
function showdown(room) {
  const eligible = activePlayers(room);
  if (eligible.length === 1) return finishHand(room, eligible);
  const hands = new Map();
  for (const p of eligible) {
    try { hands.set(p.id, solvePlayerHand(room,p)); } catch {}
  }
  // finishHand recalculates hands and distributes contribution tiers, including side pots.
  finishHand(room, eligible);
}
function postBet(room, p, amount) {
  const paid = Math.max(0, Math.min(p.stack, amount));
  p.stack -= paid; p.roundBet += paid; p.committed += paid; room.pot += paid;
  if (p.stack === 0) p.allIn = true;
  return paid;
}
function blackjackTotal(cards) {
  let total=0,aces=0;
  for(const c of cards){if(c.rank==="A"){total+=11;aces++;}else if(["T","J","Q","K"].includes(c.rank))total+=10;else total+=Number(c.rank);}
  while(total>21 && aces){total-=10;aces--;}
  return total;
}
function blackjackFinish(room){
  room.status="complete";room.street="showdown";room.turnIndex=-1;
  // Dealer stands on all 17s (including soft 17).
  const live=room.players.filter(p=>p.blackjackStake && blackjackTotal(p.hole)<=21);
  if(live.length){while(blackjackTotal(room.dealerCards)<17)room.dealerCards.push(room.deck.pop());}
  const dealer=blackjackTotal(room.dealerCards), natural=room.dealerCards.length===2&&dealer===21;
  for(const p of room.players){const stake=p.blackjackStake||0;if(!stake)continue;
    const total=blackjackTotal(p.hole),bj=p.hole.length===2&&total===21;
    let pay=0;
    if(total>21){p.blackjackResult="Bust";}
    else if(natural&&!bj){p.blackjackResult="Dealer blackjack";}
    else if(bj&&!natural){pay=stake*2+Math.floor(stake/2);p.blackjackResult="Blackjack! 3:2";}
    else if((bj&&natural)||(!natural&&!bj&&total===dealer)){pay=stake;p.blackjackResult="Push";}
    else if(dealer>21||total>dealer){pay=stake*2;p.blackjackResult="Win";}
    else p.blackjackResult="Dealer wins";
    p.stack+=pay;
  }
  room.message=`Dealer ${dealer} · Round complete. Host can deal again.`;
  room.winners=room.players.filter(p=>p.blackjackResult?.startsWith("Win")||p.blackjackResult?.startsWith("Blackjack")).map(p=>({name:p.name}));
  emitRoom(room);
}
function blackjackNext(room){
  const next=room.players.findIndex(p=>p.blackjackStake&&!p.blackjackResult&&blackjackTotal(p.hole)<21 && p.connected);
  if(next<0)return blackjackFinish(room);
  room.turnIndex=next;room.message=`${room.players[next].name} to act · Hit or Stand`;emitRoom(room);
}
function blackjackStart(room){
  const seated=room.players.filter(p=>p.connected&&p.stack>=20);
  if(!seated.length){room.message="A player needs at least 20 chips";return emitRoom(room);}
  room.status="playing";room.handNumber++;
  room.deck=makeDeck();room.community=[];room.dealerCards=[room.deck.pop(),room.deck.pop()];room.street="blackjack";room.pot=0;room.currentBet=0;room.winners=[];room.showdown=null;
  for(const p of room.players){p.hole=[];p.blackjackResult="";p.blackjackStake=0;p.folded=false;p.roundBet=0;p.committed=0;
    p.sittingOut = !p.connected || p.stack < 20;
    if(!p.sittingOut){p.stack-=20;p.blackjackStake=20;p.hole=[room.deck.pop(),room.deck.pop()];
      if(blackjackTotal(p.hole)===21)p.blackjackResult="Natural blackjack";
    }
  }
  // Natural 21 is terminal: players cannot hit or double it. Settlement still checks the dealer.
  blackjackNext(room);
}
function blackjackAct(room,p,action){
  if(room.status!=="playing"||room.gameType!=="blackjack"||room.players[room.turnIndex]?.id!==p.id)return;
  if(action==="hit"){
    p.hole.push(room.deck.pop());const total=blackjackTotal(p.hole);
    if(total>=21){if(total>21)p.blackjackResult="Bust";blackjackNext(room);}else{room.message=`${p.name} hit · ${total}`;emitRoom(room);}
  }else if(action==="stand"){p.blackjackResult="Standing";blackjackNext(room);}
  else if(action==="double"){
    if(p.hole.length!==2||p.stack<p.blackjackStake)return io.to(p.id).emit("action-error","Double requires two cards and enough chips.");
    p.stack-=p.blackjackStake;p.blackjackStake*=2;p.hole.push(room.deck.pop());
    p.blackjackResult=blackjackTotal(p.hole)>21?"Bust":"Standing";blackjackNext(room);
  }else io.to(p.id).emit("action-error","Invalid Blackjack action.");
}
function startHand(room) {
  room.preHandSnapshot = snapshotRoom(room);
  if(room.gameType === "blackjack")return blackjackStart(room);
  const eligible = room.players.filter(p => p.connected && p.stack >= (room.gameType === "brag" ? room.smallBlind + room.bigBlind : 1));
  if (eligible.length < 2) { room.message = "At least two players are required"; return emitRoom(room); }
  // Five-card hands plus up to three replacement cards each must fit in one 52-card deck.
  if (room.gameType === "draw" && !drawCapacity(eligible.length).safe) {
    room.message = "Five-Card Draw supports a maximum of six players with three-card exchanges.";
    return emitRoom(room);
  }
  // Keep every seat and its recovery token. Non-participants are marked out for this hand.
  const eligibleTokens = new Set(eligible.map(p => p.resumeToken));
  room.players.forEach(p => {
    p.sittingOut = !eligibleTokens.has(p.resumeToken);
    p.hole = []; p.folded = p.sittingOut; p.allIn = false;
    p.drew = p.sittingOut; p.acted = p.sittingOut; p.committed = 0; p.roundBet = 0;
  });
  room.status = "playing"; room.handNumber++; room.deck = makeDeck(); room.community = [];
  room.pot = 0; room.currentBet = room.bigBlind; room.minRaise = room.bigBlind;
  room.winners = []; room.showdown = null; room.lastAction = ""; room.bragActions = 0; room.street = room.gameType === "draw" ? "pre-draw" : room.gameType === "brag" ? "brag-betting" : "pre-flop"; room.actedThisStreet = new Set();
  eligible.forEach(p => {
    p.hole = Array.from({length: room.gameType === "draw" ? 5 : room.gameType === "brag" ? 3 : room.gameType === "omaha" ? 4 : 2},()=>room.deck.pop()); p.drew=false; p.committed = 0; p.roundBet = 0;
    p.folded = false; p.allIn = false; p.acted = false; p.bragSeen = false;
  });
  if (room.gameType === "brag") {
    // Brag uses equal antes, then successive blind/seen stakes. No poker blinds.
    room.bragStake = room.bigBlind;
    room.currentBet = 0;
    for (const p of eligible) {
      p.roundBet = 0;
      postBet(room, p, room.smallBlind);
      // Players unable to afford a full ante must sit out a future hand.
    }
  }
  // Rotate by persistent seat identity, skipping players who are sitting out.
  const oldDealerIndex = room.players.findIndex(p => p.resumeToken === room.dealerToken);
  const startingIndex = oldDealerIndex >= 0 ? oldDealerIndex : -1;
  const dealerIndex = nextEligible(room, startingIndex, p => !p.sittingOut);
  room.dealerIndex = dealerIndex;
  room.dealerToken = room.players[dealerIndex].resumeToken;
  const sb = eligible.length === 2 ? dealerIndex : nextEligible(room, dealerIndex);
  const bb = nextEligible(room, sb);
  if (room.gameType !== "brag") {
    postBet(room, room.players[sb], room.smallBlind);
    postBet(room, room.players[bb], room.bigBlind);
    room.currentBet = Math.max(...eligible.map(p => p.roundBet));
  }
  room.turnIndex = room.gameType === "brag" ? nextEligible(room, room.dealerIndex) : nextEligible(room, bb);
  room.message = `Hand ${room.handNumber} — ${room.street}`;
  emitRoom(room);
}
function advanceTurn(room, from = room.turnIndex) {
  if (activePlayers(room).length <= 1) return finishHand(room, activePlayers(room));
  if (roundComplete(room)) return advanceStreet(room);
  const next = nextEligible(room, from);
  if (next < 0) return advanceStreet(room);
  room.turnIndex = next;
  emitRoom(room);
}
function advanceBrag(room) {
  if (activePlayers(room).length === 1) return finishHand(room, activePlayers(room));
  room.bragActions = (room.bragActions || 0) + 1;
  if (room.bragActions >= 50) return showdown(room);
  room.turnIndex = nextEligible(room, room.turnIndex, p => !p.folded && p.stack >= (p.bragSeen ? 2 : 1) * room.bragStake);
  if (room.turnIndex < 0) return showdown(room);
  emitRoom(room);
}
function act(room, player, action, amount) {
  if (room.status !== "playing") return;
  if (room.players[room.turnIndex]?.id !== player.id) return io.to(player.id).emit("action-error", "It is not your turn.");
  const owed = Math.max(0, room.currentBet - player.roundBet);
  action = String(action || "").toLowerCase();
  if (room.gameType === "brag") {
    if (action === "see-cards") {
      if (player.bragSeen) return io.to(player.id).emit("action-error", "Cards already seen.");
      player.bragSeen = true;
      room.lastAction = `${player.name} looked at their cards`;
      emitRoom(room); return;
    }
    if (action === "fold") {
      player.folded = true;
      room.lastAction = `${player.name} folded`;
      return advanceBrag(room);
    }
    const cost = (player.bragSeen ? 2 : 1) * room.bragStake;
    if (action === "call" || action === "bet") {
      if (player.stack < cost) return io.to(player.id).emit("action-error", `You need ${cost} chips to stay in; fold instead.`);
      postBet(room, player, cost);
      room.lastAction = `${player.name} ${player.bragSeen ? "played seen" : "played blind"} for ${cost}`;
      return advanceBrag(room);
    }
    if (action === "raise") {
      const proposed = Number(amount);
      if (!Number.isSafeInteger(proposed) || proposed <= room.bragStake || proposed > room.bragStake * 2)
        return io.to(player.id).emit("action-error", `Raise the blind stake above ${room.bragStake}, up to ${room.bragStake * 2}.`);
      const newCost = proposed * (player.bragSeen ? 2 : 1);
      if (player.stack < newCost) return io.to(player.id).emit("action-error", "Not enough chips for this stake.");
      room.bragStake = proposed;
      postBet(room, player, newCost);
      room.lastAction = `${player.name} raised the blind stake to ${proposed}`;
      return advanceBrag(room);
    }
    if (action === "see") {
      const remaining = activePlayers(room);
      if (remaining.length !== 2 || !player.bragSeen)
        return io.to(player.id).emit("action-error", "You must have seen your cards and be heads-up to call a see.");
      const opponent = remaining.find(p => p.id !== player.id);
      // A seen player pays double the blind stake to challenge; a blind opponent
      // may be challenged but is not forced to reveal their cards beforehand.
      if (player.stack < cost) return io.to(player.id).emit("action-error", `A see costs ${cost} chips.`);
      postBet(room, player, cost);
      if (compareScores(bragScore(player.hole), bragScore(opponent.hole)) > 0) opponent.folded = true;
      else player.folded = true; // Challenger loses ties.
      room.lastAction = `${player.name} called a see against ${opponent.name}`;
      return finishHand(room, activePlayers(room));
    }
    return io.to(player.id).emit("action-error", "Choose fold, play, raise, look or see.");
  }
  if (action === "fold") {
    player.folded = true; player.acted = true; room.lastAction = `${player.name} folded`;
  } else if (action === "check") {
    if (owed > 0) return io.to(player.id).emit("action-error", "You cannot check while facing a bet.");
    player.acted = true; room.lastAction = `${player.name} checked`;
  } else if (action === "call") {
    if (owed <= 0) { player.acted = true; room.lastAction = `${player.name} checked`; }
    else { const paid = postBet(room, player, owed); player.acted = true; room.lastAction = `${player.name} called ${paid}`; }
  } else if (action === "raise" || action === "all-in") {
    const target = action === "all-in" ? player.roundBet + player.stack : Number(amount);
    const maxTarget = player.roundBet + player.stack;
    if (!Number.isSafeInteger(target) || target <= room.currentBet || target > maxTarget) {
      return io.to(player.id).emit("action-error", "Raise must be above the current bet and no more than your stack.");
    }
    const raiseBy = target - room.currentBet;
    if (raiseBy < room.minRaise && target !== maxTarget) return io.to(player.id).emit("action-error", `Minimum raise is ${room.currentBet + room.minRaise}.`);
    const paid = target - player.roundBet;
    postBet(room, player, paid);
    if (target > room.currentBet) {
      const fullRaise = target - room.currentBet >= room.minRaise;
      if (fullRaise) room.minRaise = target - room.currentBet;
      room.currentBet = target;
      room.players.forEach(p => { if (p.id !== player.id && !p.folded && !p.allIn && (fullRaise || p.roundBet < target)) p.acted = false; });
    }
    player.acted = true;
    room.lastAction = `${player.name} ${action === "all-in" || player.allIn ? "went all-in" : `raised to ${player.roundBet}`}`;
  } else {
    return io.to(player.id).emit("action-error", "Unknown action.");
  }
  if (activePlayers(room).length === 1) return finishHand(room, activePlayers(room));
  advanceTurn(room);
}
io.on("connection", socket => {
  socket.on("create-room", ({ name } = {}, callback) => {
    if (socketHasSeat(rooms, socket.id) || [...rooms.values()].some(r => r.hostId === socket.id))
      return typeof callback === "function" && callback({ok:false,error:"This device already hosts or occupies a table."});
    const room = createRoom(socket.id);
    room.hostId = socket.id;
    socket.join(room.code);
    if (typeof callback === "function") callback({ ok: true, roomCode: room.code, playerId: socket.id, resumeToken: room.hostToken });
    emitRoom(room);
  });
  socket.on("join-room", ({ roomCode, name, avatar } = {}, callback) => {
    const room = rooms.get(String(roomCode || "").toUpperCase().trim());
    if (!room) return typeof callback === "function" && callback({ ok: false, error: "Room not found." });
    const joinError = canJoinRoom(room, socket.id, MAX_ROOM_PLAYERS);
    if (joinError) return typeof callback === "function" && callback({ok:false,error:joinError});
    if (socketHasSeat(rooms, socket.id)) return typeof callback === "function" && callback({ok:false,error:"This device already occupies a seat at another table."});
    const player = newPlayer(socket.id, name, avatar);
    room.players.push(player); socket.join(room.code);
    if (typeof callback === "function") callback({ ok: true, roomCode: room.code, playerId: socket.id, resumeToken: player.resumeToken });
    room.message = `${player.name} joined the table`;
    emitRoom(room);
  });
  socket.on("resume-session", ({roomCode, resumeToken} = {}, callback) => {
    const room=rooms.get(String(roomCode||"").trim().toUpperCase());
    const token=typeof resumeToken === "string" ? resumeToken : "";
    if(!room || !/^[a-f0-9]{48}$/.test(token)) return typeof callback === "function" && callback({ok:false,error:"Session unavailable"});
    if(token === room.hostToken){
      if(socketHasSeat(rooms, socket.id) || [...rooms.values()].some(r => r.hostId === socket.id && r !== room))
        return typeof callback === "function" && callback({ok:false,error:"This device is already assigned to another table."});
      if(room.hostId && io.sockets.sockets.has(room.hostId) && room.hostId !== socket.id)
        return typeof callback === "function" && callback({ok:false,error:"Host is already connected"});
      room.hostId=socket.id;socket.join(room.code);
      if(typeof callback === "function")callback({ok:true,roomCode:room.code,playerId:socket.id,isHost:true});
      emitRoom(room);return;
    }
    const player=room.players.find(p=>p.resumeToken===token);
    if(!player)return typeof callback === "function" && callback({ok:false,error:"Seat not found"});
    if(player.connected && io.sockets.sockets.has(player.id) && player.id!==socket.id)
      return typeof callback === "function" && callback({ok:false,error:"Seat already connected"});
    if(socketHasSeat(rooms, socket.id) && player.id !== socket.id) return typeof callback === "function" && callback({ok:false,error:"This device already occupies another seat."});
    cancelDisconnectTimer(player.resumeToken);
    player.id=socket.id;player.connected=true;socket.join(room.code);
    if(typeof callback === "function")callback({ok:true,roomCode:room.code,playerId:socket.id,isHost:false});
    emitRoom(room);
  });
  socket.on("select-game", ({ roomCode, gameType } = {}, callback) => {
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if(!room || room.hostId !== socket.id || room.status === "playing") return typeof callback === "function" && callback({ok:false,error:"Only the host may change games between hands."});
    if(!["holdem","omaha","draw","blackjack","brag"].includes(gameType)) return typeof callback === "function" && callback({ok:false,error:"Game unavailable."});
    room.gameType=gameType;room.status="lobby";room.street="lobby";room.community=[];room.winners=[];room.showdown=null;
    room.dealerCards=[];room.message=gameType==="blackjack"?"Blackjack selected — fixed 20-chip stakes, dealer stands on 17":gameType==="omaha"?"Omaha selected — exactly two hole cards must play":gameType==="brag"?"Three-Card Brag — prial, running flush, run, flush, pair, high card":gameType==="draw"?"Five-Card Draw selected — exchange up to three cards":"Texas Hold’em selected";
    emitRoom(room);
    if(typeof callback === "function") callback({ok:true});
  });
  socket.on("draw-cards", ({roomCode, indices} = {}, callback) => {
    const room=rooms.get(String(roomCode||"").toUpperCase());
    const p=room?.players.find(x=>x.id===socket.id);
    const fail=msg=>{if(typeof callback==="function")callback({ok:false,error:msg});else socket.emit("action-error",msg);};
    if(!room || !p || room.status!=="playing" || room.gameType!=="draw" || room.street!=="draw" || p.folded || p.allIn || p.drew) return fail("You cannot draw cards now.");
    if(!validateDrawIndices(indices, p.hole.length)) return fail("Select up to three distinct cards.");
    if(room.deck.length < indices.length) return fail("Not enough cards remain in the deck.");
    for(const i of indices)p.hole[i]=room.deck.pop();
    p.drew=true;room.message=`${p.name} ${indices.length ? `drew ${indices.length} card${indices.length===1?"":"s"}` : "stood pat"}`;
    if(typeof callback==="function")callback({ok:true});
    if(room.players.every(x=>x.drew || x.folded || x.allIn || !x.connected))finishDrawRound(room);else emitRoom(room);
  });
  socket.on("start-game", ({ roomCode } = {}) => {
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if (!room || room.hostId !== socket.id) return;
    if (room.status === "playing") return;
    startHand(room);
  });
  socket.on("player-action", ({ roomCode, action, amount } = {}) => {
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if (!room) return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;
    if(room.gameType === "blackjack")blackjackAct(room,player,action);else act(room, player, action, amount);
  });
  socket.on("deal-round", ({ roomCode, round } = {}) => {
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if (!room || room.hostId !== socket.id || room.status !== "complete") return;
    // Host starts the next hand. Round names are accepted for client compatibility; server controls order.
    if (["pre-flop", "flop", "turn", "river", "showdown"].includes(String(round || "pre-flop"))) startHand(room);
  });
  socket.on("disconnect", () => {
    for (const room of rooms.values()) {
      if (room.hostId === socket.id) { room.hostId = null; room.message = "Host disconnected; reconnect with the original host device"; emitRoom(room); continue; }
      const p = room.players.find(x => x.id === socket.id);
      if (!p) continue;
      p.connected = false;
      const drawKey = `${room.code}:${p.resumeToken}`;
      if (drawTimers.has(drawKey)) { clearTimeout(drawTimers.get(drawKey)); drawTimers.delete(drawKey); }
      // Suspend the action clock while the 60-second reconnection grace runs.
      if (room.players[room.turnIndex] === p) clearTurnClock(room);
      // Allow mobile phones to reconnect without forfeiting their cards.
      // Keep the seat, cards and token intact throughout the grace period.
      if (room.status === "playing" && !p.sittingOut) {
        scheduleDisconnect(room, p);
        room.message = `${p.name} disconnected — 60 seconds to reconnect`;
      }
      emitRoom(room);
      break;
    }
  });
});

loadRooms();
server.listen(PORT, "0.0.0.0", () => console.log(`Gilded Deck server listening on ${PORT}`));
