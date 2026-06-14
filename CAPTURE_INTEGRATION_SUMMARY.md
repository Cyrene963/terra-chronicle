# Terra Chronicle - Capture System Integration Summary

## Files Created/Modified

### New Files:
1. **src/capture_integration.js** - Main integration layer connecting capture_system.js to the game
2. **src/capture_main_integration.js** - Documentation of integration points
3. **CAPTURE_INTEGRATION_SUMMARY.md** - This file

### Modified Files:
1. **index.html** - Added script tags for capture_system.js and capture_integration.js
2. **src/main.js** - Added initialization code and encounter trigger

## Integration Features

### 1. Random Encounters
- **Trigger**: 5% chance when player clicks on grass tiles (g, G)
- **Location**: Integrated into `commandTo()` function in main.js
- **Biome Mapping**: Grass tiles map to "forest" biome for beast spawning

### 2. Capture UI
- **Modal overlay** with beast information display
- **Actions**:
  - **Weaken**: Reduces beast HP by 15-25%
  - **Capture**: Attempts capture with magic crystal
  - **Flee**: Closes encounter
- **HP Bar**: Dynamic color change (green → yellow → red)
- **Success Rate**: Based on beast HP and rarity

### 3. Ranch UI
- **Capacity Display**: Shows occupied/total slots (max 20)
- **Beast Cards**: Grid layout with:
  - Name, element, personality
  - Stats (HP, ATK, DEF)
  - Stamina bar
  - Work assignment status
  - Evolution button (placeholder)
  - Release button
- **Rarity Colors**:
  - Common: Gray
  - Uncommon: Green
  - Rare: Blue
  - Epic: Purple
  - Legendary: Orange

### 4. HUD Integration
- **Ranch Button** added to dock (between inventory and craft button)
- Opens ranch UI on click
- Styled to match existing UI theme

## API Reference

### CaptureIntegration.init(gameContext)
Initializes the capture system with game context:
```javascript
{
  player: playerNode,
  objL: objectLayer,
  overlayL: overlayLayer,
  world: worldContainer,
  app: pixiApp,
  farm: farmState,
  grid: tileGrid,
  TS: tileSize
}
```

### CaptureIntegration.tryTriggerEncounter(wx, wy, grid)
Attempts to spawn an encounter at world coordinates.
Returns `true` if encounter triggered, `false` otherwise.

### CaptureSystem Functions (from capture_system.js)
- `trySpawnEncounter(plot, encounterRate)` - Generate wild beast
- `attemptCapture(beast, crystalTier)` - Try to capture beast
- `addBeastToRanch(farm, beast)` - Add captured beast to ranch
- `releaseBeast(farm, beastId)` - Release beast from ranch
- `getRanchStatus(farm)` - Get ranch statistics

## Beast Species Available

Currently implemented (from capture_system.js):
- **Forest**: Woodland Sprite, Shadow Fox, Ancient Oak Spirit
- **River**: River Turtle, Mist Serpent, Azure Dragon
- **Mountain**: Cliff Eagle, Stone Golem, Thunder Wyvern
- **Plains**: Prairie Wolf, Golden Antelope
- **Swamp**: Bog Toad, Swamp Wraith

Total: 15 species (placeholder for 200+)

## Data Structure

### Beast Object (in farm.beasts[])
```javascript
{
  id: 'wild_1234567890_123456',
  speciesId: 'woodland_sprite',
  name: '林地精灵',
  element: 'earth',
  rarity: 'common',
  maxHP: 45,
  currentHP: 45,
  atk: 12,
  def: 8,
  personality: {
    key: 'diligent',
    name: '勤勉',
    workEfficiency: 1.3,
    fatigueRate: 1.2
  },
  workTypes: ['farming', 'gather_wood'],
  abilities: ['催生', '树语'],
  stamina: 100,
  friendship: 30,
  loyalty: 50,
  experience: 0,
  level: 1,
  assignment: null,  // 'irrigate' | 'mill' | 'till' | 'forge' | 'combat'
  capturedAt: timestamp,
  discoveredAt: { x: 23, y: 28, biome: 'forest' }
}
```

## Testing Checklist

- [x] Script tags added to index.html
- [x] Capture integration initialized in main.js
- [x] Encounter trigger added to commandTo()
- [x] Ranch button added to HUD dock
- [x] farm.beasts array initialized
- [ ] Test encounter spawning (click grass tiles)
- [ ] Test capture UI flow
- [ ] Test beast capture and ranch storage
- [ ] Test ranch UI display
- [ ] Test beast release
- [ ] Verify save/load persistence

## Next Steps

1. **Test the integration** - Load the game and click grass tiles to trigger encounters
2. **Implement evolution system** - Currently placeholder
3. **Add work assignment** - Connect beasts to farm tasks
4. **Create more species** - Expand from 15 to 200+
5. **Add evolution trees** - May already exist in evolution_tree.js
6. **Integrate with battle system** - Use beasts in combat

## Notes

- Encounter rate is 5% per grass tile click (configurable in ENCOUNTER_RATE)
- Ranch capacity is 20 slots (configurable in CaptureSystem.RANCH_MAX_SLOTS)
- Save/load is handled by Terra.save() which persists farm.beasts
- UI styling matches existing game theme (Cormorant Garamond + Noto Serif SC fonts)
- All text is in Chinese to match game language

## File Paths

All files are located in `/root/terra-chronicle-game/`:
- `src/capture_system.js` (existing)
- `src/capture_integration.js` (new)
- `src/main.js` (modified)
- `index.html` (modified)
