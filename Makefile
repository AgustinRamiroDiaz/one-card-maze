.PHONY: check validate test winnable e2e hooks

check: validate test

# Schema and flip-pairing checks for every maze.json.
validate:
	node tools/validate.js

# Rules-engine self-test against the hand-solved MAZERULES card.
test:
	node tools/solve.js --self-test

# Every playable card must be winnable from each of its start positions.
winnable:
	node tools/solve.js

# Browser tests of guided play: desktop Chromium and Firefox, Pixel 7 and iPhone 13 emulation (first run: npm install && npx playwright install chromium firefox webkit).
e2e:
	npx playwright test

hooks:
	pre-commit install
