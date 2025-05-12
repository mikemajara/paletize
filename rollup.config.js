import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import terser from "@rollup/plugin-terser";
import html from "@rollup/plugin-html";
import copy from "rollup-plugin-copy";
import css from "rollup-plugin-css-only";
import { readFileSync } from "fs";

const production = !process.env.ROLLUP_WATCH;

export default [
  // Popup script
  {
    input: "popup.js",
    output: {
      file: "dist/popup.js",
      format: "iife",
      sourcemap: !production,
    },
    plugins: [
      resolve({
        browser: true,
      }),
      commonjs(),
      css({ output: "dist/popup.css" }),
      production && terser(),
      copy({
        targets: [
          { src: "manifest.json", dest: "dist" },
          { src: "images/*", dest: "dist/images" },
          { src: "popup.html", dest: "dist" },
          { src: "popup.css", dest: "dist" },
        ],
      }),
    ],
  },
  // Content script
  {
    input: "content-script.js",
    output: {
      file: "dist/content-script.js",
      format: "iife",
      sourcemap: !production,
    },
    plugins: [
      resolve({
        browser: true,
      }),
      commonjs(),
      production && terser(),
    ],
  },
];
