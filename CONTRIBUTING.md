# Contributing to MangaDock

Thanks for helping. MangaDock is free, ad-free and open source, and every kind of contribution counts: code, design, bug reports, testing on real phones, and ideas.

## Getting started

```bash
git clone https://github.com/satiricalguru/MangaDock.git
cd MangaDock
npm install
npm run dev      # http://localhost:3000
```

Before opening a pull request:

```bash
npm run lint     # type-check
npm run build
npm run test:e2e # optional, Playwright
```

## Good first contributions

- Test the homepage and reader on a real iPhone or Android phone and report anything that stutters or crashes.
- Add a reader setting (e.g. right-to-left paging for manga).
- Improve matching for titles that show "couldn't find this on MangaDex".
- Rebuild the catalog index (`node scripts/build-catalog.mjs`) and open a PR with the new numbers.
- Accessibility fixes: keyboard focus, contrast, screen-reader labels.

## Ground rules

- **No ads, paid features or tracking.** MangaDex's terms require this, and it's the point of the project.
- **Only open, legal sources.** Data comes from AniList, Jikan and MangaDex's public APIs. Don't add scrapers for piracy or aggregator sites.
- **Credit everyone.** Keep MangaDex and scanlation-group credits on every chapter.
- **Keep phones fast.** Animate with `transform` and `opacity`, avoid blur filters and long-running layers on small screens (see `components/Reveal.tsx`).
- Match the surrounding code style; small, focused pull requests are easiest to review.

## Reporting bugs

Open an issue with the page URL, your device and browser, what you expected, and what happened. A screenshot or screen recording helps a lot.

By contributing you agree that your work is released under the [MIT License](LICENSE).
