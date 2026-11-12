#!/bin/bash
# Rebuild: src/app.tsx = src/canvas.tsx from branch bot/calendar-20261110-all-updates
set -e
esbuild src/main.tsx --bundle --minify --charset=utf8 --format=iife --jsx=automatic --alias:grok/canvas=./src/grok-canvas.tsx --define:process.env.NODE_ENV='"production"' --outfile=dist/app.js
