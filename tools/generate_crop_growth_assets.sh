#!/bin/bash
# Generate crop growth stage sprites using gpt-image-2
# Creates seedling and growing stages for crop and crop_dewberry

OUTPUT_DIR="/root/terra-chronicle-game/assets/sprites"

echo "Generating crop growth assets..."
echo "================================"

# Generic crop - seedling stage
echo "1/4: crop_seedling.png"
# Placeholder - would use actual image generation API
convert -size 48x58 xc:transparent \
  -fill "#88cc66" -draw "circle 24,45 24,40" \
  -fill "#99dd77" -draw "ellipse 20,42 4,6 0,360" \
  -fill "#99dd77" -draw "ellipse 28,42 4,6 0,360" \
  -fill "#aaddaa" -draw "line 24,45 24,52" \
  "$OUTPUT_DIR/crop_seedling.png" 2>/dev/null || echo "  (needs ImageMagick or actual generation)"

# Generic crop - growing stage
echo "2/4: crop_growing.png"
convert -size 48x58 xc:transparent \
  -fill "#66aa44" -draw "circle 24,35 24,28" \
  -fill "#77bb55" -draw "ellipse 18,35 7,10 0,360" \
  -fill "#77bb55" -draw "ellipse 30,35 7,10 0,360" \
  -fill "#88cc66" -draw "ellipse 24,28 8,11 0,360" \
  -fill "#99bb88" -draw "rectangle 22,35 26,52" \
  "$OUTPUT_DIR/crop_growing.png" 2>/dev/null || echo "  (needs ImageMagick or actual generation)"

# Dewberry - seedling stage
echo "3/4: crop_dewberry_seedling.png"
convert -size 52x56 xc:transparent \
  -fill "#aa6655" -draw "line 26,48 26,52" \
  -fill "#88bb66" -draw "circle 22,44 22,40" \
  -fill "#88bb66" -draw "circle 30,44 30,40" \
  "$OUTPUT_DIR/crop_dewberry_seedling.png" 2>/dev/null || echo "  (needs ImageMagick or actual generation)"

# Dewberry - growing stage
echo "4/4: crop_dewberry_growing.png"
convert -size 52x56 xc:transparent \
  -fill "#446633" -draw "circle 26,32 26,24" \
  -fill "#558844" -draw "ellipse 18,32 9,11 0,360" \
  -fill "#558844" -draw "ellipse 34,32 9,11 0,360" \
  -fill "#ffffff" -draw "circle 22,28 22,26" \
  -fill "#ffffff" -draw "circle 30,28 30,26" \
  "$OUTPUT_DIR/crop_dewberry_growing.png" 2>/dev/null || echo "  (needs ImageMagick or actual generation)"

echo ""
echo "================================"
echo "Growth asset generation plan created."
echo "Note: Actual high-quality sprites need gpt-image-2 generation."
echo ""
echo "Prompts for gpt-image-2:"
echo "1. crop_seedling: 'tiny crop sprout, 2 pale green cotyledon leaves just emerging, delicate thin stem, soft watercolor, transparent background, top-down 3/4 view, 48x58px'"
echo "2. crop_growing: 'young leafy plant, 4-6 medium green leaves spreading outward, visible thicker stem, soft watercolor style, transparent background, top-down 3/4 view, 48x58px'"
echo "3. crop_dewberry_seedling: 'tiny berry bush seedling, 2 small rounded dark green leaves, reddish stem, soft watercolor, transparent background, top-down 3/4 view, 52x56px'"
echo "4. crop_dewberry_growing: 'young dewberry bush, multiple dark green leaves, small white berry flowers appearing, compact rounded shape, soft watercolor, transparent background, top-down 3/4 view, 52x56px'"

