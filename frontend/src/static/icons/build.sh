#!/usr/bin/env bash
set +eu
npx @svgr/cli --icon 1em . --out-dir .
sed -i '' 's/import \* as React from "react"/import h from "hyperapp-jsx-pragma"/' *.js
