.PHONY: dev check validate test winnable e2e demo hooks

PORT ?= 8000

# Serve the game locally at http://localhost:$(PORT), never cached, so edits show on reload.
dev:
	python3 tools/dev-server.py $(PORT)

check: validate test

# Schema and flip-pairing checks for every maze.json.
validate:
	node tools/validate.js

# Rules-engine self-test against the hand-solved MAZERULES card, and the motion-control maths.
test:
	node tools/solve.js --self-test
	node tools/motion-test.js

# Every playable card must be winnable from each of its start positions.
winnable:
	node tools/solve.js

# Browser tests of guided play: desktop Chromium and Firefox, Pixel 7 and iPhone 13 emulation (first run: npm install && npx playwright install chromium firefox webkit).
e2e:
	npx playwright test

# Demo videos (and a poster frame each) of every feature and the whole tutorial, desktop and phone, in
# demo/clips/<desktop|phone>/ (needs ffmpeg). Only the phone clips are committed.
demo:
	npx playwright test -c playwright.demo.config.js
	for f in demo/clips/*/*.webm; do ffmpeg -loglevel error -y -i "$$f" -c:v libx264 -crf 28 -pix_fmt yuv420p -movflags +faststart "$${f%.webm}.mp4"; done
	for f in demo/clips/*/*.mp4; do ffmpeg -loglevel error -y -ss "$$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$$f" | LC_ALL=C awk '{print $$1 * 0.6}')" -i "$$f" -frames:v 1 -vf scale=200:-1 -q:v 4 "$${f%.mp4}.jpg"; done

hooks:
	pre-commit install
