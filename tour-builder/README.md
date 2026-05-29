# 360 Tour Builder (local)

A local-only web app to build equirectangular 360° virtual tours: upload panoramas, place navigation hotspots, configure slow auto-rotate and intro animations, preview the draft, and publish a read-only public view. Editing always works on the **draft**; visitors see the last **published snapshot** until you re-publish.

## Requirements

- Node.js 20+
- Windows/macOS/Linux

## Quick start

```bash
cd tour-builder
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Share on your local network

```bash
npm run dev:lan
```

Others on the same Wi‑Fi can open `http://<your-pc-ip>:3000`. Published tours: `http://<your-pc-ip>:3000/v/<tour-id>`.

## Workflow

1. **Home** — Create a new tour.
2. **Editor** (`/tours/<id>/edit`) — Add scenes, upload 360° images (must be **2:1** equirectangular JPEG/PNG/WebP).
3. **Scene settings** — Set default view from camera, auto-rotate speed, optional intro animation (set intro start view + duration).
4. **Hotspots** — Choose target scene, enable “Add hotspot”, click the panorama where the link should appear.
5. **Preview draft** — Full-screen navigation using draft data.
6. **Publish** — Freezes current draft into `published_snapshot`. Public URL: `/v/<tour-id>`.
7. **Re-edit** — Change draft anytime; public view stays old until **Re-publish**.

## Data storage

All data lives under `tour-builder/data/` (gitignored):

| Path | Contents |
|------|----------|
| `data/tours.db` | SQLite: tours, scenes, hotspots, published JSON |
| `data/uploads/<tourId>/` | Panorama image files |

Back up the `data/` folder to preserve tours.

## API (local)

| Method | Path | Description |
|--------|------|-------------|
| GET/POST | `/api/tours` | List / create tours |
| GET/PATCH/DELETE | `/api/tours/[id]` | Draft bundle / update title / delete |
| POST | `/api/tours/[id]/publish` | Draft → published snapshot |
| GET | `/api/tours/[id]/published` | Published snapshot only |
| POST | `/api/scenes` | Create scene |
| PATCH/DELETE | `/api/scenes/[id]` | Update / delete scene |
| POST | `/api/hotspots` | Create hotspot |
| PATCH/DELETE | `/api/hotspots/[id]` | Update / delete hotspot |
| POST | `/api/upload` | Upload panorama (`sceneId`, `file`) |
| GET | `/api/uploads/[tourId]/[filename]` | Serve image |

## Production run

```bash
npm run build
npm start
```

## Troubleshooting

- **Upload rejected** — Image must be equirectangular with ~2:1 width:height (e.g. 4096×2048).
- **Publish failed** — At least one scene needs an uploaded image.
- **Public tour empty** — Tour was never published, or publish failed; use Re-publish from the editor.
- **better-sqlite3 build errors** — Install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) on Windows, then `npm rebuild better-sqlite3`.

## Tech

- Next.js 16, React 19, Tailwind CSS 4
- SQLite (`better-sqlite3`)
- [Photo Sphere Viewer 5](https://photo-sphere-viewer.js.org/) (core, markers, virtual tour, autorotate)
