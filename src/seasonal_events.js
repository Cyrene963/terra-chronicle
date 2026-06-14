/* =========================================================
   Terra Chronicle — Seasonal Events System v1
   Four major seasonal events at season end (3-day duration)
   ---------------------------------------------------------
   Event Schedule:
   - Spring (Day 5-7): Auction - bid on rare seeds/beasts
   - Summer (Day 12-14): Arena - PvP ladder with card decks
   - Autumn (Day 19-21): Harvest - leaderboard competition
   - Winter (Day 26-28): Void Tide - wave defense boss fight
   ========================================================= */
'use strict';

/* ================= 1. Event Configuration ================= */
const EVENT_CONFIG = {
  spring_auction: {
    name: '春季拍卖会',
    nameEn: 'Spring Auction',
    startDay: 5,
    endDay: 7,
    season: 0,
    description: '稀有种子与灵兽竞拍',
  },
  summer_arena: {
    name: '夏季竞技场',
    nameEn: 'Summer Arena',
    startDay: 12,
    endDay: 14,
    season: 1,
    description: 'PvP天梯对决',
  },
  autumn_harvest: {
    name: '秋季大丰收',
    nameEn: 'Autumn Harvest',
    startDay: 19,
    endDay: 21,
    season: 2,
    description: '作物产量竞赛',
  },
  winter_void: {
    name: '冬季虚空潮汐',
    nameEn: 'Winter Void Tide',
    startDay: 26,
    endDay: 28,
    season: 3,
    description: '世界BOSS保卫战',
  },
};

/* ================= 2. Event State Management ================= */
const SeasonalEvents = {
  currentEvent: null,
  eventHistory: [],

  // Spring Auction state
  auctionItems: [],
  currentBid: null,
  playerBids: {},

  // Summer Arena state
  arenaLadder: [],
  playerDeck: null,
  arenaMatches: [],

  // Autumn Harvest state
  harvestLeaderboard: [],
  playerYield: 0,

  // Winter Void Tide state
  voidWave: 0,
  voidBossHp: 0,
  voidBossMaxHp: 10000,
  playerContributions: {},
};

/* ================= 3. Event Detection & Scheduling ================= */
function checkEventTrigger(currentDay) {
  const dayInCycle = (currentDay % 28) + 1;

  for (const [eventId, config] of Object.entries(EVENT_CONFIG)) {
    if (dayInCycle >= config.startDay && dayInCycle <= config.endDay) {
      if (!SeasonalEvents.currentEvent || SeasonalEvents.currentEvent.id !== eventId) {
        startEvent(eventId, config);
      }
      return eventId;
    }
  }

  // No active event
  if (SeasonalEvents.currentEvent) {
    endEvent(SeasonalEvents.currentEvent.id);
  }
  return null;
}

function startEvent(eventId, config) {
  SeasonalEvents.currentEvent = { id: eventId, ...config, startedAt: Date.now() };
  console.log(`[Event] Starting: ${config.name}`);

  // Initialize event-specific state
  switch (eventId) {
    case 'spring_auction':
      initSpringAuction();
      break;
    case 'summer_arena':
      initSummerArena();
      break;
    case 'autumn_harvest':
      initAutumnHarvest();
      break;
    case 'winter_void':
      initWinterVoid();
      break;
  }

  showEventNotification(config);
}

function endEvent(eventId) {
  console.log(`[Event] Ending: ${eventId}`);
  SeasonalEvents.eventHistory.push({
    id: eventId,
    endedAt: Date.now(),
    results: captureEventResults(eventId),
  });
  SeasonalEvents.currentEvent = null;
  hideEventUI();
}

/* ================= 4. Spring Auction Event ================= */
function initSpringAuction() {
  SeasonalEvents.auctionItems = [
    { id: 'seed_rare_1', name: '星辉麦种', type: 'seed', rarity: 'rare', minBid: 100, currentBid: 100, bidder: null },
    { id: 'seed_rare_2', name: '月影浆果', type: 'seed', rarity: 'rare', minBid: 150, currentBid: 150, bidder: null },
    { id: 'beast_epic', name: '雷霆灵兽卵', type: 'beast', rarity: 'epic', minBid: 500, currentBid: 500, bidder: null },
    { id: 'seed_legendary', name: '虚空玫瑰种', type: 'seed', rarity: 'legendary', minBid: 1000, currentBid: 1000, bidder: null },
    { id: 'beast_rare', name: '风羽灵兽卵', type: 'beast', rarity: 'rare', minBid: 300, currentBid: 300, bidder: null },
  ];
  SeasonalEvents.playerBids = {};
}

