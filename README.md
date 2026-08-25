# interior3d

Interactive **3D interior constructor** in the browser. Pick a room, arrange
furniture, lighting and openings, and share the result as a compressed link.

🔗 **Live demo:** https://sigurt33.github.io/interior3d/

## Features

- **4 room types** — kitchen, bathroom, bedroom, kids' room.
- **Real-time 3D** scene with Three.js — orbit, edit furniture, lights and wall openings.
- **Shareable links** — the whole scene is serialized and compressed (lz-string)
  into the URL, so a project opens on any device without a backend.
- **Fully static SPA** — no server, deploys straight to GitHub Pages.
- **Typed & tested** — TypeScript throughout, 80+ Vitest tests.

## Tech stack

TypeScript · Three.js · Vite · Vitest · lz-string

## Development

```bash
npm install
npm run dev      # local dev server (Vite)
npm run build    # type-check + production build
npm test         # run the test suite (Vitest)
```

## License

MIT
