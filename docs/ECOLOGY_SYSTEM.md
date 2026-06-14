# Terra Chronicle - Ecology & Food Chain System

## Overview

The ecology system adds a dynamic food chain mechanic to Terra Chronicle, creating a balanced ecosystem where predator beasts control pest populations that threaten crops.

## Core Mechanics

### 1. Pest Spawning
- **Base Spawn Rate**: 3% per plot per day (without predators)
- **Spawn Conditions**: Only on plots with active crops
- **Pest Types**: 
  - 🦗 **Locust** (蝗虫): Eats foliage/stems
  - 🐛 **Aphid** (蚜虫): Sucks plant sap
  - 🪲 **Weevil** (象鼻虫): Attacks grains
  - 🦋 **Moth** (粉蝶): Larvae eat flowers/fruit

### 2. Predator Control
- **Predator Types**:
  - 🐱 **Field Cat** (田猫): Hunting power 1.0x, targets locusts/weevils
  - 🐈 **Shadow Lynx** (影山猫): Hunting power 1.4x, targets moths/aphids
  - 🦦 **Jade Ferret** (翠鼬): Hunting power 0.9x, targets aphids/weevils

- **Hunting Radius**: 5 tiles around predator position
- **Consumption Rate**: 0.8 pest severity reduction per predator per day
- **Stamina**: Predators need >10% stamina to hunt effectively

### 3. Overhunting Mechanic
When predator-to-plot ratio falls below 0.3 (threshold):
- **Pest explosion triggered**
- Spawn rate increases by 3x
- Warning displayed: "⚠️ 掠食者不足！虫害爆发中"
- Ecosystem balance crashes (red zone)

### 4. Crop Damage
- **Damage Rate**: 10% of yield per day per pest
- **Effects**:
  - Reduces crop quality directly
  - Slows growth rate by 50% of damage rate
  - Visual indicators appear on infested plots

### 5. Ecosystem Balance
Calculated from:
- **Predator Score** (40%): Ratio to ideal population
- **Pest Score** (50%): Inverse of infestation rate
- **Base** (10%): Baseline health
- **Penalty**: -30% if overhunting active

**Balance Zones**:
- 🟢 **Green (70-100%)**: Healthy ecosystem
- 🟡 **Yellow (40-69%)**: Warning - intervention recommended
- 🔴 **Red (0-39%)**: Critical - ecosystem collapse

### 6. Player Interventions

#### Manual Pesticide Treatment
```javascript
ecologyIntegration.treatPest(tileKey)
```
- **Effect**: Instantly removes pest infestation
- **Side Effects**:
  - -15% crop quality (chemical residue)
  - -5% soil fertility
- **Use Case**: Emergency pest removal when predators unavailable

#### Predator Deployment
```javascript
ecologyIntegration.deployPredator(beast, {x, y})
```
- **Effect**: Assigns predator to hunt in 5-tile radius
- **Requirements**: Beast must be predator species
- **Assignment**: Sets `beast.assignment = 'pest_control'`
- **No Side Effects**: Natural pest control

## UI Components

### 1. Ecology Status Panel (Top-Right)
- **Balance Bar**: Visual health indicator with color coding
- **Metrics Display**:
  - 🐛 Current pest count
  - 🐱 Active predator count
  - 📉 Daily crop damage percentage
- **Warnings**: Active alerts with suggestions

### 2. Predator Assignment Panel (Bottom-Left)
- **Predator List**: Shows all available predator beasts
- **Status Indicators**: Active/Standby state
- **Stamina Display**: Current energy level
- **Click to Toggle**: Assign/unassign predators

### 3. Plot Visual Feedback
- **Pest Overlays**: Colored circles with pulsing animation
  - Opacity scales with severity (30-80%)
  - Color matches pest type
- **Predator Coverage**: Green glow on protected plots
  - Intensity scales with coverage strength

## Integration Guide

### Step 1: Add Scripts to HTML
```html
<!-- Add before main.js -->
<script src="src/ecology_system.js"></script>
<script src="src/ecology_integration.js"></script>
```

### Step 2: Initialize in Game Setup
```javascript
// After creating gameState and pixiApp
ecologyIntegration = initializeEcology(gameState, app, document.body);

// Add predator UI
const predatorUI = createPredatorAssignmentUI(
  ecologyIntegration,
  gameState.farm.beasts,
  (beast) => console.log('Assignment changed:', beast.id)
);
document.body.appendChild(predatorUI);
```

### Step 3: Update in Game Loop
```javascript
function update(dt) {
  if (ecologyIntegration && gameState.farm) {
    const result = ecologyIntegration.update(
      dt,
      gameState.farm,
      gameState.farm.beasts || []
    );
    
    // React to warnings
    if (result.warnings.length > 0) {
      showNotification(result.warnings[0].message);
    }
  }
}
```

### Step 4: Save/Load Integration
```javascript
// Save
function saveGame() {
  if (ecologyIntegration) {
    ecologyIntegration.save(gameState);
  }
  localStorage.setItem('save', JSON.stringify(gameState));
}

// Load (automatic from gameState.ecology)
ecologyIntegration.ecology.load(gameState.ecology);
```

## Warning System

### Warning Types

