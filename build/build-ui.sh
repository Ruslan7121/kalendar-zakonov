#!/bin/bash
set -e
cd /workspace/gh-pages-20261112
(echo 'import React from "react";'; cat "$1") > src/app.tsx
./node_modules/.bin/esbuild src/main.tsx --bundle --minify --charset=utf8 --format=iife --jsx=automatic --alias:grok/canvas=./src/grok-canvas.tsx --define:process.env.NODE_ENV='"production"' --outfile=dist/app.js --log-level=warning
ls -la dist/app.js
