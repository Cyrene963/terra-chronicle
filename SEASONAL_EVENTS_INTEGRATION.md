# Seasonal Events Integration Guide

## Overview

The seasonal events system (`src/seasonal_events.js`) implements four major events that occur at the end of each season:

1. **Spring Auction (Day 5-7)**: Players bid on rare seeds and beast eggs using coins
2. **Summer Arena (Day 12-14)**: PvP ladder with card deck battles
3. **Autumn Harvest (Day 19-21)**: Crop yield leaderboard competition
4. **Winter Void Tide (Day 26-28)**: Cooperative wave defense boss fight

## Integration Steps

### 1. Script Loading

The system is already included in `index.html`:

```html
<script src="src/seasonal_events.js?v=1"></script>
```

### 2. Main Game Loop Integration

Add this to your main game update loop in `src/main.js`:

```javascript
// In your main update/tick function
function gameLoop(dt) {
  // ... existing game logic ...

  // Update seasonal events (call once per frame)
  const currentDay = Math.floor(elapsed / DAY_SECONDS);
  if (window.updateSeasonalEvents) {
    window.updateSeasonalEvents(currentDay);
  }
}
```

### 3. Harvest Integration

When a player harvests crops, report to the Autumn Harvest event:

```javascript
// In your crop harvest function
function harvestCrop(plotX, plotY) {
  const plot = Terra.farm.plots[`${plotX},${plotY}`];
  if (plot && plot.crop) {
    const quantity = 1;
    const quality = plot.crop.quality || 1.0;
    
    // Existing harvest logic...
    Terra.farm.inventory.crops[plot.crop.species] = 
      Terra.farm.inventory.crops[plot.crop.species] || [];
    Terra.farm.inventory.crops[plot.crop.species].push({
      quality,
      originFertility: plot.fertility
    });
    
    // Report to seasonal event
    if (window.onCropHarvested) {
      window.onCropHarvested(plot.crop.species, quantity, quality);
    }
    
    plot.crop = null;
  }
}
```

### 4. Battle Integration

#### Arena PvP Battles

```javascript
// When starting an arena battle
function startArenaBattle(opponentId) {
  const result = window.challengeArenaOpponent(opponentId);
  if (result.ok) {
    // Launch battle system with arena rules
    enterBattle('arena', opponentId);
  }
}

// After battle completes
function onBattleEnd(winnerId, matchId) {
  if (window.SeasonalEvents.currentEvent?.id === 'summer_arena') {
    window.recordArenaResult(matchId, winnerId);
  }
}
```

#### Void Boss Battles

```javascript
// When player damages void boss in battle
function dealDamageToVoidBoss(damage) {
  if (window.onVoidBossDamage) {
    const result = window.onVoidBossDamage(damage);
    if (result.waveCleared) {
      console.log(`Wave ${result.nextWave - 1} cleared!`);
      // Show wave transition
    }
    if (result.eventComplete) {
      console.log('All waves defeated! Event complete!');
      // Show victory screen
    }
  }
}
```

### 5. Economy Integration

#### Initialize Coins

Add coins to the farm inventory:

```javascript
// In createPrivateFarm or game initialization
Terra.farm.inventory.materials.coin = 500; // Starting coins
```

#### Coin Management in Auction

The auction system automatically deducts coins when bidding. Winners receive their items at event end:

```javascript
// Call at season end
if (SeasonalEvents.currentEvent?.id === 'spring_auction') {
  const rewards = window.distributeRewards('spring_auction', 'local');
  rewards.rewards.forEach(reward => {
    if (reward.type === 'seed') {
      // Add seed to inventory
      Terra.farm.inventory.crops[reward.id] = 
        Terra.farm.inventory.crops[reward.id] || [];
      Terra.farm.inventory.crops[reward.id].push({ quality: 2.0 });
    } else if (reward.type === 'beast') {
      // Add beast to farm
      Terra.farm.beasts.push({
        id: reward.id,
        species: reward.name,
        element: 'thunder', // or appropriate element
      });
    }
  });
}
```

## API Reference

### Core Functions

- `checkEventTrigger(currentDay)` - Returns active event ID or null
- `openEventUI(eventId)` - Opens the UI for a specific event
- `distributeRewards(eventId, playerId)` - Distributes end-of-event rewards

### Spring Auction

- `placeBid(itemId, amount, playerId)` - Place a bid on an auction item

### Summer Arena

- `joinArena(deck, playerId)` - Join arena with a card deck
- `challengeArenaOpponent(opponentId, playerId)` - Challenge a ladder opponent
- `recordArenaResult(matchId, winnerId)` - Record battle result

### Autumn Harvest

- `reportHarvest(cropType, quantity, quality, playerId)` - Report crop harvest

### Winter Void Tide

- `damageVoidBoss(damage, playerId)` - Deal damage to the void boss
- `getVoidContributions()` - Get leaderboard of player contributions

## UI Customization

The event UIs use the same parchment aesthetic as the rest of the game. To customize:

- Edit the inline styles in `openAuctionUI()`, `openArenaUI()`, `openHarvestUI()`, `openVoidUI()`
- Colors match the design system: `#f4ecd8`, `#d4af37` (gold), `#2a2520` (ink)
- Font: 'Cormorant Garamond' for headers, 'Noto Serif SC' for body text

## Testing

### Manual Event Triggering

```javascript
// In browser console
window.checkEventTrigger(6);  // Trigger Spring Auction
window.checkEventTrigger(13); // Trigger Summer Arena
window.checkEventTrigger(20); // Trigger Autumn Harvest
window.checkEventTrigger(27); // Trigger Winter Void Tide

// Open event UI directly
window.openEventUI('spring_auction');
```

### Test Data

The system includes AI opponents and sample data for testing:

- 3 AI competitors in Arena with ratings 1500-1800
- 3 AI farmers in Harvest leaderboard
- 5 auction items (seeds and beast eggs)
- Void boss with 5 waves, scaling HP

## Event Rewards

### Spring Auction
- Winners receive the items they bid on
- Items include rare seeds and beast eggs

### Summer Arena
- Top 10 players receive coin rewards: 500 (1st) to 60 (10th)

### Autumn Harvest
- Top 10 farmers receive rare fertilizer: 50 (1st) to 6 (10th)

### Winter Void Tide
- All participants receive coins based on damage dealt
- Players who complete 3+ waves receive "虚空守护者" title

## Future Enhancements

- [ ] Add multiplayer synchronization for real players
- [ ] Persistent leaderboards across seasons
- [ ] Season-exclusive rewards and cosmetics
- [ ] Event history and replay system
- [ ] More event types (e.g., trading fair, beast tournament)
