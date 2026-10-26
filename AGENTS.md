<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the shared visual theme in `src/styles.css` and semantic component variants; this is the application's actual stylesheet, so do not create a parallel `src/index.css` theme.
- Keep notes in the existing persisted browser store with saved deck/question snapshots; this preserves their context after deck edits or deletion.
- Render note formulas through trust-disabled KaTeX and rasterize optional PDF note pages in the browser; this preserves Arabic shaping and formula rendering without changing existing deck PDF pages.
- Keep the note drawer inside the mounted quiz player and suppress quiz keyboard/swipe actions while it is open; existing quiz timers continue unchanged.