function placeBid(itemId, amount, playerId = 'local') {
  const item = SeasonalEvents.auctionItems.find(i => i.id === itemId);
  if (!item) return { ok: false, reason: 'item_not_found' };
  if (amount <= item.currentBid) return { ok: false, reason: 'bid_too_low' };

  // Check player coins
  const farm = window.Terra?.farm;
  if (!farm || (farm.inventory.materials.coin || 0) < amount) {
    return { ok: false, reason: 'insufficient_coins' };
  }

  // Refund previous bidder
  if (item.bidder && SeasonalEvents.playerBids[item.bidder]) {
    const prevBidder = SeasonalEvents.playerBids[item.bidder];
    prevBidder.coins += item.currentBid;
  }

  // Place new bid
  item.currentBid = amount;
  item.bidder = playerId;
  SeasonalEvents.playerBids[playerId] = { coins: (farm.inventory.materials.coin || 0) - amount };

  return { ok: true, item };
}

/* ================= 5. Summer Arena Event ================= */
function initSummerArena() {
  SeasonalEvents.arenaLadder = [
    { rank: 1, playerId: 'npc_1', name: 'AI挑战者·金', rating: 1800, wins: 25, losses: 5 },
    { rank: 2, playerId: 'npc_2', name: 'AI挑战者·银', rating: 1650, wins: 20, losses: 8 },
    { rank: 3, playerId: 'npc_3', name: 'AI挑战者·铜', rating: 1500, wins: 15, losses: 10 },
  ];
  SeasonalEvents.arenaMatches = [];
  SeasonalEvents.playerDeck = null;
}

function joinArena(deck, playerId = 'local') {
  if (!deck || deck.length < 8) return { ok: false, reason: 'invalid_deck' };

  const playerEntry = {
    rank: SeasonalEvents.arenaLadder.length + 1,
    playerId,
    name: '玩家',
    rating: 1200,
    wins: 0,
    losses: 0,
    deck,
  };

  SeasonalEvents.arenaLadder.push(playerEntry);
  SeasonalEvents.playerDeck = deck;
  return { ok: true, entry: playerEntry };
}

function challengeArenaOpponent(opponentId, playerId = 'local') {
  const player = SeasonalEvents.arenaLadder.find(p => p.playerId === playerId);
  const opponent = SeasonalEvents.arenaLadder.find(p => p.playerId === opponentId);

  if (!player || !opponent) return { ok: false, reason: 'player_not_found' };

  // Initiate battle (battle.js will handle actual combat)
  const match = {
    id: `match_${Date.now()}`,
    player1: playerId,
    player2: opponentId,
    startedAt: Date.now(),
    result: null,
  };

  SeasonalEvents.arenaMatches.push(match);
  return { ok: true, match };
}

function recordArenaResult(matchId, winnerId, loserRating, winnerRating) {
  const match = SeasonalEvents.arenaMatches.find(m => m.id === matchId);
  if (!match) return;

  match.result = { winner: winnerId, completedAt: Date.now() };

  // Update ladder
  const winner = SeasonalEvents.arenaLadder.find(p => p.playerId === winnerId);
  const loser = SeasonalEvents.arenaLadder.find(p => p.playerId === match.player1 === winnerId ? match.player2 : match.player1);

  if (winner) {
    winner.wins++;
    winner.rating += 25;
  }
  if (loser) {
    loser.losses++;
    loser.rating = Math.max(1000, loser.rating - 20);
  }

  // Re-sort ladder
  SeasonalEvents.arenaLadder.sort((a, b) => b.rating - a.rating);
  SeasonalEvents.arenaLadder.forEach((p, i) => p.rank = i + 1);
}

