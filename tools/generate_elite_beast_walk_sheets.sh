#!/bin/bash
# Generate walk animation sprite sheets for 4 elite beasts
# Following the existing 4-frame horizontal strip format used by beast_fire_walk_sheet and beast_water_walk_sheet

OUTPUT_DIR="/root/terra-chronicle-game/assets/sprites"

echo "Elite Beast Walk Animation Asset Plan"
echo "======================================"
echo ""

# Beast specs from ASSETS
declare -A beasts=(
  ["beast_shrine_fox_spirit"]="80x82"
  ["beast_sacred_fawnling"]="78x82"
  ["beast_white_serpent_shrine"]="84x88"
  ["beast_deepsea_noble"]="80x86"
)

declare -A prompts=(
  ["beast_shrine_fox_spirit"]="mythical shrine fox spirit walking cycle, 4 frames horizontal strip, white fur with red shrine markings, elegant trot, soft watercolor style, transparent background, side view 3/4 perspective, each frame 80x82px"
  ["beast_sacred_fawnling"]="sacred deer fawn walking cycle, 4 frames horizontal strip, gentle cream-colored fur, graceful step animation, soft watercolor style, transparent background, side view 3/4 perspective, each frame 78x82px"
  ["beast_white_serpent_shrine"]="white serpent shrine guardian slithering cycle, 4 frames horizontal strip, elegant white scales with blue shrine patterns, smooth undulating motion, soft watercolor style, transparent background, side view 3/4 perspective, each frame 84x88px"
  ["beast_deepsea_noble"]="deep sea noble creature walking cycle, 4 frames horizontal strip, blue-pearl elegant aquatic being, regal swimming motion adapted to land, soft watercolor style, transparent background, side view 3/4 perspective, each frame 80x86px"
)

for beast in "${!beasts[@]}"; do
  echo "Asset: ${beast}_walk_sheet.png"
  echo "  Size: ${beasts[$beast]} per frame (4 frames horizontal)"
  echo "  Total: $(awk -F'x' '{print $1*4"x"$2}' <<< "${beasts[$beast]}")"
  echo "  Prompt: ${prompts[$beast]}"
  echo ""
done

echo "======================================"
echo "Implementation approach:"
echo "1. Generate 4-frame walk sheets via gpt-image-2"
echo "2. Save as: beast_<species>_walk_sheet.png"
echo "3. Update makeNode() to add walk animation for these 4 beasts"
echo "4. Apply same frame cycling logic as beast_fire/beast_water"
echo ""
echo "Code changes needed in makeNode():"
echo "  - Extend beast animation condition to include all 6 animated beasts"
echo "  - Add mapping for new walk sheet paths"

