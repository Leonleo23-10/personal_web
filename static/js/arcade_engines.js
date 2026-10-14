/**
 * ============================================================================
 * MOTORES DEL ARCADE (CENTRADOS, TÁCTILES, DRAG & DROP Y SINCRONIZADOS CON SQL)
 * Archivo: static/js/arcade_engines.js
 * ============================================================================
 * - Sincroniza automáticamente los récords con SQLite (`/api/scores/<game_id>`)
 *   y mantiene respaldo en `localStorage` para modo offline.
 * - Muestra un modal flotante (`#game-overlay`) encima del tablero al terminar.
 * - Sudoku: Selector numérico flotante (`#sudoku-popover`) al tocar la celda.
 * - Solitario: Arrastre físico real (Pointer Drag & Drop) + Doble clic.
 * - Tetris, 2048 y Snake: Cero botones de flechas; control directo en el tablero.
 * ============================================================================
 */

const activeGame = document.body.dataset.activeGame;
const hudCurrentEl = document.getElementById('hud-current-val');
const hudBestEl = document.getElementById('hud-best-val');
const hudLabelEl = document.getElementById('current-stat-label');
const universalResetBtn = document.getElementById('universal-reset-btn');
const overlayEl = document.getElementById('game-overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-message');
const overlayBadge = document.getElementById('overlay-badge');
const overlayRestartBtn = document.getElementById('overlay-restart-btn');

let currentResetCallback = null;

/* ============================================================================
   GESTOR DE RÉCORDS (SQLITE + LOCALSTORAGE) Y MODAL OVERLAY
   ============================================================================ */
let bestScore = parseInt(localStorage.getItem(`best_${activeGame}`) || '0', 10);
if (hudBestEl) hudBestEl.textContent = bestScore;

async function syncScoreWithServer(newScore = null) {
    if (!activeGame) return;
    if (newScore !== null && newScore > bestScore) {
        bestScore = newScore;
        localStorage.setItem(`best_${activeGame}`, bestScore);
        if (hudBestEl) hudBestEl.textContent = bestScore;
    }
    try {
        const opts = newScore !== null
            ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ score: bestScore }) }
            : { method: 'GET' };
        const res = await fetch(`/api/scores/${activeGame}`, opts);
        if (res.ok) {
            const data = await res.json();
            if (data.best_score > bestScore) {
                bestScore = data.best_score;
                localStorage.setItem(`best_${activeGame}`, bestScore);
            }
            if (hudBestEl) hudBestEl.textContent = bestScore;
        }
    } catch (_) {
        // Modo offline: conserva el valor de localStorage sin lanzar error
    }
}
syncScoreWithServer();

function showGameOverlay(badgeText, titleText, messageText) {
    if (!overlayEl) return;
    overlayBadge.textContent = badgeText;
    overlayTitle.textContent = titleText;
    overlayMsg.textContent = messageText;
    overlayEl.hidden = false;
}

function hideGameOverlay() {
    if (overlayEl) overlayEl.hidden = true;
}

if (universalResetBtn) {
    universalResetBtn.addEventListener('click', () => {
        hideGameOverlay();
        if (currentResetCallback) currentResetCallback();
    });
}
if (overlayRestartBtn) {
    overlayRestartBtn.addEventListener('click', () => {
        hideGameOverlay();
        if (currentResetCallback) currentResetCallback();
    });
}

/**
 * Detector de Gestos Táctiles (Swipe + Tap) directo sobre el tablero
 */
function attachTouchSwipe(element, callbacks) {
    if (!element) return;
    let startX = 0, startY = 0, startTime = 0;

    element.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startTime = Date.now();
    }, { passive: true });

    element.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });

    element.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        const dt = Date.now() - startTime;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (absX < 16 && absY < 16 && dt < 250) {
            if (callbacks.onTap) callbacks.onTap();
            return;
        }
        if (Math.max(absX, absY) > 24) {
            if (absX > absY) {
                if (dx > 0 && callbacks.onRight) callbacks.onRight();
                else if (dx < 0 && callbacks.onLeft) callbacks.onLeft();
            } else {
                if (dy > 0 && callbacks.onDown) callbacks.onDown();
                else if (dy < 0 && callbacks.onUp) callbacks.onUp();
            }
        }
    }, { passive: true });
}


/* ============================================================================
   CARTUCHO 02: SUDOKU CON SELECTOR NUMÉRICO FLOTANTE (POPOVER)
   ============================================================================ */
