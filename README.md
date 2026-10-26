# english-review

A small mobile web app for shadowing practice and spaced-repetition review of English sentences.

- Records your voice, compares it with a reference clip (pitch contour, timing, word recognition) and shows where it differs.
- Schedules reviews with an achievement-weighted spaced-repetition algorithm; weak sentences come back sooner.
- Keeps all study data (sentences, clips, progress) in a **private** repository that the app reads with a personal token stored only on the device. This public repository contains the app shell only.

Single file, no build step. Serve `index.html` over HTTPS (GitHub Pages works) and open it on a phone.
