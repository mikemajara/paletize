function extractColors() {
  const colorSet = new Set();
  const colorRegex = {
    hex: /#([0-9a-f]{3}){1,2}\b/gi,
    rgb: /rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/gi,
    rgba: /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(?:0?\.[0-9]+|[01])\s*\)/gi,
    hsl: /hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)/gi,
    hsla: /hsla\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*,\s*(?:0?\.[0-9]+|[01])\s*\)/gi,
  };

  // Get all styles from stylesheets
  Array.from(document.styleSheets).forEach((sheet) => {
    try {
      Array.from(sheet.cssRules || []).forEach((rule) => {
        const cssText = rule.cssText;

        // Extract all types of colors
        for (const type in colorRegex) {
          const matches = cssText.match(colorRegex[type]) || [];
          matches.forEach((color) => colorSet.add(color.toLowerCase()));
        }
      });
    } catch (e) {
      // Skip cross-origin stylesheets
    }
  });

  // Get inline styles from all elements
  Array.from(document.querySelectorAll("*")).forEach((element) => {
    const computedStyle = getComputedStyle(element);
    const properties = [
      "color",
      "background-color",
      "border-color",
      "box-shadow",
      "text-shadow",
    ];

    properties.forEach((prop) => {
      const value = computedStyle.getPropertyValue(prop);
      if (
        value &&
        value !== "none" &&
        value !== "initial" &&
        value !== "inherit"
      ) {
        // For computed styles, we'll get rgb/rgba values
        if (value.startsWith("rgb")) {
          colorSet.add(value.toLowerCase());
        }
      }
    });
  });

  // Filter out 'transparent', 'rgba(0, 0, 0, 0)', etc.
  const filteredColors = Array.from(colorSet).filter((color) => {
    if (color === "transparent") return false;
    if (color.includes("rgba") && color.endsWith(", 0)")) return false;
    return true;
  });

  // Convert all colors to RGB objects for processing
  const colorObjects = filteredColors.map(colorToRgb);

  // Group similar colors
  const groupedColors = groupSimilarColors(colorObjects);

  // Sort colors by HSL values
  const sortedColors = sortColorsByHsl(groupedColors);

  return sortedColors;
}

// Helper function to convert any color format to RGB object
function colorToRgb(color) {
  const tempEl = document.createElement("div");
  tempEl.style.color = color;
  document.body.appendChild(tempEl);

  const computedColor = getComputedStyle(tempEl).color;
  document.body.removeChild(tempEl);

  // Extract RGB values
  const rgbMatch =
    computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/) ||
    computedColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)/);

  if (!rgbMatch) return { original: color, r: 0, g: 0, b: 0, a: 1 };

  const r = parseInt(rgbMatch[1], 10);
  const g = parseInt(rgbMatch[2], 10);
  const b = parseInt(rgbMatch[3], 10);
  const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1;

  return {
    original: color,
    r,
    g,
    b,
    a,
  };
}

// Convert RGB to HSL
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Calculate color difference
function colorDistance(color1, color2) {
  // Simple Euclidean distance in RGB space
  const rDiff = color1.r - color2.r;
  const gDiff = color1.g - color2.g;
  const bDiff = color1.b - color2.b;

  return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
}

// Group similar colors together
function groupSimilarColors(colors) {
  const PROXIMITY_THRESHOLD = 25; // Adjust this threshold as needed
  const groups = [];

  colors.forEach((color) => {
    // Try to find an existing group to add this color to
    let foundGroup = false;

    for (const group of groups) {
      if (colorDistance(color, group.representative) < PROXIMITY_THRESHOLD) {
        group.colors.push(color);
        // Re-calculate the representative (average) if needed
        // For simplicity, we'll keep the first color as representative
        foundGroup = true;
        break;
      }
    }

    // If no suitable group was found, create a new one
    if (!foundGroup) {
      groups.push({
        representative: color,
        colors: [color],
      });
    }
  });

  // For each group, only keep the representative color
  return groups.map((group) => group.representative.original);
}

// Sort colors by HSL values
function sortColorsByHsl(colors) {
  const colorWithHsl = colors.map((color) => {
    const rgb = colorToRgb(color);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return { original: color, hsl };
  });

  // Sort by hue first, then saturation, then lightness
  colorWithHsl.sort((a, b) => {
    // First sort by hue
    if (Math.abs(a.hsl.h - b.hsl.h) > 10) {
      return a.hsl.h - b.hsl.h;
    }
    // If hues are similar, sort by saturation
    if (Math.abs(a.hsl.s - b.hsl.s) > 10) {
      return b.hsl.s - a.hsl.s;
    }
    // If both hue and saturation are similar, sort by lightness
    return a.hsl.l - b.hsl.l;
  });

  return colorWithHsl.map((c) => c.original);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractColors") {
    sendResponse({ colors: extractColors() });
  }
});