if (activeGame === 'sudoku') {
    const boardEl = document.getElementById('sudoku-board');
    const popoverEl = document.getElementById('sudoku-popover');
    const popoverGrid = document.getElementById('popover-numbers');
    let solution = [], puzzle = [], userGrid = [], selectedIdx = null;

    if (hudLabelEl) hudLabelEl.textContent = 'RESTANTES';

    function updateRemainingCount() {
        const emptyCount = userGrid.filter(v => v === 0).length;
        if (hudCurrentEl) hudCurrentEl.textContent = `${emptyCount} celdas`;
    }

    function generateSudoku() {
        hideGameOverlay();
        popoverEl.hidden = true;
        const base = [
            1,2,3,4,5,6,7,8,9, 4,5,6,7,8,9,1,2,3, 7,8,9,1,2,3,4,5,6,
            2,3,4,5,6,7,8,9,1, 5,6,7,8,9,1,2,3,4, 8,9,1,2,3,4,5,6,7,
            3,4,5,6,7,8,9,1,2, 6,7,8,9,1,2,3,4,5, 9,1,2,3,4,5,6,7,8
        ];
        const digits = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
        solution = base.map(n => digits[n - 1]);
        puzzle = solution.map(n => (Math.random() < 0.48 ? 0 : n));
        userGrid = [...puzzle];
        selectedIdx = null;
        updateRemainingCount();
        renderSudoku();
    }

    function openPopoverNearCell(idx, cellEl) {
        selectedIdx = idx;
        highlightSudokuAxes(idx);

        if (puzzle[idx] !== 0) {
            popoverEl.hidden = true;
            return;
        }

        const stageBox = boardEl.parentElement.getBoundingClientRect();
        const cellRect = cellEl.getBoundingClientRect();

        popoverEl.hidden = false;
        const popW = popoverEl.offsetWidth || 168;
        const popH = popoverEl.offsetHeight || 168;

        let left = (cellRect.left - stageBox.left) + (cellRect.width / 2) - (popW / 2);
        let top = (cellRect.top - stageBox.top) - popH - 10;

        // Mantener siempre dentro de los bordes del tablero
        left = Math.max(6, Math.min(left, stageBox.width - popW - 6));
        if (top < 6) {
            top = (cellRect.bottom - stageBox.top) + 10;
        }

        popoverEl.style.left = `${left}px`;
        popoverEl.style.top = `${top}px`;
    }

    function highlightSudokuAxes(idx) {
        const cells = boardEl.querySelectorAll('.sudoku-cell');
        const selR = Math.floor(idx / 9), selC = idx % 9;
        const selBoxR = Math.floor(selR / 3), selBoxC = Math.floor(selC / 3);
        const selVal = userGrid[idx];

        cells.forEach((cell, i) => {
            const r = Math.floor(i / 9), c = i % 9;
            const sameAxis = (r === selR || c === selC || (Math.floor(r / 3) === selBoxR && Math.floor(c / 3) === selBoxC));
            const sameNumber = (selVal !== 0 && userGrid[i] === selVal);
            cell.classList.toggle('selected', i === idx);
            cell.classList.toggle('axis-highlight', i !== idx && sameAxis);
            cell.classList.toggle('same-num', i !== idx && sameNumber);
        });
    }

    function setCellValue(num) {
        if (selectedIdx === null || puzzle[selectedIdx] !== 0) return;
        userGrid[selectedIdx] = num;
        popoverEl.hidden = true;
        updateRemainingCount();
        renderSudoku();
        highlightSudokuAxes(selectedIdx);

        if (userGrid.every(v => v !== 0)) {
            checkSolution(true);
        }
    }

    function renderSudoku() {
        boardEl.innerHTML = '';
        userGrid.forEach((val, idx) => {
            const cell = document.createElement('button');
            cell.type = 'button';
            cell.className = 'sudoku-cell';
            const r = Math.floor(idx / 9), c = idx % 9;
            if (c === 2 || c === 5) cell.classList.add('border-right');
            if (r === 2 || r === 5) cell.classList.add('border-bottom');

            if (puzzle[idx] !== 0) {
                cell.textContent = val;
                cell.classList.add('fixed');
            } else if (val !== 0) {
                cell.textContent = val;
                cell.classList.add('user-input');
            }

            cell.addEventListener('click', (e) => {
                e.stopPropagation();
                openPopoverNearCell(idx, cell);
            });
            boardEl.appendChild(cell);
        });
    }

    function checkSolution(fromAuto = false) {
        const cells = boardEl.querySelectorAll('.sudoku-cell');
        let complete = true, errors = 0;
        cells.forEach((cell, i) => {
            cell.classList.remove('error-cell');
            if (userGrid[i] === 0) complete = false;
            else if (userGrid[i] !== solution[i]) {
                errors++;
                if (puzzle[i] === 0) cell.classList.add('error-cell');
            }
        });

        if (complete && errors === 0) {
            syncScoreWithServer(bestScore + 1);
            showGameOverlay('Sudoku Resuelto', '¡Tablero Perfecto!', 'Completaste todas las casillas sin un solo error.');
        } else if (errors > 0 && !fromAuto) {
            showGameOverlay('Revisión', `${errors} Casilla(s) con Error`, 'Las casillas incorrectas se marcaron en rojo sobre el tablero.');
        }
    }

    // Construir botones 1-9 + botón de borrar dentro del Popover flotante
    for (let n = 1; n <= 9; n++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'popover-num-btn';
        btn.textContent = n;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            setCellValue(n);
        });
        popoverGrid.appendChild(btn);
    }
    const eraseBtn = document.createElement('button');
    eraseBtn.type = 'button';
    eraseBtn.className = 'popover-num-btn erase-key';
    eraseBtn.textContent = 'Borrar';
    eraseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setCellValue(0);
    });
    popoverGrid.appendChild(eraseBtn);

    // Cerrar popover al tocar fuera
    document.addEventListener('click', () => {
        popoverEl.hidden = true;
    });

    window.addEventListener('keydown', (e) => {
        if (selectedIdx === null) return;
        if (e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            setCellValue(parseInt(e.key, 10));
        } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
            e.preventDefault();
            setCellValue(0);
        } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault();
            let r = Math.floor(selectedIdx / 9), c = selectedIdx % 9;
            if (e.key === 'ArrowUp') r = (r + 8) % 9;
            if (e.key === 'ArrowDown') r = (r + 1) % 9;
            if (e.key === 'ArrowLeft') c = (c + 8) % 9;
            if (e.key === 'ArrowRight') c = (c + 1) % 9;
            selectedIdx = r * 9 + c;
            popoverEl.hidden = true;
            highlightSudokuAxes(selectedIdx);
        }
    });

    const checkBtn = document.getElementById('sudoku-check');
    if (checkBtn) checkBtn.addEventListener('click', () => checkSolution(false));

    currentResetCallback = generateSudoku;
    generateSudoku();
}


