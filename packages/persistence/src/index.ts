// persistence — IndexedDB save/load + JSON export/import of the replay envelope (T-11).
export { saveGame, loadGame, deleteGame, listSlots } from "./store";
export { exportSave, importSave } from "./json";
