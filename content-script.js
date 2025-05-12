function extractColors(proximityThreshold = 10) {
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

  // Group similar colors using the provided threshold
  const groupedColors = groupSimilarColors(colorObjects, proximityThreshold);

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
  // Convert RGB to LAB color space for perceptual color difference
  const lab1 = rgbToLab(color1.r, color1.g, color1.b);
  const lab2 = rgbToLab(color2.r, color2.g, color2.b);

  // Calculate delta E using CIEDE2000 formula (simplified version)
  const deltaL = lab1.l - lab2.l;
  const deltaA = lab1.a - lab2.a;
  const deltaB = lab1.b - lab2.b;

  // Weighted Euclidean distance (simplified approximation of CIEDE2000)
  // This gives better perceptual results than simple RGB distance
  return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
}

// Convert RGB to LAB color space
function rgbToLab(r, g, b) {
  // First convert RGB to XYZ
  r /= 255;
  g /= 255;
  b /= 255;

  // Apply gamma correction
  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // Convert to XYZ using sRGB matrix
  const x = r * 0.4124 + g * 0.3576 + b * 0.1805;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = r * 0.0193 + g * 0.1192 + b * 0.9505;

  // Convert XYZ to LAB
  // Reference white point
  const xn = 0.95047;
  const yn = 1.0;
  const zn = 1.08883;

  const fx =
    x > 0.008856 ? Math.pow(x / xn, 1 / 3) : 7.787 * (x / xn) + 16 / 116;
  const fy =
    y > 0.008856 ? Math.pow(y / yn, 1 / 3) : 7.787 * (y / yn) + 16 / 116;
  const fz =
    z > 0.008856 ? Math.pow(z / zn, 1 / 3) : 7.787 * (z / zn) + 16 / 116;

  const l = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const bValue = 200 * (fy - fz);

  return { l, a, b: bValue };
}

// Group similar colors together
function groupSimilarColors(colors, threshold = 10) {
  // Default threshold is more conservative with the improved distance calculation
  // Using more perceptually accurate distance threshold
  const groups = [];

  colors.forEach((color) => {
    // Try to find an existing group to add this color to
    let foundGroup = false;

    for (const group of groups) {
      if (colorDistance(color, group.representative) < threshold) {
        group.colors.push(color);
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
    // Get the threshold from the request, default to 10 if not provided
    const threshold = request.threshold || 10;
    sendResponse({ colors: extractColors(threshold) });
  }
});