/* ============================================================================
   CARTUCHO 03: SOLITARIO CON ARRASTRE FÍSICO REAL (POINTER DRAG & DROP)
   ============================================================================ */
if (activeGame === 'solitario') {
    const tableEl = document.getElementById('solitaire-table');
    const SUITS = [
        { s: '♠', color: 'dark' },
        { s: '♣', color: 'dark' },
        { s: '♥', color: 'red' },
        { s: '♦', color: 'red' }
    ];
    const LABELS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    let stock = [], waste = [], foundations = [[], [], [], []], tableau = [[], [], [], [], [], [], []];
    let movesCount = 0;

    if (hudLabelEl) hudLabelEl.textContent = 'MOVIMIENTOS';

    function initSolitaire() {
        hideGameOverlay();
        const deck = [];
        SUITS.forEach(suit => {
            for (let v = 1; v <= 13; v++) {
                deck.push({ v, s: suit.s, color: suit.color, up: false });
            }
        });
        deck.sort(() => Math.random() - 0.5);

        tableau = [[], [], [], [], [], [], []];
        for (let c = 0; c < 7; c++) {
            for (let r = 0; r <= c; r++) {
                const card = deck.pop();
                if (r === c) card.up = true;
                tableau[c].push(card);
            }
        }
        stock = deck;
        waste = [];
        foundations = [[], [], [], []];
        movesCount = 0;
        if (hudCurrentEl) hudCurrentEl.textContent = '0';
        renderSolitaire();
    }

    function addMove() {
        movesCount++;
        if (hudCurrentEl) hudCurrentEl.textContent = movesCount;
    }

    function canMoveToTableau(card, targetCol) {
        const pile = tableau[targetCol];
        if (pile.length === 0) return card.v === 13;
        const top = pile[pile.length - 1];
        return top.up && top.color !== card.color && top.v === card.v + 1;
    }

    function canMoveToFoundation(card, fIdx) {
        const pile = foundations[fIdx];
        if (pile.length === 0) return card.v === 1;
        const top = pile[pile.length - 1];
        return top.s === card.s && card.v === top.v + 1;
    }

    function executeMove(source, targetType, targetIdx) {
        if (source.from === 'waste') {
            if (waste.length === 0) return false;
            const card = waste[waste.length - 1];
            if (targetType === 'foundation' && canMoveToFoundation(card, targetIdx)) {
                foundations[targetIdx].push(waste.pop());
                addMove();
                renderSolitaire();
                checkSolitaireWin();
                return true;
            }
            if (targetType === 'tableau' && canMoveToTableau(card, targetIdx)) {
                tableau[targetIdx].push(waste.pop());
                addMove();
                renderSolitaire();
                return true;
            }
        } else if (source.from === 'tableau') {
            const srcPile = tableau[source.col];
            const movingCards = srcPile.slice(source.cardIdx);
            if (movingCards.length === 0) return false;

            if (targetType === 'foundation' && movingCards.length === 1) {
                if (canMoveToFoundation(movingCards[0], targetIdx)) {
                    foundations[targetIdx].push(srcPile.pop());
                    if (srcPile.length > 0) srcPile[srcPile.length - 1].up = true;
                    addMove();
                    renderSolitaire();
                    checkSolitaireWin();
                    return true;
                }
            }
            if (targetType === 'tableau' && source.col !== targetIdx) {
                if (canMoveToTableau(movingCards[0], targetIdx)) {
                    tableau[targetIdx].push(...movingCards);
                    tableau[source.col] = srcPile.slice(0, source.cardIdx);
                    if (tableau[source.col].length > 0) {
                        tableau[source.col][tableau[source.col].length - 1].up = true;
                    }
                    addMove();
                    renderSolitaire();
                    return true;
                }
            }
        }
        return false;
    }

    function autoMoveCard(source) {
        for (let f = 0; f < 4; f++) {
            if (executeMove(source, 'foundation', f)) return true;
        }
        for (let c = 0; c < 7; c++) {
            if (executeMove(source, 'tableau', c)) return true;
        }
        return false;
    }

    function checkSolitaireWin() {
        const total = foundations.reduce((acc, f) => acc + f.length, 0);
        if (total === 52) {
            syncScoreWithServer(bestScore + 1);
            showGameOverlay('Victoria', '¡Solitario Completado!', `Ordenaste las 52 cartas en ${movesCount} movimientos.`);
        }
    }

    // Sistema de Arrastre Físico (Pointer Drag & Drop para Dedo y Mouse)
    function makeDraggable(cardEl, sourceData) {
        let dragGhost = null;
        let startX = 0, startY = 0;
        let isDragging = false;
        let lastTap = 0;

        cardEl.addEventListener('pointerdown', (e) => {
            if (e.button && e.button !== 0) return;
            e.stopPropagation();
            startX = e.clientX;
            startY = e.clientY;
            isDragging = false;
            cardEl.setPointerCapture(e.pointerId);

            const onPointerMove = (moveEvent) => {
                const dx = moveEvent.clientX - startX;
                const dy = moveEvent.clientY - startY;

                if (!isDragging && Math.hypot(dx, dy) > 8) {
                    isDragging = true;
                    dragGhost = cardEl.cloneNode(true);
                    dragGhost.className = cardEl.className + ' dragging-card-ghost';
                    dragGhost.style.width = `${cardEl.offsetWidth}px`;
                    dragGhost.style.height = `${cardEl.offsetHeight}px`;
                    document.body.appendChild(dragGhost);
                    cardEl.style.opacity = '0.35';
                }

                if (isDragging && dragGhost) {
                    dragGhost.style.left = `${moveEvent.clientX - dragGhost.offsetWidth / 2}px`;
                    dragGhost.style.top = `${moveEvent.clientY - 24}px`;
                }
            };

            const onPointerUp = (upEvent) => {
                cardEl.removeEventListener('pointermove', onPointerMove);
                cardEl.removeEventListener('pointerup', onPointerUp);
                cardEl.removeEventListener('pointercancel', onPointerUp);
                cardEl.style.opacity = '1';

                if (isDragging) {
                    if (dragGhost) {
                        dragGhost.remove();
                        dragGhost = null;
                    }
                    const dropTarget = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
                    if (dropTarget) {
                        const fSlot = dropTarget.closest('[data-drop-foundation]');
                        const tSlot = dropTarget.closest('[data-drop-tableau]');
                        if (fSlot) {
                            executeMove(sourceData, 'foundation', parseInt(fSlot.dataset.dropFoundation, 10));
                        } else if (tSlot) {
                            executeMove(sourceData, 'tableau', parseInt(tSlot.dataset.dropTableau, 10));
                        }
                    }
                } else {
                    // Toque simple o doble toque: mueve automáticamente la carta a su lugar válido
                    const now = Date.now();
                    if (now - lastTap < 350) {
                        autoMoveCard(sourceData);
                    } else {
                        autoMoveCard(sourceData);
                    }
                    lastTap = now;
                }
            };

            cardEl.addEventListener('pointermove', onPointerMove);
            cardEl.addEventListener('pointerup', onPointerUp);
            cardEl.addEventListener('pointercancel', onPointerUp);
        });
    }

    function renderSolitaire() {
        tableEl.innerHTML = '';

        const topRow = document.createElement('div');
        topRow.className = 'sol-top-row';

        // Mazo
        const stockEl = document.createElement('div');
        stockEl.className = 'sol-slot sol-stock';
        stockEl.innerHTML = stock.length > 0
            ? `<div class="sol-deck-count">${stock.length}</div><span>Mazo</span>`
            : `<span>↻</span>`;
        stockEl.addEventListener('click', () => {
            if (stock.length > 0) {
                const c = stock.pop();
                c.up = true;
                waste.push(c);
            } else {
                stock = waste.reverse().map(c => ({ ...c, up: false }));
                waste = [];
            }
            renderSolitaire();
        });
        topRow.appendChild(stockEl);

        // Descarte
        const wasteEl = document.createElement('div');
        wasteEl.className = 'sol-slot';
        if (waste.length > 0) {
            const top = waste[waste.length - 1];
            const cardEl = createCardDOM(top);
            makeDraggable(cardEl, { from: 'waste' });
            wasteEl.appendChild(cardEl);
        }
        topRow.appendChild(wasteEl);

        const spacer = document.createElement('div');
        spacer.className = 'sol-spacer';
        topRow.appendChild(spacer);

        // 4 Bases (Drop zones)
        const suitIcons = ['♠', '♣', '♥', '♦'];
        foundations.forEach((pile, fIdx) => {
            const fEl = document.createElement('div');
            fEl.className = 'sol-slot sol-foundation';
            fEl.dataset.dropFoundation = fIdx;
            if (pile.length > 0) {
                fEl.appendChild(createCardDOM(pile[pile.length - 1]));
            } else {
                fEl.textContent = suitIcons[fIdx];
            }
            topRow.appendChild(fEl);
        });
        tableEl.appendChild(topRow);

        // 7 Columnas (Drop zones)
        const colsRow = document.createElement('div');
        colsRow.className = 'sol-cols-row';
        tableau.forEach((pile, cIdx) => {
            const colEl = document.createElement('div');
            colEl.className = 'sol-col';
            colEl.dataset.dropTableau = cIdx;

            if (pile.length === 0) {
                const emptySlot = document.createElement('div');
                emptySlot.className = 'sol-slot';
                emptySlot.textContent = 'K';
                colEl.appendChild(emptySlot);
            }

            pile.forEach((card, cardIdx) => {
                const cardDOM = createCardDOM(card);
                if (cardIdx > 0) {
                    cardDOM.style.marginTop = card.up ? '-46px' : '-58px';
                }
                if (card.up) {
                    makeDraggable(cardDOM, { from: 'tableau', col: cIdx, cardIdx });
                } else if (cardIdx === pile.length - 1) {
                    cardDOM.addEventListener('click', () => {
                        card.up = true;
                        renderSolitaire();
                    });
                }
                colEl.appendChild(cardDOM);
            });
            colsRow.appendChild(colEl);
        });
        tableEl.appendChild(colsRow);
    }

    function createCardDOM(card) {
        const div = document.createElement('div');
        div.className = `sol-card ${card.up ? card.color : 'down'}`;
        if (card.up) {
            div.innerHTML = `
                <div class="sol-card-corner">${LABELS[card.v]}<span>${card.s}</span></div>
                <div class="sol-card-center">${card.s}</div>
            `;
        } else {
            div.innerHTML = `<div class="sol-card-back">leo.</div>`;
        }
        return div;
    }

    currentResetCallback = initSolitaire;
    initSolitaire();
}


