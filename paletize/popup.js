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

  // Display extracted colors
  function displayColors(colors) {
    colorsContainer.innerHTML = "";

    if (colors.length === 0) {
      loadingElement.style.display = "none";
      noColorsElement.style.display = "block";
      return;
    }

    loadingElement.style.display = "none";

    colors.forEach((color) => {
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
        !color.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[01](\.0*)?\s*\)/)
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

      colorsContainer.appendChild(colorItem);
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
