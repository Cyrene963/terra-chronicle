#!/usr/bin/env python3
"""Generate UI decoration sprites for Terra Chronicle."""

from PIL import Image, ImageDraw, ImageFilter
import math
import random


def create_corner_ornament_tl():
    """Top-left golden L-shape flourish."""
    size = 256
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Golden color palette
    gold_dark = (184, 134, 11)
    gold_mid = (218, 165, 32)
    gold_light = (255, 215, 0)

    # Main L-shape border
    border_width = 12
    border_length = 180

    # Horizontal arm (top)
    for i in range(border_width):
        alpha = int(255 * (1 - i / border_width * 0.3))
        y = i
        draw.line([0, y, border_length, y],
                 fill=gold_mid + (alpha,), width=1)

    # Vertical arm (left)
    for i in range(border_width):
        alpha = int(255 * (1 - i / border_width * 0.3))
        x = i
        draw.line([x, 0, x, border_length],
                 fill=gold_mid + (alpha,), width=1)

    # Corner junction enhancement
    for r in range(25, 5, -2):
        alpha = int(200 * (1 - (r - 5) / 20))
        draw.ellipse([0, 0, r, r],
                    fill=None, outline=gold_light + (alpha,), width=2)

    # Decorative swirls on horizontal arm
    for i in range(3):
        cx = 60 + i * 40
        cy = border_width // 2

        # Draw spiral flourish
        points = []
        for angle in range(0, 720, 20):
            rad = math.radians(angle)
            r = 8 + angle / 720 * 12
            x = cx + r * math.cos(rad)
            y = cy + r * math.sin(rad)
            points.append((x, y))

        if len(points) > 1:
            for j in range(len(points) - 1):
                alpha = int(255 * (1 - j / len(points) * 0.5))
                draw.line([points[j], points[j + 1]],
                         fill=gold_light + (alpha,), width=2)

    # Decorative swirls on vertical arm
    for i in range(3):
        cx = border_width // 2
        cy = 60 + i * 40

        points = []
        for angle in range(0, 720, 20):
            rad = math.radians(angle)
            r = 8 + angle / 720 * 12
            x = cx + r * math.cos(rad)
            y = cy + r * math.sin(rad)
            points.append((x, y))

        if len(points) > 1:
            for j in range(len(points) - 1):
                alpha = int(255 * (1 - j / len(points) * 0.5))
                draw.line([points[j], points[j + 1]],
                         fill=gold_light + (alpha,), width=2)

    # Add dots along edges
    for i in range(5, border_length, 25):
        # Top edge dots
        for size in range(4, 0, -1):
            alpha = int(255 * (size / 4))
            draw.ellipse([i - size, 2 - size, i + size, 2 + size],
                        fill=gold_light + (alpha,))

        # Left edge dots
        for size in range(4, 0, -1):
            alpha = int(255 * (size / 4))
            draw.ellipse([2 - size, i - size, 2 + size, i + size],
                        fill=gold_light + (alpha,))

    # Add corner jewel
    jewel_center = 6
    for r in range(12, 0, -1):
        alpha = int(255 * (1 - r / 12) ** 0.5)
        color = gold_light if r < 6 else gold_mid
        draw.ellipse([jewel_center - r, jewel_center - r,
                     jewel_center + r, jewel_center + r],
                    fill=color + (alpha,))

    img = img.filter(ImageFilter.GaussianBlur(0.5))
    return img


def create_corner_ornament_br():
    """Bottom-right golden L-shape flourish (mirror of top-left)."""
    tl = create_corner_ornament_tl()
    # Rotate 180 degrees to flip to bottom-right
    return tl.rotate(180)