/* ================= 6. Autumn Harvest Event ================= */
function initAutumnHarvest() {
  SeasonalEvents.harvestLeaderboard = [
    { rank: 1, playerId: 'npc_1', name: 'AI农夫·甲', totalYield: 1500 },
    { rank: 2, playerId: 'npc_2', name: 'AI农夫·乙', totalYield: 1200 },
    { rank: 3, playerId: 'npc_3', name: 'AI农夫·丙', totalYield: 1000 },
  ];
  SeasonalEvents.playerYield = 0;
}

function reportHarvest(cropType, quantity, quality, playerId = 'local') {
  const points = quantity * (quality || 1.0);
  SeasonalEvents.playerYield += points;

  // Update leaderboard
  let playerEntry = SeasonalEvents.harvestLeaderboard.find(p => p.playerId === playerId);
  if (!playerEntry) {
    playerEntry = { rank: 0, playerId, name: '玩家', totalYield: 0 };
    SeasonalEvents.harvestLeaderboard.push(playerEntry);
  }

  playerEntry.totalYield = SeasonalEvents.playerYield;

  // Re-sort
  SeasonalEvents.harvestLeaderboard.sort((a, b) => b.totalYield - a.totalYield);
  SeasonalEvents.harvestLeaderboard.forEach((p, i) => p.rank = i + 1);

  return { ok: true, totalYield: SeasonalEvents.playerYield };
}

/* ================= 7. Winter Void Tide Event ================= */
function initWinterVoid() {
  SeasonalEvents.voidWave = 1;
  SeasonalEvents.voidBossHp = 10000;
  SeasonalEvents.voidBossMaxHp = 10000;
  SeasonalEvents.playerContributions = {};
}

function damageVoidBoss(damage, playerId = 'local') {
  if (SeasonalEvents.voidBossHp <= 0) return { ok: false, reason: 'boss_defeated' };

  SeasonalEvents.voidBossHp = Math.max(0, SeasonalEvents.voidBossHp - damage);

  // Track contribution
  if (!SeasonalEvents.playerContributions[playerId]) {
    SeasonalEvents.playerContributions[playerId] = { damage: 0, waves: 0 };
  }
  SeasonalEvents.playerContributions[playerId].damage += damage;

  // Check if boss defeated
  if (SeasonalEvents.voidBossHp <= 0) {
    SeasonalEvents.voidWave++;
    if (SeasonalEvents.voidWave <= 5) {
      // Spawn next wave
      SeasonalEvents.voidBossMaxHp = Math.floor(SeasonalEvents.voidBossMaxHp * 1.5);
      SeasonalEvents.voidBossHp = SeasonalEvents.voidBossMaxHp;
      Object.keys(SeasonalEvents.playerContributions).forEach(pid => {
        SeasonalEvents.playerContributions[pid].waves++;
      });
      return { ok: true, waveCleared: true, nextWave: SeasonalEvents.voidWave };
    } else {
      return { ok: true, eventComplete: true };
    }
  }

  return { ok: true, bossHp: SeasonalEvents.voidBossHp, bossMaxHp: SeasonalEvents.voidBossMaxHp };
}

function getVoidContributions() {
  return Object.entries(SeasonalEvents.playerContributions)
    .map(([playerId, stats]) => ({ playerId, ...stats }))
    .sort((a, b) => b.damage - a.damage);
}

/* ================= 8. Event Results & Rewards ================= */
function captureEventResults(eventId) {
  switch (eventId) {
    case 'spring_auction':
      return {
        finalBids: SeasonalEvents.auctionItems.map(item => ({
          itemId: item.id,
          winner: item.bidder,
          finalPrice: item.currentBid,
        })),
      };

    case 'summer_arena':
      return {
        topPlayers: SeasonalEvents.arenaLadder.slice(0, 10),
        totalMatches: SeasonalEvents.arenaMatches.length,
      };

    case 'autumn_harvest':
      return {
        topFarmers: SeasonalEvents.harvestLeaderboard.slice(0, 10),
      };

    case 'winter_void':
      return {
        wavesCleared: SeasonalEvents.voidWave - 1,
        topContributors: getVoidContributions().slice(0, 10),
        bossDefeated: SeasonalEvents.voidBossHp <= 0,
      };

    default:
      return {};
  }
}

