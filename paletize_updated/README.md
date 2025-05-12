# Paletize - Color Extraction Chrome Extension

Paletize is a Chrome extension that extracts all colors used on a webpage and displays them in a neat palette.

## Features

- Extracts colors from CSS stylesheets and computed styles
- Supports various color formats (HEX, RGB, RGBA, HSL, HSLA)
- Click on a color to copy it to clipboard
- Copy all colors at once
- Clean, modern UI

## Installation

Since this extension is not yet published on the Chrome Web Store, you'll need to install it manually:

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked" and select the folder containing the extension files
5. The extension icon should now appear in your Chrome toolbar

## Usage

1. Navigate to any website
2. Click on the Paletize extension icon in your toolbar
3. A popup will appear showing all colors used on the current page
4. Click on any color to copy its value to clipboard
5. Click "Copy All Colors" to copy all colors at once
6. Hover over color swatches to see them slightly enlarged

## How It Works

The extension extracts colors from:

- CSS stylesheets (including external ones when possible)
- Inline styles
- Computed styles for color-related properties

It collects colors in various formats and displays them in a grid, allowing you to easily copy and use them in your projects.

## License

MIT