def create_divider_horizontal():
    """Ornate horizontal divider line."""
    width = 512
    height = 64
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    gold_mid = (218, 165, 32)
    gold_light = (255, 215, 0)

    center_y = height // 2

    # Main horizontal line with gradient
    for i in range(width):
        # Fade at edges
        alpha = int(255 * (0.3 + 0.7 * math.sin(i / width * math.pi)))
        y_offset = int(3 * math.sin(i / width * math.pi * 4))

        for thickness in range(3):
            draw.point((i, center_y + y_offset - thickness),
                      fill=gold_mid + (alpha,))
            draw.point((i, center_y + y_offset + thickness),
                      fill=gold_mid + (alpha,))

    # Central ornament
    cx = width // 2
    cy = center_y

    # Diamond shape in center
    diamond_size = 20
    points = [
        (cx, cy - diamond_size),
        (cx + diamond_size, cy),
        (cx, cy + diamond_size),
        (cx - diamond_size, cy)
    ]

    for offset in range(5, 0, -1):
        alpha = int(255 * (offset / 5) * 0.6)
        offset_points = [
            (cx, cy - diamond_size - offset),
            (cx + diamond_size + offset, cy),
            (cx, cy + diamond_size + offset),
            (cx - diamond_size - offset, cy)
        ]
        draw.polygon(offset_points, fill=None, outline=gold_light + (alpha,))

    draw.polygon(points, fill=gold_mid + (255,))

    # Smaller diamonds at intervals
    for offset_x in [-150, -75, 75, 150]:
        px = cx + offset_x
        py = cy
        small_size = 8

        small_points = [
            (px, py - small_size),
            (px + small_size, py),
            (px, py + small_size),
            (px - small_size, py)
        ]
        draw.polygon(small_points, fill=gold_light + (220,))

    # Decorative curved lines flanking center
    for side in [-1, 1]:
        for curve_offset in [40, 80]:
            points = []
            for i in range(50):
                t = i / 50
                x = cx + side * curve_offset + side * t * 30
                y = cy + 15 * math.sin(t * math.pi)
                points.append((x, y))

            for j in range(len(points) - 1):
                alpha = int(200 * (1 - j / len(points) * 0.5))
                draw.line([points[j], points[j + 1]],
                         fill=gold_light + (alpha,), width=2)

    img = img.filter(ImageFilter.GaussianBlur(0.5))
    return img