/* ============================================================================
   CARTUCHO 04: TETRIS CENTRADO SIN BOTONES DE FLECHAS
   ============================================================================ */
if (activeGame === 'tetris') {
    const canvas = document.getElementById('tetris-canvas');
    const ctx = canvas.getContext('2d');
    const COLS = 10, ROWS = 20, BLOCK = 30;

    if (hudLabelEl) hudLabelEl.textContent = 'PUNTOS';

    const PIECES = [
        { shape: [[1,1,1,1]], color: '#dad7cd' },
        { shape: [[1,1],[1,1]], color: '#a3b18a' },
        { shape: [[0,1,0],[1,1,1]], color: '#7ea172' },
        { shape: [[1,0,0],[1,1,1]], color: '#588157' },
        { shape: [[0,0,1],[1,1,1]], color: '#b5c29e' },
        { shape: [[0,1,1],[1,1,0]], color: '#8fb388' },
        { shape: [[1,1,0],[0,1,1]], color: '#c4bfa8' }
    ];

    let grid = [], piece = null, score = 0, timer = null, isGameOver = false;

    function resetTetris() {
        hideGameOverlay();
        grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
        score = 0;
        isGameOver = false;
        if (hudCurrentEl) hudCurrentEl.textContent = '0';
        spawnPiece();
        if (timer) clearInterval(timer);
        timer = setInterval(stepDown, 460);
        drawTetris();
    }

    function spawnPiece() {
        const tpl = PIECES[Math.floor(Math.random() * PIECES.length)];
        piece = {
            shape: tpl.shape.map(r => [...r]),
            color: tpl.color,
            x: Math.floor((COLS - tpl.shape[0].length) / 2),
            y: 0
        };
        if (collides(piece.shape, piece.x, piece.y)) {
            isGameOver = true;
            clearInterval(timer);
            syncScoreWithServer(score);
            showGameOverlay('Fin del Juego', `${score} Puntos`, 'El tablero llegó al límite superior.');
        }
    }

    function collides(mat, ox, oy) {
        for (let r = 0; r < mat.length; r++) {
            for (let c = 0; c < mat[r].length; c++) {
                if (!mat[r][c]) continue;
                const nx = ox + c, ny = oy + r;
                if (nx < 0 || nx >= COLS || ny >= ROWS || (ny >= 0 && grid[ny][nx])) return true;
            }
        }
        return false;
    }

    function getGhostY() {
        let gy = piece.y;
        while (!collides(piece.shape, piece.x, gy + 1)) gy++;
        return gy;
    }

    function mergePiece() {
        piece.shape.forEach((row, r) => {
            row.forEach((val, c) => {
                if (val && piece.y + r >= 0) grid[piece.y + r][piece.x + c] = piece.color;
            });
        });
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
            if (grid[r].every(v => v !== null)) {
                grid.splice(r, 1);
                grid.unshift(Array(COLS).fill(null));
                cleared++;
                r++;
            }
        }
        if (cleared > 0) {
            score += cleared * cleared * 100;
            if (hudCurrentEl) hudCurrentEl.textContent = score;
            syncScoreWithServer(score);
        }
        spawnPiece();
    }

    function stepDown() {
        if (isGameOver) return;
        if (!collides(piece.shape, piece.x, piece.y + 1)) piece.y++;
        else mergePiece();
        drawTetris();
    }

    function rotatePiece() {
        const rotated = piece.shape[0].map((_, i) => piece.shape.map(row => row[i]).reverse());
        if (!collides(rotated, piece.x, piece.y)) piece.shape = rotated;
        else if (!collides(rotated, piece.x - 1, piece.y)) { piece.x--; piece.shape = rotated; }
        else if (!collides(rotated, piece.x + 1, piece.y)) { piece.x++; piece.shape = rotated; }
        drawTetris();
    }

    function drawBlock(x, y, color, isGhost = false) {
        if (isGhost) {
            ctx.strokeStyle = 'rgba(218, 215, 205, 0.35)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x * BLOCK + 2, y * BLOCK + 2, BLOCK - 4, BLOCK - 4);
        } else {
            ctx.fillStyle = color;
            ctx.fillRect(x * BLOCK + 1, y * BLOCK + 1, BLOCK - 2, BLOCK - 2);
        }
    }

    function drawTetris() {
        ctx.fillStyle = '#25392f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(163, 177, 138, 0.08)';
        for (let c = 1; c < COLS; c++) {
            ctx.beginPath(); ctx.moveTo(c * BLOCK, 0); ctx.lineTo(c * BLOCK, canvas.height); ctx.stroke();
        }
        for (let r = 1; r < ROWS; r++) {
            ctx.beginPath(); ctx.moveTo(0, r * BLOCK); ctx.lineTo(canvas.width, r * BLOCK); ctx.stroke();
        }

        grid.forEach((row, r) => row.forEach((color, c) => { if (color) drawBlock(c, r, color); }));

        if (piece && !isGameOver) {
            const ghostY = getGhostY();
            piece.shape.forEach((row, r) => row.forEach((val, c) => {
                if (val) drawBlock(piece.x + c, ghostY + r, piece.color, true);
            }));
            piece.shape.forEach((row, r) => row.forEach((val, c) => {
                if (val) drawBlock(piece.x + c, piece.y + r, piece.color, false);
            }));
        }
    }

    function handleAction(act) {
        if (!piece || isGameOver) return;
        if (act === 'left' && !collides(piece.shape, piece.x - 1, piece.y)) piece.x--;
        if (act === 'right' && !collides(piece.shape, piece.x + 1, piece.y)) piece.x++;
        if (act === 'down') stepDown();
        if (act === 'rotate') rotatePiece();
        if (act === 'drop') {
            piece.y = getGhostY();
            mergePiece();
        }
        drawTetris();
    }

    attachTouchSwipe(canvas, {
        onLeft: () => handleAction('left'),
        onRight: () => handleAction('right'),
        onDown: () => handleAction('drop'),
        onUp: () => handleAction('rotate'),
        onTap: () => handleAction('rotate')
    });

    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (['arrowleft','arrowright','arrowdown','arrowup',' ','a','d','s','w'].includes(key)) e.preventDefault();
        if (key === 'arrowleft' || key === 'a') handleAction('left');
        if (key === 'arrowright' || key === 'd') handleAction('right');
        if (key === 'arrowdown' || key === 's') handleAction('down');
        if (key === 'arrowup' || key === 'w') handleAction('rotate');
        if (key === ' ') handleAction('drop');
    });

    currentResetCallback = resetTetris;
    resetTetris();
}


