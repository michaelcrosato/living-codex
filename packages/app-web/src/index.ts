// Nominal package entry (the `main`/`exports` target). The app's real composition root — wiring
// render + narrative + loader + persistence + the fixed-timestep loop — lives in `main.ts`, loaded by
// `index.html`. Nothing imports this module; it exists only to satisfy the package entry field.
export {};
