# Assets

## Icons

Place your menu bar icons here:

- `icon-template.png` - 16x16 or 32x32 PNG template icon for the menu bar
  - Template icons should be black with transparency
  - They will automatically adapt to light/dark mode on macOS

## Sounds

Custom sound files can be placed here if needed (optional).
By default, the app uses macOS system sounds.

## Creating Icons

For the menu bar icon:
1. Create a 16x16 or 32x32 pixel PNG
2. Use black (#000000) for the icon shape
3. Use transparency for the background
4. Name it `icon-template.png`
5. Optionally create `icon-template@2x.png` for retina displays (32x32)

Example using ImageMagick:
```bash
# Create a simple dot icon
convert -size 16x16 xc:transparent -fill black -draw "circle 8,8 8,3" icon-template.png
```