/* ============================================================================
   CARTUCHO 05: 2048 CENTRADO Y MAXIMIZADO
   ============================================================================ */
if (activeGame === '2048') {
    const boardEl = document.getElementById('board-2048');
    let grid = Array(16).fill(0);
    let score = 0;

    if (hudLabelEl) hudLabelEl.textContent = 'PUNTOS';

    function addRandomTile() {
        const empty = grid.map((v, i) => (v === 0 ? i : -1)).filter(i => i !== -1);
        if (empty.length > 0) {
            const idx = empty[Math.floor(Math.random() * empty.length)];
            grid[idx] = Math.random() < 0.9 ? 2 : 4;
        }
    }

    function slideRow(row) {
        const filtered = row.filter(v => v !== 0);
        for (let i = 0; i < filtered.length - 1; i++) {
            if (filtered[i] === filtered[i + 1]) {
                filtered[i] *= 2;
                score += filtered[i];
                filtered[i + 1] = 0;
            }
        }
        const merged = filtered.filter(v => v !== 0);
        while (merged.length < 4) merged.push(0);
        return merged;
    }

    function hasMovesLeft() {
        if (grid.some(v => v === 0)) return true;
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                const v = grid[r * 4 + c];
                if (c < 3 && grid[r * 4 + c + 1] === v) return true;
                if (r < 3 && grid[(r + 1) * 4 + c] === v) return true;
            }
        }
        return false;
    }

    function move2048(dir) {
        const prev = [...grid];
        for (let i = 0; i < 4; i++) {
            let line = [];
            for (let j = 0; j < 4; j++) {
                const idx = (dir === 'left' || dir === 'right') ? i * 4 + j : j * 4 + i;
                line.push(grid[idx]);
            }
            if (dir === 'right' || dir === 'down') line.reverse();
            line = slideRow(line);
            if (dir === 'right' || dir === 'down') line.reverse();
            for (let j = 0; j < 4; j++) {
                const idx = (dir === 'left' || dir === 'right') ? i * 4 + j : j * 4 + i;
                grid[idx] = line[j];
            }
        }
        if (prev.some((v, idx) => v !== grid[idx])) {
            addRandomTile();
            if (hudCurrentEl) hudCurrentEl.textContent = score;
            syncScoreWithServer(score);
            render2048();

            if (!hasMovesLeft()) {
                showGameOverlay('Tablero Lleno', `${score} Puntos`, 'Ya no quedan movimientos disponibles.');
            }
        }
    }

    function render2048() {
        boardEl.innerHTML = '';
        grid.forEach(val => {
            const tile = document.createElement('div');
            tile.className = `tile-2048 ${val > 0 ? 'filled' : ''}`;
            if (val > 0) {
                tile.dataset.val = val;
                tile.textContent = val;
            }
            boardEl.appendChild(tile);
        });
    }

    function init2048() {
        hideGameOverlay();
        grid = Array(16).fill(0);
        score = 0;
        if (hudCurrentEl) hudCurrentEl.textContent = '0';
        addRandomTile();
        addRandomTile();
        render2048();
    }

    attachTouchSwipe(boardEl, {
        onLeft: () => move2048('left'),
        onRight: () => move2048('right'),
        onUp: () => move2048('up'),
        onDown: () => move2048('down')
    });

    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (['arrowleft','arrowright','arrowup','arrowdown','a','d','w','s'].includes(key)) e.preventDefault();
        if (key === 'arrowleft' || key === 'a') move2048('left');
        if (key === 'arrowright' || key === 'd') move2048('right');
        if (key === 'arrowup' || key === 'w') move2048('up');
        if (key === 'arrowdown' || key === 's') move2048('down');
    });

    currentResetCallback = init2048;
    init2048();
}


