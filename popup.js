document.addEventListener("DOMContentLoaded", () => {
  const colorsContainer = document.getElementById("colors-container");
  const loadingElement = document.getElementById("loading");
  const noColorsElement = document.getElementById("no-colors");
  const copyAllButton = document.getElementById("copy-all");
  const copyMessage = document.getElementById("copy-message");
  const tabButtons = document.querySelectorAll(".tab-button");
  const proximitySlider = document.getElementById("proximity-slider");
  const thresholdValueDisplay = document.getElementById("threshold-value");
  const swatchToggle = document.getElementById("swatch-switch");

  let colors = [];
  let currentFormat = "hex"; // Default format
  let proximityThreshold = parseInt(proximitySlider.value); // Default threshold
  let showSwatches = true; // Default to showing swatches

  // Show current threshold value
  thresholdValueDisplay.textContent = proximityThreshold;

  // Function to convert RGB to HEX
  function rgbToHex(rgb) {
    // For rgb/rgba strings
    if (typeof rgb === "string") {
      const matches = rgb.match(/\d+/g);
      if (!matches || matches.length < 3) return rgb;

      const r = parseInt(matches[0]);
      const g = parseInt(matches[1]);
      const b = parseInt(matches[2]);

      return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    return rgb;
  }

  // Function to check if color is light or dark
  function isLightColor(hexColor) {
    let hex = hexColor;

    // Convert rgb to hex if needed
    if (hexColor.startsWith("rgb")) {
      hex = rgbToHex(hexColor);
    }

    // Remove # if present
    hex = hex.replace("#", "");

    // Convert 3-char hex to 6-char
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((char) => char + char)
        .join("");
    }

    // Calculate brightness
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128;
  }

  // Convert any color to HSL
  function colorToHsl(color) {
    // Create a temporary element
    const tempEl = document.createElement("div");
    tempEl.style.color = color;
    document.body.appendChild(tempEl);

    // Get computed style (RGB)
    const computedColor = getComputedStyle(tempEl).color;
    document.body.removeChild(tempEl);

    // Extract RGB values
    const rgbMatch =
      computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/) ||
      computedColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)/);

    if (!rgbMatch) return { h: 0, s: 0, l: 0 };

    const r = parseInt(rgbMatch[1], 10) / 255;
    const g = parseInt(rgbMatch[2], 10) / 255;
    const b = parseInt(rgbMatch[3], 10) / 255;
    const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1;

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

    return { h: h * 360, s: s * 100, l: l * 100, a };
  }

  // Convert any color to RGB object
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

    if (!rgbMatch) return { r: 0, g: 0, b: 0, a: 1 };

    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
      a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
    };
  }

  // Format color as HEX
  function formatAsHex(color) {
    // If already HEX, return as is
    if (color.startsWith("#")) return color;
    return rgbToHex(color);
  }

  // Format color as RGB/RGBA
  function formatAsRgb(color) {
    // If already RGB/RGBA, return as is
    if (color.startsWith("rgb")) return color;

    const rgb = colorToRgb(color);
    if (rgb.a < 1) {
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a.toFixed(2)})`;
    } else {
      return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    }
  }

  // Format color as HSL/HSLA
  function formatAsHsl(color) {
    const hsl = colorToHsl(color);
    if (hsl.a < 1) {
      return `hsla(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(
        hsl.l
      )}%, ${hsl.a.toFixed(2)})`;
    } else {
      return `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(
        hsl.l
      )}%)`;
    }
  }

  // Format color based on current selected format
  function formatColorByCurrentFormat(color) {
    switch (currentFormat) {
      case "hex":
        return formatAsHex(color);
      case "rgb":
        return formatAsRgb(color);
      case "hsl":
        return formatAsHsl(color);
      default:
        return color;
    }
  }

  // Group colors into palettes
  function groupColorsIntoPalettes(colors) {
    // Convert colors to objects with HSL values
    const colorObjects = colors.map((color) => ({
      value: color,
      hsl: colorToHsl(color),
    }));

    // Sort all colors first by hue
    colorObjects.sort((a, b) => a.hsl.h - b.hsl.h);

    // Group colors into palettes (colors with similar hue)
    const palettes = [];
    let currentPalette = [];
    let prevHue = -1;

    for (const color of colorObjects) {
      if (prevHue === -1 || Math.abs(color.hsl.h - prevHue) < 30) {
        // Same palette (similar hue)
        currentPalette.push(color);
      } else {
        // Start a new palette
        if (currentPalette.length > 0) {
          palettes.push(currentPalette);
        }
        currentPalette = [color];
      }

      prevHue = color.hsl.h;
    }

    // Add the last palette
    if (currentPalette.length > 0) {
      palettes.push(currentPalette);
    }

    return palettes;
  }

  // Display colors in a simple list (not grouped)
  function displaySimpleList(colors) {
    colorsContainer.innerHTML = "";

    // Convert colors to objects with HSL values for sorting
    const colorObjects = colors.map((color) => ({
      value: color,
      hsl: colorToHsl(color),
    }));

    // Sort by hue, then lightness
    colorObjects.sort((a, b) => {
      if (Math.abs(a.hsl.h - b.hsl.h) > 10) {
        return a.hsl.h - b.hsl.h;
      }
      return a.hsl.l - b.hsl.l;
    });

    // Create a single container for all colors
    const container = document.createElement("div");
    container.className = "palette-container";

    // Add all colors to the container
    colorObjects.forEach((colorObj) => {
      const color = colorObj.value;
      const colorItem = createColorItem(color);
      container.appendChild(colorItem);
    });

    colorsContainer.appendChild(container);
  }

  // Generate color swatch with variations from 50 to 900
  function generateColorSwatch(baseColor) {
    // Convert to RGB for easier manipulation
    const rgb = colorToRgb(baseColor);
    const hsl = colorToHsl(baseColor);

    // Create variants container
    const swatchContainer = document.createElement("div");
    swatchContainer.className = "swatch-container";

    // Define shade levels
    const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

    // Generate shades by adjusting lightness
    shades.forEach((shade) => {
      // Calculate lightness based on shade
      // 500 is the base shade, lower numbers are lighter, higher are darker
      let newLightness;
      if (shade < 500) {
        // Lighter shades - interpolate from base to 95%
        newLightness = hsl.l + ((95 - hsl.l) * (500 - shade)) / 450;
      } else {
        // Darker shades - interpolate from base to 15%
        newLightness = hsl.l - ((hsl.l - 15) * (shade - 500)) / 400;
      }

      // Ensure lightness is in 0-100 range
      newLightness = Math.max(5, Math.min(98, newLightness));

      // Also adjust saturation slightly (more saturation for middle tones)
      let newSaturation = hsl.s;
      if (shade !== 500) {
        // Increase saturation for middle tones (300-700)
        if (shade >= 300 && shade <= 700) {
          newSaturation = Math.min(100, hsl.s * 1.1);
        } else {
          // Decrease saturation for extreme tones
          newSaturation = Math.max(0, hsl.s * 0.9);
        }
      }

      // Create shade element
      const shadeEl = document.createElement("div");
      shadeEl.className = "color-shade";

      // Mark the base color (or closest to it)
      if (shade === 500) {
        shadeEl.classList.add("base-shade");
      }

      shadeEl.style.backgroundColor = `hsl(${Math.round(hsl.h)}, ${Math.round(
        newSaturation
      )}%, ${Math.round(newLightness)}%)`;

      // Add color code
      const shadeHex = formatAsHex(
        `hsl(${Math.round(hsl.h)}, ${Math.round(newSaturation)}%, ${Math.round(
          newLightness
        )}%)`
      );

      // Add data attributes
      shadeEl.dataset.shade = shade;
      shadeEl.dataset.color = shadeHex;

      // Add label with shade level
      const label = document.createElement("div");
      label.className = "shade-label";
      label.textContent = shade;
      label.style.color = newLightness > 60 ? "#333" : "#fff";

      // Add hex code (hidden by default, shown on hover)
      const hexCode = document.createElement("div");
      hexCode.className = "shade-hex";
      hexCode.textContent = shadeHex;

      shadeEl.appendChild(label);
      shadeEl.appendChild(hexCode);

      // Add click event to copy the color
      shadeEl.addEventListener("click", (e) => {
        e.stopPropagation(); // Prevent triggering parent's click event
        navigator.clipboard.writeText(shadeHex).then(() => {
          showCopyMessage(`${shadeHex} copied!`);
        });
      });

      swatchContainer.appendChild(shadeEl);
    });

    return swatchContainer;
  }

  // Create a color item element
  function createColorItem(color) {
    const colorItem = document.createElement("div");
    colorItem.className = "color-item";
    colorItem.dataset.originalColor = color; // Store original color value

    const colorBox = document.createElement("div");
    colorBox.className = "color-box";
    colorBox.style.backgroundColor = color;

    const colorValue = document.createElement("div");
    colorValue.className = "color-value";

    // Display the color in the currently selected format
    const formattedColor = formatColorByCurrentFormat(color);
    colorValue.textContent = formattedColor;

    // Set text color based on background color
    const isLight = isLightColor(color);
    colorValue.style.color = isLight ? "#333" : "#fff";

    // If the color is semi-transparent, add a light background to the text
    if (
      color.startsWith("rgba") &&
      !color.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[01](\.0*)?\s*\)/)
    ) {
      colorValue.style.backgroundColor = isLight
        ? "rgba(0, 0, 0, 0.1)"
        : "rgba(255, 255, 255, 0.2)";
    }

    // Place the color value inside the color box
    colorBox.appendChild(colorValue);
    colorItem.appendChild(colorBox);

    // Add swatch if enabled
    if (showSwatches) {
      const swatch = generateColorSwatch(color);
      colorItem.appendChild(swatch);
    }

    // Copy color value when clicked
    colorItem.addEventListener("click", () => {
      // Copy the formatted color value
      navigator.clipboard.writeText(formattedColor).then(() => {
        const originalText = colorValue.textContent;
        colorValue.textContent = "Copied!";
        setTimeout(() => {
          colorValue.textContent = originalText;
        }, 1000);
      });
    });

    return colorItem;
  }

  // Display extracted colors grouped in palettes
  function displayGroupedColors(colors) {
    colorsContainer.innerHTML = "";

    if (colors.length === 0) {
      return;
    }

    // Group colors into palettes
    const palettes = groupColorsIntoPalettes(colors);

    // Create sections for each palette
    palettes.forEach((palette, paletteIndex) => {
      // Create a palette container
      const paletteContainer = document.createElement("div");
      paletteContainer.className = "palette-container";

      // Create color items within this palette
      palette.forEach((colorObj) => {
        const colorItem = createColorItem(colorObj.value);
        paletteContainer.appendChild(colorItem);
      });

      // Add a separator between palettes (if not the last one)
      if (paletteIndex < palettes.length - 1) {
        const separator = document.createElement("div");
        separator.className = "palette-separator";
        paletteContainer.appendChild(separator);
      }

      colorsContainer.appendChild(paletteContainer);
    });
  }

  // Display colors (always grouped now)
  function displayColors(colors) {
    if (colors.length === 0) {
      loadingElement.style.display = "none";
      noColorsElement.style.display = "block";
      return;
    }

    loadingElement.style.display = "none";
    noColorsElement.style.display = "none";

    // Always use grouped display now
    displayGroupedColors(colors);
  }

  // Update color display when format changes
  function updateColorDisplay() {
    // Redisplay colors with the new format
    displayColors(colors);
  }

  // Show message in the copy message div
  function showCopyMessage(text = "Copied!") {
    copyMessage.textContent = text;
    copyMessage.classList.add("show");
    setTimeout(() => {
      copyMessage.classList.remove("show");
    }, 2000);
  }

  // Extract colors from the current tab
  function extractColorsFromCurrentTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];

      if (currentTab) {
        chrome.scripting.executeScript(
          {
            target: { tabId: currentTab.id },
            files: ["content-script.js"],
          },
          () => {
            // Now send a message to the content script
            chrome.tabs.sendMessage(
              currentTab.id,
              { action: "extractColors", threshold: proximityThreshold },
              (response) => {
                if (chrome.runtime.lastError) {
                  console.error(chrome.runtime.lastError);
                  loadingElement.textContent =
                    "Error: Cannot extract colors from this page.";
                  return;
                }

                if (response && response.colors) {
                  colors = response.colors;
                  displayColors(colors);
                } else {
                  loadingElement.style.display = "none";
                  noColorsElement.style.display = "block";
                }
              }
            );
          }
        );
      }
    });
  }

  // Handle tab button clicks
  tabButtons.forEach((tabButton) => {
    tabButton.addEventListener("click", () => {
      // Update active tab styling
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      tabButton.classList.add("active");

      // Set current format
      currentFormat = tabButton.dataset.format;

      // Update color display
      updateColorDisplay();
    });
  });

  // Handle proximity slider changes
  proximitySlider.addEventListener("input", () => {
    // Update the displayed value
    proximityThreshold = parseInt(proximitySlider.value);
    thresholdValueDisplay.textContent = proximityThreshold;
  });

  // Re-extract colors when the slider is released
  proximitySlider.addEventListener("change", () => {
    // Show loading again
    loadingElement.style.display = "block";
    colorsContainer.innerHTML = "";

    // Extract colors with new threshold
    extractColorsFromCurrentTab();
  });

  // Copy all colors to clipboard in the selected format
  copyAllButton.addEventListener("click", () => {
    if (colors.length === 0) return;

    // Format all colors based on current format
    const formattedColors = colors.map(formatColorByCurrentFormat);
    navigator.clipboard.writeText(formattedColors.join("\n")).then(() => {
      showCopyMessage(`Colors copied as ${currentFormat.toUpperCase()}!`);
    });
  });

  // Handle swatch toggle switch changes - simplified approach
  document
    .querySelector(".swatch-toggle .switch")
    .addEventListener("click", function (e) {
      // Toggle the checkbox state
      swatchToggle.checked = !swatchToggle.checked;

      // Update our state
      showSwatches = swatchToggle.checked;

      // Update the UI
      updateColorDisplay();

      // Prevent default handling to avoid double toggling
      e.preventDefault();
      e.stopPropagation();
    });

  // Add a click handler to the label for better UX
  document
    .querySelector(".swatch-toggle label")
    .addEventListener("click", function (e) {
      // Toggle the checkbox state directly
      swatchToggle.checked = !swatchToggle.checked;

      // Update our state
      showSwatches = swatchToggle.checked;

      // Update the UI
      updateColorDisplay();

      // Prevent default to avoid double toggling
      e.preventDefault();
    });

  // Initialize the toggle state based on the default value
  swatchToggle.checked = showSwatches;

  // Start the extraction process
  extractColorsFromCurrentTab();
});