function distributeRewards(eventId, playerId = 'local') {
  const farm = window.Terra?.farm;
  if (!farm) return { ok: false, reason: 'no_farm' };

  const rewards = [];

  switch (eventId) {
    case 'spring_auction': {
      const wonItems = SeasonalEvents.auctionItems.filter(item => item.bidder === playerId);
      wonItems.forEach(item => {
        rewards.push({ type: item.type, id: item.id, name: item.name });
      });
      break;
    }

    case 'summer_arena': {
      const player = SeasonalEvents.arenaLadder.find(p => p.playerId === playerId);
      if (player && player.rank <= 10) {
        const coinReward = [500, 400, 300, 250, 200, 150, 120, 100, 80, 60][player.rank - 1] || 50;
        farm.inventory.materials.coin = (farm.inventory.materials.coin || 0) + coinReward;
        rewards.push({ type: 'coin', amount: coinReward });
      }
      break;
    }

    case 'autumn_harvest': {
      const player = SeasonalEvents.harvestLeaderboard.find(p => p.playerId === playerId);
      if (player && player.rank <= 10) {
        const materialReward = [50, 40, 30, 25, 20, 15, 12, 10, 8, 6][player.rank - 1] || 5;
        farm.inventory.materials.rare_fertilizer = (farm.inventory.materials.rare_fertilizer || 0) + materialReward;
        rewards.push({ type: 'rare_fertilizer', amount: materialReward });
      }
      break;
    }

    case 'winter_void': {
      const contribution = SeasonalEvents.playerContributions[playerId];
      if (contribution) {
        const coinReward = Math.floor(contribution.damage / 10) + contribution.waves * 100;
        farm.inventory.materials.coin = (farm.inventory.materials.coin || 0) + coinReward;
        rewards.push({ type: 'coin', amount: coinReward });

        if (contribution.waves >= 3) {
          rewards.push({ type: 'title', name: '虚空守护者' });
        }
      }
      break;
    }
  }

  return { ok: true, rewards };
}