/* ============================================================================
   CARTUCHO 06: SNAKE RETRO CENTRADO
   ============================================================================ */
if (activeGame === 'snake') {
    const canvas = document.getElementById('snake-canvas');
    const ctx = canvas.getContext('2d');
    const GRID = 20, CELL = 21;

    if (hudLabelEl) hudLabelEl.textContent = 'LONGITUD';

    let snake = [], dir = { x: 1, y: 0 }, nextDir = { x: 1, y: 0 }, food = { x: 10, y: 10 }, loop = null;

    function initSnake() {
        hideGameOverlay();
        snake = [{ x: 6, y: 10 }, { x: 5, y: 10 }, { x: 4, y: 10 }];
        dir = { x: 1, y: 0 };
        nextDir = { x: 1, y: 0 };
        placeFood();
        if (hudCurrentEl) hudCurrentEl.textContent = snake.length;
        if (loop) clearInterval(loop);
        loop = setInterval(stepSnake, 120);
        drawSnake();
    }

    function placeFood() {
        do {
            food = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
        } while (snake.some(s => s.x === food.x && s.y === food.y));
    }

    function stepSnake() {
        dir = { ...nextDir };
        const head = {
            x: (snake[0].x + dir.x + GRID) % GRID,
            y: (snake[0].y + dir.y + GRID) % GRID
        };
        if (snake.some(s => s.x === head.x && s.y === head.y)) {
            clearInterval(loop);
            syncScoreWithServer(snake.length);
            showGameOverlay('Fin de Partida', `Longitud: ${snake.length}`, 'Chocaste con tu propia cola.');
            return;
        }
        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
            if (hudCurrentEl) hudCurrentEl.textContent = snake.length;
            syncScoreWithServer(snake.length);
            placeFood();
        } else {
            snake.pop();
        }
        drawSnake();
    }

    function drawSnake() {
        ctx.fillStyle = '#25392f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(163, 177, 138, 0.07)';
        for (let i = 1; i < GRID; i++) {
            ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(canvas.width, i * CELL); ctx.stroke();
        }

        ctx.fillStyle = '#7ea172';
        ctx.beginPath();
        ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
        ctx.fill();

        snake.forEach((s, idx) => {
            ctx.fillStyle = idx === 0 ? '#dad7cd' : '#a3b18a';
            ctx.fillRect(s.x * CELL + 1.5, s.y * CELL + 1.5, CELL - 3, CELL - 3);
        });
    }

    function changeDir(d) {
        if (d === 'LEFT' && dir.x === 0) nextDir = { x: -1, y: 0 };
        if (d === 'RIGHT' && dir.x === 0) nextDir = { x: 1, y: 0 };
        if (d === 'UP' && dir.y === 0) nextDir = { x: 0, y: -1 };
        if (d === 'DOWN' && dir.y === 0) nextDir = { x: 0, y: 1 };
    }

    attachTouchSwipe(canvas, {
        onLeft: () => changeDir('LEFT'),
        onRight: () => changeDir('RIGHT'),
        onUp: () => changeDir('UP'),
        onDown: () => changeDir('DOWN')
    });

    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (['arrowleft','arrowright','arrowup','arrowdown','a','d','w','s'].includes(key)) e.preventDefault();
        if (key === 'arrowleft' || key === 'a') changeDir('LEFT');
        if (key === 'arrowright' || key === 'd') changeDir('RIGHT');
        if (key === 'arrowup' || key === 'w') changeDir('UP');
        if (key === 'arrowdown' || key === 's') changeDir('DOWN');
    });

    currentResetCallback = initSnake;
    initSnake();
}