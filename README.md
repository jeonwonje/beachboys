# BeachBoy

**Lift the debris. Shake off the sand.**

A student-built module that collects debris from wet sand, where tractor sieves clog and workers still clear the beach by hand. Built on a Botsync Copernicus rover by Beach Boys Labs for CDE3301 / ASI-301 at the National University of Singapore.

**[Scroll through the machine in 3D](https://jeonwonje.github.io/beachboys/)**

![The BeachBoy 3D model on a beach at dawn](.github/hero.jpg)

## How it works

1. **Collect.** Hooked spokes on a mesh belt lift debris, along with the sand around it.
2. **Separate.** A half-drum rocks the load against its mesh, and the knocks free wet sand that gravity alone wouldn't.
3. **Store.** Sand lands on a tray and debris carries on into a bin. Both come off by hand.

## Where it stands

This is a proof of concept. In bench test 1 (19 Oct 2026, sandpit), 24 of 32 item and moisture combinations passed eventually, and 15 of 32 passed first try. The log doesn't define "pass", and the sand's moisture wasn't measured. The site's scorecard lists which requirements are partly met and which are still only targets.

## The site

The site is in [`web/`](web/): Vite and three.js, with no framework. Pushing to `main` deploys it to GitHub Pages.

```bash
cd web
npm install
npm run dev
```

## Team

| | |
|---|---|
| Jeon Wonje ([@jeonwonje](https://github.com/jeonwonje)) | Electronics, power, firmware |
| Kow Ming Yuan ([@Kmyming](https://github.com/Kmyming)) | Half-drum, tray, test lead |
| Chen Zhi Yi Gary ([@garychen177](https://github.com/garychen177)) | Half-drum, tray and bin |
| Ng Jing Jie Russell ([@Russell501](https://github.com/Russell501)) | Conveyor, carrier repair |
| Wang Yizhang ([@eggsacc](https://github.com/eggsacc)) | Conveyor, carrier repair |

Supervised by Nicholas Chew and Royston Shieh.

## Credits

The Copernicus carrier geometry comes from [botsync/copernicus](https://github.com/botsync/copernicus) (BSD-3-Clause). The carrier repair is documented in [eggsacc/copernicus-repair](https://github.com/eggsacc/copernicus-repair).

Never commit partner-confidential material to this public repo.