/* ================= 9. UI Management ================= */
function showEventNotification(config) {
  const notification = document.createElement('div');
  notification.id = 'event-notification';
  notification.style.cssText = `
    position: fixed; top: 20%; left: 50%; transform: translateX(-50%);
    background: linear-gradient(135deg, #f4ecd8 0%, #e8dcbf 100%);
    border: 3px double #8b7355; box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    padding: 32px 48px; border-radius: 8px; z-index: 10000;
    font-family: 'Cormorant Garamond', serif; text-align: center;
    animation: eventSlideIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
  `;

  notification.innerHTML = `
    <div style="font-size: 36px; color: #d4af37; font-weight: bold; margin-bottom: 12px;">
      ${config.name}
    </div>
    <div style="font-size: 18px; color: #2a2520; font-style: italic; margin-bottom: 16px;">
      ${config.nameEn}
    </div>
    <div style="font-size: 16px; color: #5a4a3a; margin-bottom: 24px;">
      ${config.description}
    </div>
    <button id="event-open-btn" style="
      background: #d4af37; color: #2a2520; border: none;
      padding: 12px 32px; font-size: 18px; font-family: 'Cormorant Garamond', serif;
      cursor: pointer; border-radius: 4px; font-weight: bold;
    ">进入活动</button>
  `;

  document.body.appendChild(notification);

  const style = document.createElement('style');
  style.textContent = `
    @keyframes eventSlideIn {
      from { transform: translateX(-50%) translateY(-100px); opacity: 0; }
      to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  document.getElementById('event-open-btn').addEventListener('click', () => {
    notification.remove();
    openEventUI(SeasonalEvents.currentEvent.id);
  });

  setTimeout(() => {
    if (notification.parentNode) notification.remove();
  }, 8000);
}

function openEventUI(eventId) {
  switch (eventId) {
    case 'spring_auction':
      openAuctionUI();
      break;
    case 'summer_arena':
      openArenaUI();
      break;
    case 'autumn_harvest':
      openHarvestUI();
      break;
    case 'winter_void':
      openVoidUI();
      break;
  }
}

function hideEventUI() {
  const panels = ['auction-panel', 'arena-panel', 'harvest-panel', 'void-panel'];
  panels.forEach(id => {
    const panel = document.getElementById(id);
    if (panel) panel.remove();
  });
}

/* ================= 10. Spring Auction UI ================= */
function openAuctionUI() {
  const panel = document.createElement('div');
  panel.id = 'auction-panel';
  panel.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 700px; max-height: 80vh; overflow-y: auto;
    background: linear-gradient(135deg, #f4ecd8 0%, #e8dcbf 100%);
    border: 3px double #8b7355; box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    padding: 32px; border-radius: 8px; z-index: 10000;
    font-family: 'Cormorant Garamond', serif;
  `;

  let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <h2 style="margin: 0; color: #d4af37; font-size: 32px;">春季拍卖会</h2>
      <button id="close-auction" style="background: transparent; border: none; font-size: 24px; cursor: pointer; color: #8b7355;">✕</button>
    </div>
    <div id="auction-items">
  `;

  SeasonalEvents.auctionItems.forEach(item => {
    const rarityColors = { rare: '#4a9eff', epic: '#a335ee', legendary: '#ff8000' };
    html += `
      <div style="background: rgba(255,255,255,0.5); padding: 16px; margin-bottom: 12px; border-radius: 4px; border-left: 4px solid ${rarityColors[item.rarity]};">
        <div style="font-size: 20px; font-weight: bold; color: #2a2520; margin-bottom: 8px;">${item.name}</div>
        <div style="font-size: 14px; color: #5a4a3a; margin-bottom: 8px;">类型: ${item.type === 'seed' ? '种子' : '灵兽卵'} | 稀有度: ${item.rarity}</div>
        <div style="font-size: 16px; color: #d4af37; margin-bottom: 12px;">当前出价: ${item.currentBid} 金币</div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input type="number" id="bid-${item.id}" min="${item.currentBid + 1}" value="${item.currentBid + 10}"
            style="padding: 8px; border: 1px solid #8b7355; border-radius: 4px; width: 120px;">
          <button class="bid-btn" data-item-id="${item.id}" style="
            background: #d4af37; color: #2a2520; border: none; padding: 8px 20px;
            font-size: 16px; cursor: pointer; border-radius: 4px; font-family: 'Cormorant Garamond', serif;">
            出价
          </button>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  panel.innerHTML = html;
  document.body.appendChild(panel);

  // Event listeners
  document.getElementById('close-auction').addEventListener('click', () => panel.remove());
  document.querySelectorAll('.bid-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const itemId = e.target.dataset.itemId;
      const amount = parseInt(document.getElementById(`bid-${itemId}`).value);
      const result = placeBid(itemId, amount);
      if (result.ok) {
        panel.remove();
        openAuctionUI(); // Refresh
      } else {
        alert(`出价失败: ${result.reason}`);
      }
    });
  });
}

