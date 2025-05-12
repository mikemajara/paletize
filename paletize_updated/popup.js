document.addEventListener("DOMContentLoaded", () => {
  const colorsContainer = document.getElementById("colors-container");
  const loadingElement = document.getElementById("loading");
  const noColorsElement = document.getElementById("no-colors");
  const copyAllButton = document.getElementById("copy-all");
  const copyMessage = document.getElementById("copy-message");

  let colors = [];

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

    // Add the last palette if not empty
    if (currentPalette.length > 0) {
      palettes.push(currentPalette);
    }

    // Sort colors within each palette by lightness
    palettes.forEach((palette) => {
      palette.sort((a, b) => a.hsl.l - b.hsl.l);
    });

    return palettes;
  }

  // Display extracted colors
  function displayColors(colors) {
    colorsContainer.innerHTML = "";

    if (colors.length === 0) {
      loadingElement.style.display = "none";
      noColorsElement.style.display = "block";
      return;
    }

    loadingElement.style.display = "none";

    // Group colors into palettes
    const palettes = groupColorsIntoPalettes(colors);

    // Create sections for each palette
    palettes.forEach((palette, paletteIndex) => {
      // Create a palette container
      const paletteContainer = document.createElement("div");
      paletteContainer.className = "palette-container";

      // Create color items within this palette
      palette.forEach((colorObj) => {
        const color = colorObj.value;
        const colorItem = document.createElement("div");
        colorItem.className = "color-item";

        const colorBox = document.createElement("div");
        colorBox.className = "color-box";
        colorBox.style.backgroundColor = color;

        const colorValue = document.createElement("div");
        colorValue.className = "color-value";
        colorValue.textContent = color;

        // Set text color based on background color
        const isLight = isLightColor(color);
        if (
          color.startsWith("rgba") &&
          !color.match(
            /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[01](\.0*)?\s*\)/
          )
        ) {
          colorValue.style.color = "#333";
        } else {
          colorValue.style.color = isLight ? "#333" : "#fff";
        }

        colorItem.appendChild(colorBox);
        colorItem.appendChild(colorValue);

        // Copy color value when clicked
        colorItem.addEventListener("click", () => {
          navigator.clipboard.writeText(color).then(() => {
            colorValue.textContent = "Copied!";
            setTimeout(() => {
              colorValue.textContent = color;
            }, 1000);
          });
        });

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
              { action: "extractColors" },
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

  // Copy all colors to clipboard
  copyAllButton.addEventListener("click", () => {
    if (colors.length === 0) return;

    const colorText = colors.join("\n");
    navigator.clipboard.writeText(colorText).then(() => {
      copyMessage.style.display = "block";
      setTimeout(() => {
        copyMessage.style.display = "none";
      }, 2000);
    });
  });

  // Start the extraction process
  extractColorsFromCurrentTab();
});
