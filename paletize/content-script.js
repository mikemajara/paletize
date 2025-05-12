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

  // Sort the colors by type and return as array
  const colors = Array.from(colorSet);

  // Filter out 'transparent', 'rgba(0, 0, 0, 0)', etc.
  const filteredColors = colors.filter((color) => {
    if (color === "transparent") return false;
    if (color.includes("rgba") && color.endsWith(", 0)")) return false;
    return true;
  });

  return filteredColors;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractColors") {
    sendResponse({ colors: extractColors() });
  }
});
