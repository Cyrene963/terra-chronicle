#!/usr/bin/env python3
"""Generate effect sprites for Terra Chronicle."""

from PIL import Image, ImageDraw, ImageFilter
import math
import random

SIZE = 512
MAGENTA = (255, 0, 255)


def create_capture_ring():
    """Golden glowing ring with transparent center."""
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    center = SIZE // 2
    outer_radius = 220
    inner_radius = 160

    # Create multiple layers for glow effect
    for i in range(20, 0, -1):
        alpha = int(255 * (i / 20) * 0.6)
        thickness = 8 + i * 2
        color = (255, 215, 0, alpha)  # Gold

        r_outer = outer_radius + i * 2
        r_inner = inner_radius - i * 2

        draw.ellipse([center - r_outer, center - r_outer,
                     center + r_outer, center + r_outer],
                    fill=None, outline=color, width=thickness)

    # Main bright ring
    for angle in range(0, 360, 2):
        rad = math.radians(angle)
        for r in range(inner_radius, outer_radius, 3):
            x = center + r * math.cos(rad)
            y = center + r * math.sin(rad)
            brightness = 200 + int(55 * math.sin(angle * 3 * math.pi / 180))
            alpha = 220 + int(35 * math.cos(angle * 5 * math.pi / 180))
            draw.ellipse([x-2, y-2, x+2, y+2],
                        fill=(brightness, brightness//2, 0, alpha))

    # Add sparkle points
    for _ in range(12):
        angle = random.uniform(0, 2 * math.pi)
        r = random.uniform(inner_radius, outer_radius)
        x = center + r * math.cos(angle)
        y = center + r * math.sin(angle)
        size = random.randint(3, 8)
        draw.ellipse([x-size, y-size, x+size, y+size],
                    fill=(255, 255, 200, 255))

    img = img.filter(ImageFilter.GaussianBlur(1))
    return img


def create_evolution_burst():
    """Radiant light explosion with magenta background."""
    img = Image.new('RGB', (SIZE, SIZE), MAGENTA)
    overlay = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    center = SIZE // 2

    # Radial rays
    for angle in range(0, 360, 15):
        rad = math.radians(angle)
        length = 240
        width = 25

        # Create gradient ray
        for i in range(length):
            alpha = int(255 * (1 - i / length) ** 1.5)
            brightness = 255 - int(50 * i / length)

            x1 = center + (i - width) * math.cos(rad)
            y1 = center + (i - width) * math.sin(rad)
            x2 = center + (i + width) * math.cos(rad)
            y2 = center + (i + width) * math.sin(rad)

            color = (brightness, brightness - 30, 200, alpha)
            draw.line([x1, y1, x2, y2], fill=color, width=2)

    # Central bright core
    for r in range(80, 0, -2):
        alpha = int(255 * (1 - r / 80) ** 0.5)
        brightness = 255
        draw.ellipse([center - r, center - r, center + r, center + r],
                    fill=(brightness, brightness, 255, alpha))

    # Outer glow rings
    for r in range(100, 200, 20):
        alpha = int(100 * (1 - (r - 100) / 100))
        draw.ellipse([center - r, center - r, center + r, center + r],
                    fill=None, outline=(255, 220, 180, alpha), width=3)

    overlay = overlay.filter(ImageFilter.GaussianBlur(2))
    img.paste(overlay, (0, 0), overlay)
    return img


def create_level_up_sparkle():
    """Star particles with magenta background."""
    img = Image.new('RGB', (SIZE, SIZE), MAGENTA)
    overlay = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    center = SIZE // 2

    # Draw multiple stars in circular pattern
    for ring in range(3):
        num_stars = 8 + ring * 4
        radius = 80 + ring * 60

        for i in range(num_stars):
            angle = (360 / num_stars) * i + ring * 15
            rad = math.radians(angle)

            cx = center + radius * math.cos(rad)
            cy = center + radius * math.sin(rad)

            # Draw 4-pointed star
            size = 15 + ring * 5
            points = []
            for j in range(8):
                r = size if j % 2 == 0 else size * 0.4
                a = rad + (j * math.pi / 4)
                points.append((cx + r * math.cos(a), cy + r * math.sin(a)))

            # Star with gradient
            alpha = 220 - ring * 40
            draw.polygon(points, fill=(255, 255, 100, alpha))

            # Glow around star
            for gr in range(5, 20, 3):
                glow_alpha = int(alpha * 0.3 * (1 - gr / 20))
                draw.ellipse([cx - gr, cy - gr, cx + gr, cy + gr],
                           fill=(255, 255, 200, glow_alpha))

    # Central burst star
    for j in range(8):
        r = 40 if j % 2 == 0 else 15
        a = j * math.pi / 4
        x = center + r * math.cos(a)
        y = center + r * math.sin(a)
        draw.line([center, center, x, y], fill=(255, 255, 255, 255), width=8)

    # Add small sparkles
    for _ in range(30):
        x = random.randint(50, SIZE - 50)
        y = random.randint(50, SIZE - 50)
        size = random.randint(2, 5)
        alpha = random.randint(150, 255)
        draw.ellipse([x - size, y - size, x + size, y + size],
                    fill=(255, 255, 200, alpha))

    overlay = overlay.filter(ImageFilter.GaussianBlur(1.5))
    img.paste(overlay, (0, 0), overlay)
    return img


def create_healing_aura():
    """Soft green glow with transparent center."""
    img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    center = SIZE // 2

    # Outer soft glow layers
    for r in range(240, 50, -10):
        alpha = int(80 * (1 - (r - 50) / 190) ** 2)
        green = 100 + int(155 * (1 - (r - 50) / 190))
        draw.ellipse([center - r, center - r, center + r, center + r],
                    fill=(50, green, 80, alpha))

    # Pulsing waves
    for i, radius in enumerate([120, 160, 200]):
        alpha = 60 - i * 15
        draw.ellipse([center - radius, center - radius,
                     center + radius, center + radius],
                    fill=None, outline=(100, 255, 150, alpha), width=4)

    # Floating particles
    for _ in range(40):
        angle = random.uniform(0, 2 * math.pi)
        dist = random.uniform(60, 200)
        x = center + dist * math.cos(angle)
        y = center + dist * math.sin(angle)
        size = random.randint(2, 6)
        alpha = random.randint(120, 200)

        # Draw soft particle
        for gr in range(size, 0, -1):
            particle_alpha = int(alpha * (gr / size))
            draw.ellipse([x - gr, y - gr, x + gr, y + gr],
                        fill=(150, 255, 180, particle_alpha))

    # Center gentle glow
    for r in range(60, 0, -3):
        alpha = int(40 * (1 - r / 60))
        draw.ellipse([center - r, center - r, center + r, center + r],
                    fill=(180, 255, 200, alpha))

    img = img.filter(ImageFilter.GaussianBlur(3))
    return img


def create_damage_impact():
    """Red slash effect with magenta background."""
    img = Image.new('RGB', (SIZE, SIZE), MAGENTA)
    overlay = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    center = SIZE // 2

    # Main diagonal slash
    slash_angle = -45  # degrees
    rad = math.radians(slash_angle)

    length = 300
    start_x = center - (length / 2) * math.cos(rad)
    start_y = center - (length / 2) * math.sin(rad)
    end_x = center + (length / 2) * math.cos(rad)
    end_y = center + (length / 2) * math.sin(rad)

    # Draw slash with gradient width
    segments = 50
    for i in range(segments):
        t = i / segments
        x1 = start_x + (end_x - start_x) * t
        y1 = start_y + (end_y - start_y) * t
        x2 = start_x + (end_x - start_x) * (t + 1 / segments)
        y2 = start_y + (end_y - start_y) * (t + 1 / segments)

        # Width varies - thick in middle, thin at ends
        width_factor = math.sin(t * math.pi)
        width = int(30 * width_factor)

        # Color varies - bright in middle
        brightness = int(255 * (0.7 + 0.3 * width_factor))
        alpha = int(255 * (0.8 + 0.2 * width_factor))

        draw.line([x1, y1, x2, y2],
                 fill=(brightness, 20, 20, alpha), width=width)

    # Add white hot core
    for i in range(segments):
        t = i / segments
        x1 = start_x + (end_x - start_x) * t
        y1 = start_y + (end_y - start_y) * t
        x2 = start_x + (end_x - start_x) * (t + 1 / segments)
        y2 = start_y + (end_y - start_y) * (t + 1 / segments)

        width_factor = math.sin(t * math.pi)
        width = int(8 * width_factor)
        alpha = int(200 * width_factor)

        draw.line([x1, y1, x2, y2],
                 fill=(255, 255, 255, alpha), width=width)

    # Impact sparks
    for _ in range(15):
        angle = random.uniform(0, 2 * math.pi)
        dist = random.uniform(80, 180)
        spark_len = random.randint(20, 50)

        sx = center + dist * math.cos(angle)
        sy = center + dist * math.sin(angle)
        ex = sx + spark_len * math.cos(angle)
        ey = sy + spark_len * math.sin(angle)

        alpha = random.randint(180, 255)
        draw.line([sx, sy, ex, ey],
                 fill=(255, 100, 50, alpha), width=3)

    # Shockwave rings
    for r in [100, 140, 180]:
        segments_ring = 60
        for i in range(segments_ring):
            angle = (360 / segments_ring) * i
            rad_ring = math.radians(angle)

            # Create broken ring effect
            if i % 4 != 0:
                x = center + r * math.cos(rad_ring)
                y = center + r * math.sin(rad_ring)
                size = 3
                alpha = int(150 * (1 - (r - 100) / 80))
                draw.ellipse([x - size, y - size, x + size, y + size],
                           fill=(255, 80, 80, alpha))

    overlay = overlay.filter(ImageFilter.GaussianBlur(2))
    img.paste(overlay, (0, 0), overlay)
    return img


def main():
    effects = {
        'capture_ring': create_capture_ring,
        'evolution_burst': create_evolution_burst,
        'level_up_sparkle': create_level_up_sparkle,
        'healing_aura': create_healing_aura,
        'damage_impact': create_damage_impact,
    }

    output_dir = '/root/terra-chronicle-game/assets/sprites'

    for name, func in effects.items():
        print(f"Generating {name}...")
        img = func()
        path = f"{output_dir}/{name}.png"
        img.save(path, 'PNG')
        print(f"  Saved: {path}")

    print("\nAll effect sprites generated successfully!")


if __name__ == '__main__':
    main()
