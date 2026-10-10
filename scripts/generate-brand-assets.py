#!/usr/bin/env python3
"""Génère les variantes du logo officiel HARDWARE LAB à partir de assets/brand/logo-original.webp.

Toutes les variantes sont obtenues par recadrage et mise à l'échelle uniforme (ratio conservé) :
le dessin original n'est jamais déformé ni redessiné.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/brand/logo-original.webp"
RENDERER_ASSETS = ROOT / "src/renderer/src/assets/brand"
BUILD = ROOT / "build"

# Zones mesurées sur l'original 1536x1024.
FULL_LOGO_BOX = (230, 100, 1310, 850)   # emblème + « HARDWARE LAB », marge sombre incluse
EMBLEM_CENTER = (770, 360)              # centre de l'anneau HL
EMBLEM_HALF = 250                       # demi-côté du carré recadré
EMBLEM_MASK_RADIUS = 238                # anneau (~225 px) + halo ; masque les amorces de pistes et le texte
BACKGROUND = (6, 9, 13)                 # fond sombre de l'original


def rounded_mask(size: int, radius_ratio: float = 0.2) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=int(size * radius_ratio), fill=255)
    return mask


def main() -> None:
    src = Image.open(SRC).convert("RGB")
    assert src.size == (1536, 1024), f"Format inattendu : {src.size}"
    RENDERER_ASSETS.mkdir(parents=True, exist_ok=True)
    BUILD.mkdir(parents=True, exist_ok=True)

    full = src.crop(FULL_LOGO_BOX)
    full.save(RENDERER_ASSETS / "logo-full.png", optimize=True)

    cx, cy = EMBLEM_CENTER
    emblem_raw = src.crop((cx - EMBLEM_HALF, cy - EMBLEM_HALF, cx + EMBLEM_HALF, cy + EMBLEM_HALF))
    size = EMBLEM_HALF * 2
    circle = Image.new("L", (size, size), 0)
    r = EMBLEM_MASK_RADIUS
    ImageDraw.Draw(circle).ellipse((EMBLEM_HALF - r, EMBLEM_HALF - r, EMBLEM_HALF + r, EMBLEM_HALF + r), fill=255)
    circle = circle.filter(ImageFilter.GaussianBlur(6))
    emblem = Image.composite(emblem_raw, Image.new("RGB", (size, size), BACKGROUND), circle)
    emblem.save(RENDERER_ASSETS / "logo-emblem.png", optimize=True)

    # Icône d'application : emblème sur son fond d'origine, coins arrondis.
    icon = emblem.resize((512, 512), Image.LANCZOS).convert("RGBA")
    icon.putalpha(rounded_mask(512))
    icon.save(BUILD / "icon.png")
    icon.save(ROOT / "resources/icon.png")  # icône de fenêtre embarquée dans l'application
    icon.save(BUILD / "icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])

    # Bandeau latéral de l'installateur NSIS (164x314, BMP 24 bits).
    sidebar = Image.new("RGB", (164, 314), BACKGROUND)
    logo_w = 150
    logo = full.resize((logo_w, round(full.height * logo_w / full.width)), Image.LANCZOS)
    sidebar.paste(logo, ((164 - logo_w) // 2, (314 - logo.height) // 2 - 20))
    sidebar.save(BUILD / "installerSidebar.bmp")
    print("Variantes générées.")


if __name__ == "__main__":
    main()