def create_button_frame():
    """Decorative button border/frame."""
    width = 256
    height = 128
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    gold_dark = (184, 134, 11)
    gold_mid = (218, 165, 32)
    gold_light = (255, 215, 0)

    margin = 10
    corner_radius = 15

    # Outer glow
    for offset in range(8, 0, -1):
        alpha = int(80 * (1 - offset / 8))
        draw.rounded_rectangle(
            [margin - offset, margin - offset,
             width - margin + offset, height - margin + offset],
            radius=corner_radius + offset,
            fill=None, outline=gold_light + (alpha,), width=2
        )

    # Main border frame
    for thickness in range(6):
        alpha = int(255 * (1 - thickness / 6 * 0.3))
        color = gold_mid if thickness < 3 else gold_dark
        draw.rounded_rectangle(
            [margin + thickness, margin + thickness,
             width - margin - thickness, height - margin - thickness],
            radius=corner_radius - thickness,
            fill=None, outline=color + (alpha,), width=1
        )

    # Corner embellishments
    corners = [
        (margin + corner_radius, margin + corner_radius),  # TL
        (width - margin - corner_radius, margin + corner_radius),  # TR
        (margin + corner_radius, height - margin - corner_radius),  # BL
        (width - margin - corner_radius, height - margin - corner_radius)  # BR
    ]

    for cx, cy in corners:
        # Small decorative circles at corners
        for r in range(8, 0, -1):
            alpha = int(255 * (1 - r / 8) ** 0.5)
            draw.ellipse([cx - r, cy - r, cx + r, cy + r],
                        fill=gold_light + (alpha,))

        # Radiating lines from corners
        for angle in [0, 90, 180, 270]:
            if (cx < width // 2 and angle in [0, 270]) or \
               (cx > width // 2 and angle in [90, 180]):
                rad = math.radians(angle)
                for length in range(5, 15, 2):
                    x = cx + length * math.cos(rad)
                    y = cy + length * math.sin(rad)
                    alpha = int(200 * (1 - length / 15))
                    draw.line([cx, cy, x, y],
                             fill=gold_light + (alpha,), width=1)

    # Top and bottom decorative elements
    for y in [margin + 5, height - margin - 5]:
        for x in range(width // 4, width * 3 // 4, 30):
            size = 3
            draw.ellipse([x - size, y - size, x + size, y + size],
                        fill=gold_light + (255,))

    img = img.filter(ImageFilter.GaussianBlur(0.5))
    return img


def create_scroll_paper():
    """Parchment scroll background texture."""
    width = 512
    height = 512
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Parchment base colors
    parchment_base = (240, 228, 200)
    parchment_dark = (210, 195, 165)
    parchment_light = (250, 240, 220)

    # Fill with base color
    draw.rectangle([0, 0, width, height], fill=parchment_base + (255,))

    # Add texture variation
    random.seed(42)  # Consistent texture
    for _ in range(3000):
        x = random.randint(0, width - 1)
        y = random.randint(0, height - 1)
        size = random.randint(1, 3)
        variation = random.randint(-15, 15)

        color = (
            parchment_base[0] + variation,
            parchment_base[1] + variation,
            parchment_base[2] + variation
        )
        alpha = random.randint(30, 100)
        draw.ellipse([x, y, x + size, y + size],
                    fill=color + (alpha,))

    # Darker edges (rolled scroll effect)
    edge_width = 40
    for i in range(edge_width):
        alpha = int(100 * (1 - i / edge_width))

        # Left edge
        draw.line([i, 0, i, height],
                 fill=parchment_dark + (alpha,), width=1)

        # Right edge
        draw.line([width - i - 1, 0, width - i - 1, height],
                 fill=parchment_dark + (alpha,), width=1)

        # Top edge
        draw.line([0, i, width, i],
                 fill=parchment_dark + (alpha,), width=1)

        # Bottom edge
        draw.line([0, height - i - 1, width, height - i - 1],
                 fill=parchment_dark + (alpha,), width=1)

    # Scroll rod shadows at top and bottom
    for y in [15, height - 15]:
        for x_offset in range(width):
            shadow_alpha = int(60 * (0.5 + 0.5 * math.sin(x_offset / width * math.pi)))
            draw.point((x_offset, y), fill=parchment_dark + (shadow_alpha,))
            draw.point((x_offset, y + 1), fill=parchment_dark + (shadow_alpha // 2,))
            draw.point((x_offset, y - 1), fill=parchment_dark + (shadow_alpha // 2,))

    # Subtle fold lines
    for y_pos in [height // 4, height // 2, height * 3 // 4]:
        for x in range(width):
            wave = int(2 * math.sin(x / width * math.pi * 3))
            alpha = int(20 * (0.5 + 0.5 * math.sin(x / width * math.pi)))
            draw.point((x, y_pos + wave), fill=parchment_dark + (alpha,))

    # Age spots/stains
    random.seed(123)
    for _ in range(15):
        cx = random.randint(50, width - 50)
        cy = random.randint(50, height - 50)
        stain_size = random.randint(10, 30)

        for r in range(stain_size, 0, -1):
            alpha = int(30 * (1 - r / stain_size) ** 2)
            draw.ellipse([cx - r, cy - r, cx + r, cy + r],
                        fill=parchment_dark + (alpha,))

    # Golden decorative border
    gold_color = (218, 165, 32)
    border_margin = 30

    for thickness in range(3):
        alpha = int(200 * (1 - thickness / 3 * 0.4))
        draw.rectangle(
            [border_margin + thickness, border_margin + thickness,
             width - border_margin - thickness, height - border_margin - thickness],
            fill=None, outline=gold_color + (alpha,), width=1
        )

    # Corner decorations on border
    corners = [
        (border_margin, border_margin),
        (width - border_margin, border_margin),
        (border_margin, height - border_margin),
        (width - border_margin, height - border_margin)
    ]

    for cx, cy in corners:
        # Small golden ornaments
        size = 8
        draw.line([cx - size, cy, cx + size, cy],
                 fill=gold_color + (255,), width=2)
        draw.line([cx, cy - size, cx, cy + size],
                 fill=gold_color + (255,), width=2)

        # Diagonal lines
        draw.line([cx - size // 2, cy - size // 2, cx + size // 2, cy + size // 2],
                 fill=gold_color + (200,), width=1)
        draw.line([cx - size // 2, cy + size // 2, cx + size // 2, cy - size // 2],
                 fill=gold_color + (200,), width=1)

    img = img.filter(ImageFilter.GaussianBlur(0.8))
    return img


def main():
    decorations = {
        'corner_ornament_tl': create_corner_ornament_tl,
        'corner_ornament_br': create_corner_ornament_br,
        'divider_horizontal': create_divider_horizontal,
        'button_frame': create_button_frame,
        'scroll_paper': create_scroll_paper,
    }

    output_dir = '/root/terra-chronicle-game/assets/sprites'

    count = 0
    for name, func in decorations.items():
        print(f"Generating {name}...")
        img = func()
        path = f"{output_dir}/{name}.png"
        img.save(path, 'PNG')
        print(f"  Saved: {path}")
        count += 1

    print(f"\nAll {count} UI decoration sprites generated successfully!")
    return count


if __name__ == '__main__':
    main()
