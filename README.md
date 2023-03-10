# DSTanks

2 player tank game based on 1st order differential equations.

[Edit on StackBlitz ⚡️](https://stackblitz.com/edit/github-98m8ts-s7u5ia)

![DETanks screenshot](https://user-images.githubusercontent.com/18632281/221597077-a401156e-9b5a-4d0d-95ba-cb469058967d.png)

For now: player 1 has been created. Arrow keys to move around, space to fire, right shift to reverse orientation of cannon.

To do:

- create player 2 (to make a 2 player game running on a single computer), with firing, collision detection.

- I don't intend the fire to be "continuous fire"... rather it should be "single shot" which goes a fixed distance and then "explodes" (so you can get killed or lose health if you're in the zone when it explodes... but a direct hit before it explodes will also count as a hit)

- Different levels = different background ODE's. Maybe display the actual DE in huge letters as a background...

- chalk effect for firing and chalk track for cannon balls.

- background = chalkboard? Or... "smeared out" vector field (i.e. "convoluted" vector field on a fixed background? See [https://en.wikipedia.org/wiki/Line_integral_convolution](https://en.wikipedia.org/wiki/Line_integral_convolution))

Possible future?

- upgrade to make it a 2 player game over network (proably use peer-to-peer architecture? peer.js)

- upgrade to allow for up to 4 players over network?
