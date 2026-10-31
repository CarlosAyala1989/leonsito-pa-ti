const pieces = [
  { id: "mane", name: "La melena", symbol: "✹", icon: "is-rose", target: { x: 103, y: 88 } },
  { id: "face", name: "La carita", symbol: "☺", icon: "", target: { x: 229, y: 104 } },
  { id: "muzzle", name: "El hocico", symbol: "♥", icon: "is-rose", target: { x: 170, y: 168 } },
  { id: "ears", name: "Las orejas", symbol: "⌒", icon: "is-brown", target: { x: 170, y: 39 } },
  { id: "body", name: "El cuerpo", symbol: "◉", icon: "", target: { x: 171, y: 240 } },
  { id: "paws", name: "Las patitas", symbol: "🐾", icon: "is-green", target: { x: 170, y: 330 } },
  { id: "tail", name: "La colita", symbol: "〰", icon: "is-brown", target: { x: 281, y: 278 } }
];
const board = document.getElementById("puzzle-board");
const grid = document.getElementById("pieces-grid");
const markers = document.getElementById("target-markers");
const count = document.getElementById("piece-count");
const progress = document.querySelector(".progress-track");
const progressFill = document.getElementById("progress-fill");
const hint = document.getElementById("board-hint");
const status = document.getElementById("game-status");
const victory = document.getElementById("victory-panel");
const dragPreview = document.getElementById("drag-preview");
let placed = new Set();
let selected = null;
let order = pieces.slice();
let activeDrag = null;

function shuffle(items) {
  const shuffled = items.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}
function announce(message) { status.textContent = message; }
function renderMarkers() {
  markers.replaceChildren();
  if (!selected) return;
  const piece = pieces.find((item) => item.id === selected);
  if (!piece) return;
  const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  ring.setAttribute("class", "drop-ring");
  ring.setAttribute("cx", piece.target.x);
  ring.setAttribute("cy", piece.target.y);
  ring.setAttribute("r", "21");
  ring.dataset.target = piece.id;
  markers.appendChild(ring);
}
function selectPiece(id) {
  if (placed.has(id)) return;
  selected = selected === id ? null : id;
  renderTray();
  renderMarkers();
  if (selected) {
    const piece = pieces.find((item) => item.id === selected);
    hint.textContent = "Busca el aro brillante para " + piece.name.toLowerCase();
    announce("Elegiste " + piece.name + ". Toca o arrastra la pieza hasta el aro brillante.");
  } else {
    hint.textContent = "Toca una pieza y busca su aro brillante";
    announce("Pieza deseleccionada.");
  }
}
function renderTray() {
  grid.replaceChildren();
  order.filter((piece) => !placed.has(piece.id)).forEach((piece) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "piece-button" + (selected === piece.id ? " is-selected" : "");
    button.dataset.piece = piece.id;
    button.setAttribute("aria-pressed", String(selected === piece.id));
    button.setAttribute("aria-label", piece.name + ". Toca para elegir o arrastra al aro brillante.");
    const icon = document.createElement("span");
    icon.className = "piece-icon " + piece.icon;
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = piece.symbol;
    const name = document.createElement("span");
    name.className = "piece-name";
    name.textContent = piece.name;
    const action = document.createElement("span");
    action.className = "piece-action";
    action.setAttribute("aria-hidden", "true");
    action.textContent = "↗";
    button.append(icon, name, action);
    button.addEventListener("pointerdown", onPointerDown);
    button.addEventListener("pointermove", onPointerMove);
    button.addEventListener("pointerup", onPointerUp);
    button.addEventListener("pointercancel", cancelDrag);
    button.addEventListener("click", (event) => { if (event.detail === 0) selectPiece(piece.id); });
    grid.appendChild(button);
  });
}
function updateProgress() {
  const amount = placed.size;
  count.textContent = amount + "/" + pieces.length;
  progress.setAttribute("aria-valuenow", String(amount));
  progressFill.style.width = ((amount / pieces.length) * 100) + "%";
}
function coordinatesFromEvent(event) {
  const rect = board.getBoundingClientRect();
  return { x: ((event.clientX - rect.left) / rect.width) * 340, y: ((event.clientY - rect.top) / rect.height) * 370 };
}
function isOverTarget(id, point) {
  const target = pieces.find((piece) => piece.id === id).target;
  return Math.hypot(point.x - target.x, point.y - target.y) <= 40;
}
function placePiece(id) {
  if (placed.has(id)) return;
  placed.add(id);
  selected = null;
  const art = document.querySelector('.placed-piece[data-piece="' + id + '"]');
  if (art) art.classList.add("is-visible");
  renderTray();
  renderMarkers();
  updateProgress();
  const piece = pieces.find((item) => item.id === id);
  hint.textContent = placed.size === pieces.length ? "¡El león quedó completito!" : piece.name + " encontró su lugar";
  announce(piece.name + " encontró su lugar. Llevas " + placed.size + " de " + pieces.length + " piezas.");
  if (placed.size === pieces.length) {
    victory.hidden = false;
    hint.textContent = "¡Mira quién apareció!";
    announce("Ahi ta tu leon. ¡Terminaste el rompecabezas!");
    victory.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}
function tryPlace(id, event) {
  const point = coordinatesFromEvent(event);
  if (isOverTarget(id, point)) { placePiece(id); return true; }
  selected = id;
  renderTray();
  renderMarkers();
  hint.textContent = "Acerca la pieza al aro que brilla";
  announce("Casi. Acerca " + pieces.find((item) => item.id === id).name.toLowerCase() + " al aro brillante.");
  return false;
}
function showDragPreview(id, x, y) {
  const piece = pieces.find((item) => item.id === id);
  dragPreview.textContent = piece.name;
  dragPreview.hidden = false;
  dragPreview.style.left = x + "px";
  dragPreview.style.top = y + "px";
}
function onPointerDown(event) {
  const button = event.currentTarget;
  const id = button.dataset.piece;
  if (placed.has(id) || event.button > 0) return;
  event.preventDefault();
  button.setPointerCapture(event.pointerId);
  activeDrag = { id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
}
function onPointerMove(event) {
  if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
  const distance = Math.hypot(event.clientX - activeDrag.startX, event.clientY - activeDrag.startY);
  if (distance > 7) activeDrag.moved = true;
  if (activeDrag.moved) showDragPreview(activeDrag.id, event.clientX, event.clientY);
}
function onPointerUp(event) {
  if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
  const drag = activeDrag;
  activeDrag = null;
  dragPreview.hidden = true;
  if (drag.moved) tryPlace(drag.id, event);
  else selectPiece(drag.id);
}
function cancelDrag(event) {
  if (activeDrag && activeDrag.pointerId === event.pointerId) { activeDrag = null; dragPreview.hidden = true; }
}
board.addEventListener("pointerup", (event) => { if (!activeDrag && selected) tryPlace(selected, event); });
document.getElementById("restart-button").addEventListener("click", resetGame);
document.getElementById("play-again-button").addEventListener("click", resetGame);
function resetGame() {
  placed = new Set();
  selected = null;
  order = shuffle(pieces);
  activeDrag = null;
  dragPreview.hidden = true;
  victory.hidden = true;
  document.querySelectorAll(".placed-piece").forEach((art) => art.classList.remove("is-visible"));
  hint.textContent = "Toca una pieza y busca su aro brillante";
  announce("Rompecabezas reiniciado. Elige una pieza para empezar.");
  renderTray();
  renderMarkers();
  updateProgress();
}
resetGame();