/* ================= 11. Summer Arena UI ================= */
function openArenaUI() {
  const panel = document.createElement('div');
  panel.id = 'arena-panel';
  panel.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 700px; max-height: 80vh; overflow-y: auto;
    background: linear-gradient(135deg, #f4ecd8 0%, #e8dcbf 100%);
    border: 3px double #8b7355; box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    padding: 32px; border-radius: 8px; z-index: 10000;
    font-family: 'Cormorant Garamond', serif;
  `;

  let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <h2 style="margin: 0; color: #d4af37; font-size: 32px;">夏季竞技场</h2>
      <button id="close-arena" style="background: transparent; border: none; font-size: 24px; cursor: pointer; color: #8b7355;">✕</button>
    </div>
    <div style="margin-bottom: 24px;">
      <h3 style="color: #2a2520; font-size: 24px; margin-bottom: 12px;">天梯排行</h3>
  `;

  SeasonalEvents.arenaLadder.forEach(player => {
    const isPlayer = player.playerId === 'local';
    html += `
      <div style="background: ${isPlayer ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.5)'};
        padding: 12px; margin-bottom: 8px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-size: 20px; font-weight: bold; color: #d4af37; margin-right: 12px;">#{player.rank}</span>
          <span style="font-size: 18px; color: #2a2520;">${player.name}</span>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 16px; color: #5a4a3a;">评分: ${player.rating}</div>
          <div style="font-size: 14px; color: #7a6a5a;">${player.wins}胜 ${player.losses}负</div>
        </div>
        ${!isPlayer ? `<button class="challenge-btn" data-opponent-id="${player.playerId}" style="
          background: #d4af37; color: #2a2520; border: none; padding: 8px 16px;
          font-size: 14px; cursor: pointer; border-radius: 4px; margin-left: 12px;">挑战</button>` : ''}
      </div>
    `;
  });

  html += `</div>`;
  panel.innerHTML = html;
  document.body.appendChild(panel);

  document.getElementById('close-arena').addEventListener('click', () => panel.remove());
  document.querySelectorAll('.challenge-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const opponentId = e.target.dataset.opponentId;
      const result = challengeArenaOpponent(opponentId);
      if (result.ok) {
        alert('战斗开始！');
        panel.remove();
        // Trigger battle.js combat
        if (window.enterBattle) {
          window.enterBattle('arena', opponentId);
        }
      }
    });
  });
}

/* ================= 12. Autumn Harvest UI ================= */
function openHarvestUI() {
  const panel = document.createElement('div');
  panel.id = 'harvest-panel';
  panel.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 700px; max-height: 80vh; overflow-y: auto;
    background: linear-gradient(135deg, #f4ecd8 0%, #e8dcbf 100%);
    border: 3px double #8b7355; box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    padding: 32px; border-radius: 8px; z-index: 10000;
    font-family: 'Cormorant Garamond', serif;
  `;

  let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <h2 style="margin: 0; color: #d4af37; font-size: 32px;">秋季大丰收</h2>
      <button id="close-harvest" style="background: transparent; border: none; font-size: 24px; cursor: pointer; color: #8b7355;">✕</button>
    </div>
    <div style="background: rgba(212,175,55,0.2); padding: 16px; border-radius: 4px; margin-bottom: 24px; text-align: center;">
      <div style="font-size: 18px; color: #5a4a3a; margin-bottom: 8px;">你的总产量</div>
      <div style="font-size: 36px; font-weight: bold; color: #d4af37;">${SeasonalEvents.playerYield.toFixed(0)}</div>
    </div>
    <div>
      <h3 style="color: #2a2520; font-size: 24px; margin-bottom: 12px;">产量排行榜</h3>
  `;

  SeasonalEvents.harvestLeaderboard.forEach(player => {
    const isPlayer = player.playerId === 'local';
    const medal = player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : player.rank === 3 ? '🥉' : '';
    html += `
      <div style="background: ${isPlayer ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.5)'};
        padding: 12px; margin-bottom: 8px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-size: 20px; margin-right: 8px;">${medal}</span>
          <span style="font-size: 20px; font-weight: bold; color: #d4af37; margin-right: 12px;">#{player.rank}</span>
          <span style="font-size: 18px; color: #2a2520;">${player.name}</span>
        </div>
        <div style="font-size: 18px; color: #5a4a3a;">产量: ${player.totalYield}</div>
      </div>
    `;
  });

  html += `</div>`;
  panel.innerHTML = html;
  document.body.appendChild(panel);

  document.getElementById('close-harvest').addEventListener('click', () => panel.remove());
}

/* ================= 13. Winter Void Tide UI ================= */
function openVoidUI() {
  const panel = document.createElement('div');
  panel.id = 'void-panel';
  panel.style.cssText = `
    position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 700px; max-height: 80vh; overflow-y: auto;
    background: linear-gradient(135deg, #2a2030 0%, #3a3040 100%);
    border: 3px double #a08090; box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    padding: 32px; border-radius: 8px; z-index: 10000;
    font-family: 'Cormorant Garamond', serif; color: #e8dcbf;
  `;

  const hpPercent = (SeasonalEvents.voidBossHp / SeasonalEvents.voidBossMaxHp) * 100;

  let html = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <h2 style="margin: 0; color: #d4af37; font-size: 32px;">冬季虚空潮汐</h2>
      <button id="close-void" style="background: transparent; border: none; font-size: 24px; cursor: pointer; color: #a08090;">✕</button>
    </div>

    <div style="background: rgba(212,175,55,0.1); padding: 20px; border-radius: 4px; margin-bottom: 24px;">
      <div style="text-align: center; margin-bottom: 16px;">
        <div style="font-size: 18px; color: #a08090; margin-bottom: 8px;">第 ${SeasonalEvents.voidWave} 波</div>
        <div style="font-size: 28px; font-weight: bold; color: #d4af37;">虚空领主</div>
      </div>

      <div style="margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; font-size: 14px; color: #a08090; margin-bottom: 4px;">
          <span>生命值</span>
          <span>${SeasonalEvents.voidBossHp} / ${SeasonalEvents.voidBossMaxHp}</span>
        </div>
        <div style="background: rgba(0,0,0,0.3); height: 24px; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(90deg, #8b0000, #ff4500); height: 100%; width: ${hpPercent}%;
            transition: width 0.5s ease;"></div>
        </div>
      </div>

      <button id="attack-void-boss" style="
        width: 100%; background: #d4af37; color: #2a2520; border: none;
        padding: 12px; font-size: 18px; cursor: pointer; border-radius: 4px;
        font-family: 'Cormorant Garamond', serif; font-weight: bold; margin-top: 12px;">
        进攻BOSS
      </button>
    </div>

    <div>
      <h3 style="color: #d4af37; font-size: 24px; margin-bottom: 12px;">贡献排行</h3>
  `;

  const contributions = getVoidContributions();
  contributions.forEach((contrib, idx) => {
    html += `
      <div style="background: rgba(212,175,55,0.1); padding: 12px; margin-bottom: 8px; border-radius: 4px;
        display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-size: 20px; font-weight: bold; color: #d4af37; margin-right: 12px;">#{${idx + 1}}</span>
          <span style="font-size: 18px; color: #e8dcbf;">${contrib.playerId === 'local' ? '玩家' : 'AI勇士·' + (idx + 1)}</span>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 16px; color: #a08090;">伤害: ${contrib.damage}</div>
          <div style="font-size: 14px; color: #8a7a8a;">波次: ${contrib.waves}</div>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  panel.innerHTML = html;
  document.body.appendChild(panel);

  document.getElementById('close-void').addEventListener('click', () => panel.remove());
  document.getElementById('attack-void-boss').addEventListener('click', () => {
    panel.remove();
    // Trigger battle against void boss
    if (window.enterBattle) {
      window.enterBattle('void_boss', SeasonalEvents.voidWave);
    }
  });
}

/* ================= 14. Global Exports ================= */
window.SeasonalEvents = SeasonalEvents;
window.checkEventTrigger = checkEventTrigger;
window.openEventUI = openEventUI;
window.placeBid = placeBid;
window.joinArena = joinArena;
window.challengeArenaOpponent = challengeArenaOpponent;
window.recordArenaResult = recordArenaResult;
window.reportHarvest = reportHarvest;
window.damageVoidBoss = damageVoidBoss;
window.distributeRewards = distributeRewards;

/* ================= 15. Main Game Integration ================= */
function initEventSystem() {
  const eventIndicator = document.getElementById('eventIndicator');
  if (eventIndicator) {
    eventIndicator.addEventListener('click', () => {
      if (SeasonalEvents.currentEvent) {
        openEventUI(SeasonalEvents.currentEvent.id);
      }
    });
  }
}

// Update event indicator UI
function updateEventIndicator(eventId, config) {
  const indicator = document.getElementById('eventIndicator');
  const text = document.getElementById('eventIndicatorText');

  if (eventId && config) {
    indicator.style.display = 'block';
    text.textContent = config.name;
  } else {
    indicator.style.display = 'none';
  }
}

// Hook into main game update loop
window.updateSeasonalEvents = function(currentDay) {
  const eventId = checkEventTrigger(currentDay);
  const config = eventId ? EVENT_CONFIG[eventId] : null;
  updateEventIndicator(eventId, config);
};

// Auto-report harvest when crops are collected
const originalReportHarvest = reportHarvest;
window.onCropHarvested = function(cropType, quantity, quality) {
  if (SeasonalEvents.currentEvent?.id === 'autumn_harvest') {
    originalReportHarvest(cropType, quantity, quality);
  }
};

// Auto-record damage in void tide battles
window.onVoidBossDamage = function(damage) {
  if (SeasonalEvents.currentEvent?.id === 'winter_void') {
    return damageVoidBoss(damage);
  }
  return { ok: false };
};

// Initialize when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEventSystem);
} else {
  initEventSystem();
}

console.log('[SeasonalEvents] Module loaded successfully');


