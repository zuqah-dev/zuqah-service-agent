"""
Generate the error screenshots used in the issue-diagnosis stage of the demo.

    python scripts/build_screenshots.py

These are drawn rather than captured so the demo is reproducible, contains no
real system detail, and can be regenerated if the wording needs to change. Each
renders a plausible error dialog with text a vision model has to actually read.

Four are produced, and the fourth matters as much as the others:

    vpn-error-809      the main demo path
    outlook-sync       an alternate path
    disk-full          a problem the employee can fix themselves, no ticket
    unreadable         a cropped, blurred dialog

The last one exists to prove the agent asks for a better screenshot rather than
inventing an error code. Being able to demonstrate that is worth more than a
fourth error to diagnose.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "data" / "generated" / "screenshots"

# Windows-ish palette. Close enough to read as a real dialog without imitating
# any particular product.
DESKTOP = (32, 45, 66)
DIALOG_BG = (243, 243, 243)
TITLE_BG = (255, 255, 255)
BORDER = (200, 200, 200)
TEXT = (23, 23, 23)
MUTED = (96, 96, 96)
ACCENT = (0, 90, 158)
DANGER = (196, 43, 28)


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """Segoe UI where available, DejaVu otherwise, bitmap default as last resort."""
    candidates = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
        if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default(size)


def wrap(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list[str]:
    words, lines, current = text.split(), [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textlength(candidate, font=font) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def dialog(
    filename: str,
    title: str,
    heading: str,
    body: str,
    detail: str | None = None,
    buttons: tuple[str, ...] = ("OK",),
    icon: str = "error",
    blur: float = 0.0,
    crop_fraction: float = 1.0,
) -> Path:
    """Draw one dialog on a desktop background and save it."""
    width, height = 900, 560
    image = Image.new("RGB", (width, height), DESKTOP)
    draw = ImageDraw.Draw(image)

    # A faint gradient so the dialog does not sit on flat colour, which reads as
    # a mock-up rather than a screen.
    for y in range(height):
        shade = int(12 * (y / height))
        draw.line([(0, y), (width, y)], fill=(DESKTOP[0] + shade, DESKTOP[1] + shade, DESKTOP[2] + shade))

    box_w, box_h = 560, 260
    x0 = (width - box_w) // 2
    y0 = (height - box_h) // 2

    draw.rectangle([x0 + 4, y0 + 6, x0 + box_w + 4, y0 + box_h + 6], fill=(20, 30, 45))
    draw.rectangle([x0, y0, x0 + box_w, y0 + box_h], fill=DIALOG_BG, outline=BORDER)
    draw.rectangle([x0, y0, x0 + box_w, y0 + 38], fill=TITLE_BG, outline=BORDER)

    title_font = load_font(14)
    heading_font = load_font(19, bold=True)
    body_font = load_font(15)
    detail_font = load_font(13)
    button_font = load_font(14)

    draw.text((x0 + 14, y0 + 11), title, font=title_font, fill=TEXT)
    draw.text((x0 + box_w - 26, y0 + 10), "\u00d7", font=title_font, fill=MUTED)

    icon_x, icon_y = x0 + 26, y0 + 66
    if icon == "error":
        draw.ellipse([icon_x, icon_y, icon_x + 34, icon_y + 34], fill=DANGER)
        draw.line([icon_x + 11, icon_y + 11, icon_x + 23, icon_y + 23], fill="white", width=3)
        draw.line([icon_x + 23, icon_y + 11, icon_x + 11, icon_y + 23], fill="white", width=3)
    else:
        draw.ellipse([icon_x, icon_y, icon_x + 34, icon_y + 34], fill=(240, 163, 10))
        draw.text((icon_x + 14, icon_y + 7), "!", font=heading_font, fill="white")

    text_x = icon_x + 52
    text_w = box_w - (text_x - x0) - 26

    draw.text((text_x, y0 + 62), heading, font=heading_font, fill=TEXT)

    y = y0 + 96
    for line in wrap(draw, body, body_font, text_w):
        draw.text((text_x, y), line, font=body_font, fill=TEXT)
        y += 22

    if detail:
        y += 6
        for line in wrap(draw, detail, detail_font, text_w):
            draw.text((text_x, y), line, font=detail_font, fill=MUTED)
            y += 18

    bx = x0 + box_w - 20
    for index, label in enumerate(reversed(buttons)):
        w = max(88, int(draw.textlength(label, font=button_font)) + 34)
        bx -= w
        primary = index == len(buttons) - 1
        draw.rectangle(
            [bx, y0 + box_h - 52, bx + w, y0 + box_h - 20],
            fill=ACCENT if primary else (225, 225, 225),
            outline=ACCENT if primary else BORDER,
        )
        draw.text(
            (bx + (w - draw.textlength(label, font=button_font)) / 2, y0 + box_h - 45),
            label,
            font=button_font,
            fill="white" if primary else TEXT,
        )
        bx -= 10

    if crop_fraction < 1.0:
        image = image.crop((0, 0, int(width * crop_fraction), height))
    if blur > 0:
        image = image.filter(ImageFilter.GaussianBlur(blur))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / filename
    image.save(path, "PNG")
    return path


def main() -> int:
    produced = [
        dialog(
            "vpn-error-809.png",
            title="Zuqah Technologies VPN",
            heading="Cannot connect to Zuqah Technologies VPN",
            body=(
                "Error 809: The network connection between your computer and the VPN "
                "server could not be established because the remote server is not "
                "responding."
            ),
            detail="This is typically caused by a device between your computer and the "
            "remote server blocking the connection.",
            buttons=("Retry", "Close"),
        ),
        dialog(
            "outlook-sync.png",
            title="Zuqah Technologies Mail",
            heading="Your mailbox is not up to date",
            body=(
                "Error 0x8004010F: The operation failed. An object cannot be found. "
                "Zuqah Technologies Mail cannot synchronise the offline data file."
            ),
            detail="Last successful synchronisation: 3 days ago.",
            buttons=("Repair", "Cancel"),
        ),
        dialog(
            "disk-full.png",
            title="Storage",
            heading="Low disk space on Local Disk (C:)",
            body=(
                "You are running out of space on Local Disk (C:). "
                "1.2 GB free of 476 GB. Windows needs at least 10 GB free to install "
                "updates."
            ),
            detail="Free up space by removing temporary files and emptying the recycle bin.",
            buttons=("Free up space", "Close"),
            icon="warning",
        ),
        # Cropped and blurred on purpose. The correct response is to ask for a
        # better screenshot, not to guess at the error code.
        dialog(
            "unreadable.png",
            title="Application Error",
            heading="An unexpected problem occurred",
            body="Error 0x000000: The operation could not be completed. Reference code "
            "A7F3-2291-BBQ4-1180 was recorded in the event log.",
            detail="Contact your administrator with the reference code.",
            buttons=("Details", "Close"),
            blur=3.2,
            crop_fraction=0.52,
        ),
    ]

    for path in produced:
        size = Image.open(path).size
        print(f"  {path.name:24} {size[0]}x{size[1]}  {path.stat().st_size // 1024} KB")

    print(f"\n{len(produced)} screenshots written to data/generated/screenshots/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
