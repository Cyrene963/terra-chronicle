#!/bin/bash
# Optimize beast sprites: resize to 256x256 with high-quality anti-aliasing

BEASTS=(
  "beast_shrine_fox_spirit"
  "beast_white_serpent_shrine"
  "beast_fire"
  "beast_water"
  "beast_sacred_fawnling"
  "beast_spring_drop"
  "beast_deepsea_noble"
)

for beast in "${BEASTS[@]}"; do
  input="${beast}.png"
  output="${beast}_optimized.png"
  
  if [ -f "$input" ]; then
    echo "Processing $input..."
    convert "$input" \
      -resize 256x256 \
      -filter Lanczos \
      -unsharp 0x0.75+0.75+0.008 \
      -background none \
      -alpha on \
      -quality 95 \
      "$output"
    
    if [ $? -eq 0 ]; then
      mv "$output" "$input"
      echo "✓ $input optimized"
    else
      echo "✗ Failed to process $input"
    fi
  else
    echo "⚠ $input not found"
  fi
done

echo ""
echo "Optimization complete. Verifying results..."
identify -format "%f: %wx%h\n" beast_*.png | grep -v "_backup\|_raw\|_src512\|walk_sheet"
