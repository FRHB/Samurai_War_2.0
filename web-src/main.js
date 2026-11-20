import { bootstrapGame } from "./ui/uiController.js";

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", bootstrapGame, { once: true });
} else {
  bootstrapGame();
}
