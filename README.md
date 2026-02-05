# A Little Cheer — For Megha

Open `index.html` in a web browser to show the page. The page includes:

- A personalized message from Sanu to Megha.
- A confetti animation and a simple built-in melody.

To run locally, double-click `index.html` or serve with a simple HTTP server:

```bash
# Python 3
python -m http.server 8000
# then open http://localhost:8000
```

GitHub Pages
-----------

This site is GitHub Pages friendly. To publish:

- Push this folder to a GitHub repository (root files like `index.html` should be at the repository root, or put them in `docs/` and enable Pages from `docs/`).
- In the repository Settings → Pages, select the branch and folder (`/ (root)` or `/docs`) and save.
- This project includes an empty `.nojekyll` file so GitHub Pages will serve files as-is.

Notes about filenames:
- Images should be placed in the `PICS/` directory (use names like `pic1.jpg`, `pic01.jpg`, etc.) or create a `PICS/pics.json` manifest listing image paths.
- `messages.txt` at the repository root will be loaded automatically to provide the supportive lines.


Want changes? Provide the exact message text, colors, or an audio file and I will update the site.
