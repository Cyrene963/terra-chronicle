/* =========================================================
   Terra Chronicle — Neighbor Influence System
   六边形邻居互动 · 气候传播 · 资源互助 · 声望系统
   ---------------------------------------------------------
   Features:
   1. Detect 6 nearest neighbors on hex map
   2. Negative spillover: deforestation drought (+10%/neighbor)
   3. Pest outbreak spread (20% chance/day from infected neighbor)
   4. Positive spillover: neighbor rain increases moisture (+5%)
   5. Mutual aid: send/receive resources with neighbors
   6. Reputation system: helping neighbors earns reputation points
   ========================================================= */

'use strict';

/* ================= 1. HEX NEIGHBOR DETECTION ================= */
/**
 * 六边形网格的六个邻居方向 (轴向坐标系)
 * 平顶布局 (flat-top hexagons)
 */
const HEX_DIRECTIONS = [
  { q: 1, r: 0 },   // East
  { q: 1, r: -1 },  // Northeast
  { q: 0, r: -1 },  // Northwest
  { q: -1, r: 0 },  // West
  { q: -1, r: 1 },  // Southwest
  { q: 0, r: 1 },   // Southeast
];

const NeighborSystem = {
  // Reputation tracking: { playerId: { neighborId: reputationPoints } }
  reputation: new Map(),

  // Resource transfer history: for cooldown/limits
  transferHistory: new Map(), // key: "senderId|receiverId|timestamp"

  // Pest outbreak tracking: { playerId: { hasPest: bool, infectedDay: number } }
  pestStatus: new Map(),

  // Environmental status cache
  environmentCache: new Map(), // key: playerId → { deforestation, hasRain, lastUpdate }

  /* ================= NEIGHBOR DETECTION ================= */

  /**
   * Get all 6 immediate neighbors of a hex position
   * @param {number} q - Axial coordinate q
   * @param {number} r - Axial coordinate r
   * @param {Map} players - WorldMap.players (playerId → {q, r, ...})
   * @returns {Array} - Array of neighbor player data
   */
  getNeighbors(q, r, players) {
    const neighbors = [];

    for (const dir of HEX_DIRECTIONS) {
      const nq = q + dir.q;
      const nr = r + dir.r;

      // Find player at this position
      const neighbor = Array.from(players.values()).find(
        p => p.q === nq && p.r === nr
      );

      if (neighbor) {
        neighbors.push(neighbor);
      }
    }

    return neighbors;
  },

  /**
   * Get all neighbors for a player by playerId
   */
  getPlayerNeighbors(playerId, worldMap) {
    const player = worldMap.players.get(playerId);
    if (!player) return [];

    return this.getNeighbors(player.q, player.r, worldMap.players);
  },

  /* ================= NEGATIVE SPILLOVER EFFECTS ================= */

  /**
   * Calculate drought risk increase from neighboring deforestation
   * Each deforested neighbor increases drought risk by 10%
   * @param {string} playerId
   * @param {object} worldMap - WorldMap instance
   * @param {object} privateFarm - Player's private farm data
   * @returns {number} - Drought risk multiplier (1.0 = baseline, 1.6 = +60%)
   */
  calculateDeforestationDrought(playerId, worldMap, privateFarm) {
    const neighbors = this.getPlayerNeighbors(playerId, worldMap);
    let deforestedCount = 0;

    for (const neighbor of neighbors) {
      const env = this.getEnvironmentStatus(neighbor.playerId);
      if (env && env.deforestation > 0.5) {
        // Deforestation threshold: >50% trees cut
        deforestedCount++;
      }
    }

    const droughtIncrease = deforestedCount * 0.10;
    return 1.0 + droughtIncrease;
  },

  /**
   * Pest outbreak spreading from infected neighbors
   * 20% chance per day if neighbor has active pest outbreak
   * @param {string} playerId
   * @param {object} worldMap
   * @param {number} currentDay
   * @returns {boolean} - True if player catches pest from neighbors
   */
  checkPestSpread(playerId, worldMap, currentDay) {
    const neighbors = this.getPlayerNeighbors(playerId, worldMap);
    const playerPest = this.pestStatus.get(playerId) || { hasPest: false };

    // Already infected, no need to check spread
    if (playerPest.hasPest) return false;

    for (const neighbor of neighbors) {
      const neighborPest = this.pestStatus.get(neighbor.playerId);

      if (neighborPest && neighborPest.hasPest) {
        // 20% chance per infected neighbor per day
        if (Math.random() < 0.20) {
          this.pestStatus.set(playerId, {
            hasPest: true,
            infectedDay: currentDay,
            sourceNeighbor: neighbor.playerId
          });

          console.log(`[NeighborSystem] Pest spread from ${neighbor.name} to player ${playerId}`);
          return true;
        }
      }
    }

    return false;
  },

  /**
   * Report pest outbreak for a player
   */
  reportPestOutbreak(playerId, currentDay) {
    this.pestStatus.set(playerId, {
      hasPest: true,
      infectedDay: currentDay,
      sourceNeighbor: null // Self-originated
    });
  },

  /**
   * Clear pest outbreak (after treatment)
   */
  clearPestOutbreak(playerId) {
    const pest = this.pestStatus.get(playerId);
    if (pest) {
      pest.hasPest = false;
      pest.clearedDay = Date.now();
    }
  },

  /* ================= POSITIVE SPILLOVER EFFECTS ================= */

  /**
   * Calculate moisture bonus from neighboring rainfall
   * Each neighbor with active rain increases your moisture by 5%
   * @param {string} playerId
   * @param {object} worldMap
   * @returns {number} - Moisture multiplier (1.0 = baseline, 1.3 = +30%)
   */
  calculateRainBenefit(playerId, worldMap) {
    const neighbors = this.getPlayerNeighbors(playerId, worldMap);
    let rainyNeighbors = 0;

    for (const neighbor of neighbors) {
      const env = this.getEnvironmentStatus(neighbor.playerId);
      if (env && env.hasRain) {
        rainyNeighbors++;
      }
    }

    const moistureBonus = rainyNeighbors * 0.05;
    return 1.0 + moistureBonus;
  },

  /**
   * Update environment status for a player
   * Called by game systems when conditions change
   */
  updateEnvironmentStatus(playerId, status) {
    this.environmentCache.set(playerId, {
      deforestation: status.deforestation || 0,
      hasRain: status.hasRain || false,
      lastUpdate: Date.now()
    });
  },

  /**
   * Get cached environment status
   */
  getEnvironmentStatus(playerId) {
    return this.environmentCache.get(playerId);
  },

  /* ================= MUTUAL AID SYSTEM ================= */

  /**
   * Send resources to a neighbor
   * @param {string} senderId
   * @param {string} receiverId
   * @param {object} resources - { crops: {}, materials: {} }
   * @param {object} worldMap
   * @param {object} senderFarm - Sender's private farm
   * @returns {object} - { success: bool, message: string, reputationGain: number }
   */
  sendResources(senderId, receiverId, resources, worldMap, senderFarm) {
    // Validate neighbor relationship
    const neighbors = this.getPlayerNeighbors(senderId, worldMap);
    const isNeighbor = neighbors.some(n => n.playerId === receiverId);

    if (!isNeighbor) {
      return { success: false, message: '只能向相邻邻居发送资源', reputationGain: 0 };
    }

    // Check transfer cooldown (max 1 transfer per neighbor per day)
    const transferKey = `${senderId}|${receiverId}`;
    const lastTransfer = this.transferHistory.get(transferKey);
    const cooldownHours = 24;

    if (lastTransfer && (Date.now() - lastTransfer) < cooldownHours * 3600 * 1000) {
      const hoursLeft = Math.ceil((cooldownHours * 3600 * 1000 - (Date.now() - lastTransfer)) / 3600000);
      return {
        success: false,
        message: `冷却中，${hoursLeft}小时后可再次发送`,
        reputationGain: 0
      };
    }

    // Validate sender has resources
    const validation = this._validateResources(senderFarm, resources);
    if (!validation.valid) {
      return { success: false, message: validation.message, reputationGain: 0 };
    }

    // Calculate resource value for reputation
    const resourceValue = this._calculateResourceValue(resources);

    // Deduct from sender (would be implemented in actual game logic)
    // this._deductResources(senderFarm, resources);

    // Record transfer
    this.transferHistory.set(transferKey, Date.now());

    // Add reputation
    const reputationGain = Math.floor(resourceValue / 10);
    this.addReputation(senderId, receiverId, reputationGain);

    console.log(`[NeighborSystem] ${senderId} sent resources to ${receiverId}, +${reputationGain} reputation`);

    return {
      success: true,
      message: `成功发送资源给邻居！获得 ${reputationGain} 声望`,
      reputationGain,
      resourceValue
    };
  },

  /**
   * Validate player has sufficient resources
   * @private
   */
  _validateResources(farm, resources) {
    // Check crops
    if (resources.crops) {
      for (const [cropType, amount] of Object.entries(resources.crops)) {
        const available = farm.inventory?.crops?.[cropType]?.length || 0;
        if (available < amount) {
          return {
            valid: false,
            message: `${cropType} 不足: 需要 ${amount}, 拥有 ${available}`
          };
        }
      }
    }

    // Check materials
    if (resources.materials) {
      for (const [materialType, amount] of Object.entries(resources.materials)) {
        const available = farm.inventory?.materials?.[materialType] || 0;
        if (available < amount) {
          return {
            valid: false,
            message: `${materialType} 不足: 需要 ${amount}, 拥有 ${available}`
          };
        }
      }
    }

    return { valid: true };
  },

  /**
   * Calculate total value of resources for reputation calculation
   * @private
   */
  _calculateResourceValue(resources) {
    let totalValue = 0;

    // Crop values (from CROP_TYPES in farming_enhanced.js)
    const cropPrices = {
      starwheat: 15,
      goldcorn: 25,
      rubyberry: 20,
      magicroot: 80
    };

    if (resources.crops) {
      for (const [cropType, amount] of Object.entries(resources.crops)) {
        totalValue += (cropPrices[cropType] || 10) * amount;
      }
    }

    // Material values
    const materialPrices = {
      wood: 5,
      stone: 8,
      beastPart_water: 30,
      beastPart_fire: 30,
      beastPart_earth: 30,
      beastPart_wind: 30
    };

    if (resources.materials) {
      for (const [materialType, amount] of Object.entries(resources.materials)) {
        totalValue += (materialPrices[materialType] || 10) * amount;
      }
    }

    return totalValue;
  },

  /* ================= REPUTATION SYSTEM ================= */

  /**
   * Add reputation between two players
   * @param {string} playerId - Player gaining reputation
   * @param {string} neighborId - Neighbor with whom reputation increases
   * @param {number} points - Reputation points to add
   */
  addReputation(playerId, neighborId, points) {
    if (!this.reputation.has(playerId)) {
      this.reputation.set(playerId, new Map());
    }

    const playerRep = this.reputation.get(playerId);
    const currentRep = playerRep.get(neighborId) || 0;
    playerRep.set(neighborId, currentRep + points);

    // Check for reputation milestones
    const newRep = currentRep + points;
    this._checkReputationMilestones(playerId, neighborId, currentRep, newRep);
  },

  /**
   * Get reputation with a specific neighbor
   */
  getReputation(playerId, neighborId) {
    const playerRep = this.reputation.get(playerId);
    return playerRep ? (playerRep.get(neighborId) || 0) : 0;
  },

  /**
   * Get total reputation (sum across all neighbors)
   */
  getTotalReputation(playerId) {
    const playerRep = this.reputation.get(playerId);
    if (!playerRep) return 0;

    let total = 0;
    for (const points of playerRep.values()) {
      total += points;
    }
    return total;
  },

  /**
   * Get reputation tier with a neighbor
   * @returns {string} - 'stranger' | 'acquaintance' | 'friend' | 'ally' | 'legend'
   */
  getReputationTier(playerId, neighborId) {
    const rep = this.getReputation(playerId, neighborId);

    if (rep >= 1000) return 'legend';
    if (rep >= 500) return 'ally';
    if (rep >= 200) return 'friend';
    if (rep >= 50) return 'acquaintance';
    return 'stranger';
  },

  /**
   * Check and trigger reputation milestone rewards
   * @private
   */
  _checkReputationMilestones(playerId, neighborId, oldRep, newRep) {
    const milestones = [
      { threshold: 50, reward: '解锁: 可请求邻居协助灌溉', tier: 'acquaintance' },
      { threshold: 200, reward: '解锁: 资源交易折扣 10%', tier: 'friend' },
      { threshold: 500, reward: '解锁: 联合防御虫害', tier: 'ally' },
      { threshold: 1000, reward: '解锁: 共享科技研究加速', tier: 'legend' }
    ];

    for (const milestone of milestones) {
      if (oldRep < milestone.threshold && newRep >= milestone.threshold) {
        console.log(`[NeighborSystem] 🎉 Reputation milestone: ${playerId} reached ${milestone.tier} with neighbor!`);
        console.log(`  Reward: ${milestone.reward}`);

        // Trigger in-game notification
        this._triggerMilestoneNotification(playerId, neighborId, milestone);
      }
    }
  },

  /**
   * Trigger milestone notification (placeholder for UI integration)
   * @private
   */
  _triggerMilestoneNotification(playerId, neighborId, milestone) {
    // Would integrate with game notification system
    if (typeof window !== 'undefined' && window.showNotification) {
      window.showNotification({
        type: 'reputation',
        title: '声望提升！',
        message: milestone.reward,
        icon: 'reputation_up'
      });
    }
  },

  /* ================= REQUEST SYSTEM (RECIPROCAL AID) ================= */

  /**
   * Request aid from a neighbor (costs reputation)
   * @param {string} requesterId
   * @param {string} neighborId
   * @param {string} aidType - 'irrigation' | 'pest_control' | 'defense'
   * @returns {object} - { success: bool, message: string }
   */
  requestAid(requesterId, neighborId, aidType) {
    const reputation = this.getReputation(requesterId, neighborId);
    const aidCosts = {
      irrigation: 20,      // Requires acquaintance
      pest_control: 100,   // Requires friend
      defense: 250         // Requires ally
    };

    const cost = aidCosts[aidType] || 50;

    if (reputation < cost) {
      return {
        success: false,
        message: `声望不足: 需要 ${cost}, 当前 ${reputation}`
      };
    }

    // Deduct reputation (cost of asking for help)
    this.addReputation(requesterId, neighborId, -cost);

    console.log(`[NeighborSystem] ${requesterId} requested ${aidType} from ${neighborId}`);

    return {
      success: true,
      message: `已请求邻居援助: ${aidType}`,
      aidType,
      cost
    };
  },

  /* ================= DAILY UPDATE ================= */

  /**
   * Daily update tick for all neighbor-related systems
   * Call this once per game day
   */
  dailyUpdate(playerId, worldMap, privateFarm, currentDay) {
    const results = {
      droughtRisk: 1.0,
      moistureBonus: 1.0,
      pestSpread: false,
      neighborCount: 0
    };

    const neighbors = this.getPlayerNeighbors(playerId, worldMap);
    results.neighborCount = neighbors.length;

    if (neighbors.length === 0) {
      return results; // No neighbors, no effects
    }

    // Calculate environmental effects
    results.droughtRisk = this.calculateDeforestationDrought(playerId, worldMap, privateFarm);
    results.moistureBonus = this.calculateRainBenefit(playerId, worldMap);
    results.pestSpread = this.checkPestSpread(playerId, worldMap, currentDay);

    return results;
  },

  /* ================= UI INTEGRATION ================= */

  /**
   * Get neighbor summary for UI display
   */
  getNeighborSummary(playerId, worldMap) {
    const neighbors = this.getPlayerNeighbors(playerId, worldMap);

    return neighbors.map(neighbor => {
      const reputation = this.getReputation(playerId, neighbor.playerId);
      const tier = this.getReputationTier(playerId, neighbor.playerId);
      const env = this.getEnvironmentStatus(neighbor.playerId);
      const pest = this.pestStatus.get(neighbor.playerId);

      return {
        playerId: neighbor.playerId,
        name: neighbor.name,
        level: neighbor.level,
        position: { q: neighbor.q, r: neighbor.r },
        reputation,
        reputationTier: tier,
        environment: {
          deforested: env ? env.deforestation > 0.5 : false,
          hasRain: env ? env.hasRain : false,
          hasPest: pest ? pest.hasPest : false
        }
      };
    });
  },

  /* ================= SERIALIZATION ================= */

  /**
   * Serialize state for saving
   */
  serialize() {
    return {
      reputation: Array.from(this.reputation.entries()).map(([playerId, repMap]) => ({
        playerId,
        neighbors: Array.from(repMap.entries())
      })),
      pestStatus: Array.from(this.pestStatus.entries()),
      transferHistory: Array.from(this.transferHistory.entries()),
      environmentCache: Array.from(this.environmentCache.entries())
    };
  },

  /**
   * Deserialize state from save data
   */
  deserialize(data) {
    if (!data) return;

    // Restore reputation
    if (data.reputation) {
      this.reputation.clear();
      for (const { playerId, neighbors } of data.reputation) {
        this.reputation.set(playerId, new Map(neighbors));
      }
    }

    // Restore pest status
    if (data.pestStatus) {
      this.pestStatus = new Map(data.pestStatus);
    }

    // Restore transfer history
    if (data.transferHistory) {
      this.transferHistory = new Map(data.transferHistory);
    }

    // Restore environment cache
    if (data.environmentCache) {
      this.environmentCache = new Map(data.environmentCache);
    }
  }
};

// Export to global scope
if (typeof window !== 'undefined') {
  window.NeighborSystem = NeighborSystem;
}

// Node.js export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NeighborSystem;
}
