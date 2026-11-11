# Motion control

Rules mode only, on touch devices with an orientation sensor (needs HTTPS). Off by default.

## Using it

- Tap **Motion** to turn it on (iOS asks for permission first). The button turns green.
- The phone *is* the card: hold it upright and turn it a quarter, like a steering wheel, and the card turns a quarter in the world. The picture on screen does not move.
- The phone's rotation lock must be on; if the page rotates, the game says "Turn on your phone's rotation lock."
- A turn counts once the phone is within 30° of the next quarter, so holding it near 45° does not flicker.

## Which spin turns

- Standing on a spin: the card turns with the phone.
- Not on a spin, exactly one spin in reach: the player is walked onto it, then the card turns.
- No spin in reach, or several: nothing turns, spots stop glowing, and the game says "You can only turn the card on a spin. Turn the phone back." until the phone is back where it was.

## North arrow

While Motion is on, a black disc in the bottom-right corner shows a red arrow and an **N** pointing to world up, following the phone's turn continuously. Doors open when their arrow points the same way.

## Turning it off

Tap **Motion** again, or switch to free play. The phone's current turn is handed to the picture, so the game state does not change. With no sensor data within 1.5s, Motion turns itself off: "No motion sensor found (it needs a phone and HTTPS)."
