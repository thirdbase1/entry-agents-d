import os
from PIL import Image

src_path = r"C:\Users\HP ELITEBOOK 840 G7\.gemini\antigravity\brain\3456dcd5-5d87-42b0-baee-d95546f47395\.user_uploaded\media_1793914613956_b143be13.jpg"
base_dir = r"C:\Users\HP ELITEBOOK 840 G7\.gemini\antigravity\scratch\agent-ui"

img = Image.open(src_path)
print(f"Loaded source image: size={img.size}, mode={img.mode}")

direct_targets = [
    os.path.join(base_dir, "public", "icon.png"),
    os.path.join(base_dir, "app", "icon.png"),
    os.path.join(base_dir, "app-icon.png"),
    os.path.join(base_dir, "website", "assets", "icon.png"),
    os.path.join(base_dir, "src-tauri", "icons", "icon.png"),
    os.path.join(base_dir, "src-tauri", "icons", "32x32.png"),
]

for target in direct_targets:
    os.makedirs(os.path.dirname(target), exist_ok=True)
    with open(src_path, "rb") as sf, open(target, "wb") as df:
        df.write(sf.read())
    print(f"Copied exact bytes to {target}")

resize_targets = {
    os.path.join(base_dir, "src-tauri", "icons", "64x64.png"): (64, 64),
    os.path.join(base_dir, "src-tauri", "icons", "128x128.png"): (128, 128),
    os.path.join(base_dir, "src-tauri", "icons", "128x128@2x.png"): (256, 256),
    os.path.join(base_dir, "src-tauri", "icons", "Square30x30Logo.png"): (30, 30),
    os.path.join(base_dir, "src-tauri", "icons", "Square44x44Logo.png"): (44, 44),
    os.path.join(base_dir, "src-tauri", "icons", "Square71x71Logo.png"): (71, 71),
    os.path.join(base_dir, "src-tauri", "icons", "Square89x89Logo.png"): (89, 89),
    os.path.join(base_dir, "src-tauri", "icons", "Square107x107Logo.png"): (107, 107),
    os.path.join(base_dir, "src-tauri", "icons", "Square142x142Logo.png"): (142, 142),
    os.path.join(base_dir, "src-tauri", "icons", "Square150x150Logo.png"): (150, 150),
    os.path.join(base_dir, "src-tauri", "icons", "Square284x284Logo.png"): (284, 284),
    os.path.join(base_dir, "src-tauri", "icons", "Square310x310Logo.png"): (310, 310),
    os.path.join(base_dir, "src-tauri", "icons", "StoreLogo.png"): (50, 50),
}

for path, size in resize_targets.items():
    resized = img.resize(size, Image.Resampling.LANCZOS)
    resized.save(path, format="PNG")
    print(f"Generated {size} -> {path}")

ico_sizes = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
ico_targets = [
    os.path.join(base_dir, "public", "favicon.ico"),
    os.path.join(base_dir, "src-tauri", "icons", "icon.ico"),
]

for ico_path in ico_targets:
    img.save(ico_path, format="ICO", sizes=ico_sizes)
    print(f"Generated multi-size ICO -> {ico_path}")

print("All icon assets updated successfully.")
