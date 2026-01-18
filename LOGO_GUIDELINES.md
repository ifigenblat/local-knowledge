# Logo Creation Guidelines for LocalKnowledge

## 📐 Required File Formats and Sizes

You'll need to create logo files in the following formats and sizes:

### 1. **SVG Format (Primary - Recommended)**
- **File:** `logo.svg`
- **Size:** 512x512 pixels (viewBox) or scalable
- **Usage:** Main logo in sidebar, displays crisply at any size
- **Requirements:**
  - White background
  - Black and white design
  - Vector format (scalable)
  - Should work well from 32x32 to 512x512

- **File:** `favicon.svg`
- **Size:** 64x64 pixels (viewBox) or scalable
- **Usage:** Browser tab favicon (modern browsers)
- **Requirements:**
  - Simplified version of main logo
  - Must be recognizable at very small sizes (16x16)
  - White background
  - Black and white design

### 2. **PNG Format (Raster - Required for fallbacks)**
Create these specific sizes:

- **`logo512.png`** - 512×512 pixels
  - For large app icons and PWA manifests
  
- **`logo192.png`** - 192×192 pixels  
  - For Apple touch icon and medium app icons
  
- **`favicon-32x32.png`** - 32×32 pixels
  - Standard favicon size
  
- **`favicon-16x16.png`** - 16×16 pixels
  - Smallest favicon size

### 3. **ICO Format (Fallback for older browsers)**
- **File:** `favicon.ico`
- **Size:** 32×32 pixels (or multi-size ICO with 16, 24, 32, 64)
- **Usage:** Fallback favicon for older browsers

---

## 🎨 Design Specifications

### Background
- **Color:** White (#FFFFFF)
- **Transparency:** Not required (white background is fine)

### Colors
- **Foreground:** Black (#000000)
- **Design:** Black and white only

### Content
- Notebook image
- Circle in the center
- Feather pen inside the circle

---

## 📁 File Location

All files should be placed in:
```
client/public/
```

Required files:
```
client/public/logo.svg          (Main logo - SVG)
client/public/favicon.svg       (Favicon - SVG)
client/public/logo512.png       (512×512 PNG)
client/public/logo192.png       (192×192 PNG)
client/public/favicon-32x32.png (32×32 PNG)
client/public/favicon-16x16.png (16×16 PNG)
client/public/favicon.ico       (ICO format)
```

---

## 🔧 Export Recommendations

### From Adobe Illustrator / Figma / Sketch:
1. **For SVG:**
   - Export as SVG
   - Use "Presentation Attributes" or "Style Attributes"
   - Include viewBox: `viewBox="0 0 512 512"`
   - Optimize SVG (remove unnecessary metadata)

2. **For PNG:**
   - Export at exact pixel dimensions:
     - 512×512 for `logo512.png`
     - 192×192 for `logo192.png`
     - 32×32 for `favicon-32x32.png`
     - 16×16 for `favicon-16x16.png`
   - Use 2x or higher resolution if your tool exports @2x versions (we can scale down)
   - PNG-24 or PNG-32 format

3. **For ICO:**
   - Export 32×32 PNG first
   - Convert to ICO using online tool or:
     - macOS: Can use `sips` command
     - Online: https://www.icoconverter.com/
   - Or just rename `favicon-32x32.png` to `favicon.ico` (modern browsers accept this)

---

## ✅ Quick Checklist

- [ ] `logo.svg` - 512×512 viewBox, white background
- [ ] `favicon.svg` - 64×64 viewBox, simplified version
- [ ] `logo512.png` - Exactly 512×512 pixels
- [ ] `logo192.png` - Exactly 192×192 pixels
- [ ] `favicon-32x32.png` - Exactly 32×32 pixels
- [ ] `favicon-16x16.png` - Exactly 16×16 pixels
- [ ] `favicon.ico` - ICO format (or 32×32 PNG renamed)

---

## 💡 Tips

1. **Test at small sizes:** Make sure the logo is recognizable at 16×16 pixels (especially the feather)

2. **Keep it simple:** Complex details may be lost at small sizes

3. **Consistent design:** The favicon should be a simplified version of the main logo

4. **White background is fine:** We don't need transparency since it's black and white on white

5. **Naming matters:** Use exact filenames as listed above

---

## 🚀 After Creating Files

Once you have your files ready, just:
1. Replace the files in `client/public/` with your new ones
2. Keep the same exact filenames
3. Restart the frontend server (or hard refresh the browser)

The system will automatically use your new logo files!