#### 1. Pest Explosion (High Priority)
```javascript
{
  type: 'pest_explosion',
  severity: 'high',
  message: '⚠️ 掠食者不足！虫害爆发中',
  suggestion: '需要更多猫科灵兽来控制虫害'
}
```
**Trigger**: Predator ratio < 0.3 threshold

#### 2. Heavy Infestation (Medium Priority)
```javascript
{
  type: 'heavy_infestation',
  severity: 'medium',
  message: '🐛 虫害严重，作物受损中',
  suggestion: '增派掠食者或使用除虫剂'
}
```
**Trigger**: Pest-to-predator ratio > 5

#### 3. Ecosystem Collapse (High Priority)
```javascript
{
  type: 'ecosystem_collapse',
  severity: 'high',
  message: '🔴 生态系统崩溃！',
  suggestion: '立即调整掠食者数量'
}
```
**Trigger**: Balance falls to red zone (<40%)

**Cooldown**: 10 seconds between warnings to avoid spam

## API Reference

### EcologySystem Class

#### Methods

##### `update(dt, plots, beasts, currentDay)`
Main update loop, call every frame.
- **dt**: Delta time in seconds
- **plots**: Farm plots object `{"x,y": {crop, fertility, ...}}`
- **beasts**: Array of beast objects with positions
- **currentDay**: Current game day number
- **Returns**: `{balance, metrics, warnings}`

##### `treatWithPesticide(tileKey)`
Remove pest infestation chemically.
- **tileKey**: Plot coordinate string "x,y"
- **Returns**: `{success, message, sideEffects}`

##### `deployPredator(beast, position)`
Assign predator to hunt at location.
- **beast**: Beast object
- **position**: `{x, y}` coordinates
- **Returns**: `{success, message}`

##### `getPestInfo(tileKey)`
Get detailed pest information for plot.
- **Returns**: `{type, severity, severityPercent, age, visual}` or null

##### `getPredatorCoverage(tileKey)`
Calculate predator hunting power at location.
- **Returns**: Number (0+ hunting power coverage)

##### `getBalanceStatus()`
Get current ecosystem health.
- **Returns**: `{level: 'green'|'yellow'|'red', text, textEn}`

##### `save() / load(data)`
Serialize/deserialize ecology state.

### Integration Interface

#### Methods

##### `update(dt, farm, beasts)`
Integrated update wrapper.

##### `registerPlot(tileKey, sprite)`
Track plot sprite for visual feedback.

##### `treatPest(tileKey)`
Treat pest with automatic side effect application.

##### `deployPredator(beast, position)`
Deploy predator with validation.

##### `getBalance()`
Get full balance data including metrics.

##### `save(gameState)`
Save to game state object.

## Balance Tuning

### Key Constants (in `ECOLOGY_CONFIG`)

```javascript
{
  PEST_SPAWN_BASE_CHANCE: 0.03,        // 3% per plot per day
  PREDATOR_RANGE: 5,                   // Hunting radius in tiles
  PEST_CROP_DAMAGE: 0.10,              // 10% yield loss per day
  PEST_GROWTH_RATE: 0.15,              // Severity increase rate
  PREDATOR_CONSUMPTION: 0.8,           // Pest removal rate
  OVERHUNTING_THRESHOLD: 0.3,          // Critical predator ratio
  PEST_EXPLOSION_MULTIPLIER: 3.0,      // Spawn boost when overhunted
  BALANCE_UPDATE_INTERVAL: 2.0,        // Update frequency (seconds)
  WARNING_COOLDOWN: 10.0,              // Warning rate limit
}
```

### Recommended Predator Ratios
- **Minimum**: 1 predator per 15 plots (prevents explosion)
- **Comfortable**: 1 predator per 10 plots (yellow zone)
- **Optimal**: 1 predator per 7 plots (green zone)

## Testing & Debugging

### Console Commands

```javascript
// Spawn test pest
debugSpawnPest(x, y)

// Force pest explosion
debugPestExplosion()

// Clear all pests
debugClearPests()

// Show detailed status
debugEcologyStatus()

// Get balance history
ecologyIntegration.ecology.balanceHistory
```

### Monitoring Metrics

```javascript
const metrics = ecologyIntegration.ecology.metrics;
console.log({
  totalPests: metrics.totalPests,
  totalPredators: metrics.totalPredators,
  pestDamageToday: metrics.pestDamageToday,
  predatorKillsToday: metrics.predatorKillsToday,
  overhuntingActive: metrics.overhuntingActive,
});
```

## Performance Notes

- **Update Frequency**: 60 FPS safe (optimized for real-time)
- **Balance Calculation**: Only every 2 seconds
- **Memory**: ~1KB per 100 plots with pests
- **UI Updates**: Throttled to 0.5 Hz (every 2 seconds)

## Future Enhancements

- [ ] Multi-tier food chain (herbivores → predators → apex predators)
- [ ] Seasonal pest migrations
- [ ] Predator breeding/population growth
- [ ] Pest immunity to repeated pesticide use
- [ ] Biome-specific pest/predator types
- [ ] Player-craftable pest traps
- [ ] Beneficial insects (pollinators)

## Credits

Ecology system designed and implemented for Terra Chronicle (大地编年史).
System architecture follows existing farming_enhanced.js patterns.
