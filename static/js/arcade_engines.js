/**
 * ============================================================================
 * MOTORES DE JUEGOS DEL CATÁLOGO ARCADE (EDICIÓN PRO PC & MÓVIL)
 * Archivo: static/js/arcade_engines.js
 * ============================================================================
 * Mejoras de jugabilidad y ergonomía:
 * - Soporte simultáneo de Teclado (Flechas + WASD), Mouse y Gestos Táctiles (Swipe).
 * - Prevención de scroll accidental en pantallas táctiles mientras se interactúa.
 * - Sudoku con navegación por teclado, iluminado de ejes y validación en vivo.
 * - Solitario con cartas en cascada real y auto-movimiento inteligente.
 * - Tetris con Pieza Fantasma (Ghost Piece), cuadrícula guía y paleta multicapa.
 * - 2048 con jerarquía cromática por valor y gestos de deslizamiento.
 * - Snake con cabeza direccionada, cuadrícula sutil y swipe fluido.
 * ============================================================================
 */

const activeGame = document.body.dataset.activeGame;

/**
 * Utilidad Universal de Gestos Táctiles (Swipe + Tap)
 * Convierte cualquier elemento o canvas en una superficie táctil precisa sin scroll.
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
        // Evita que la página haga scroll mientras deslizas el dedo en el juego
        e.preventDefault();
    }, { passive: false });

    element.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        const dt = Date.now() - startTime;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        // Si fue un toque rápido y corto (Tap)
        if (absX < 18 && absY < 18 && dt < 260) {
            if (callbacks.onTap) callbacks.onTap();
            return;
        }

        // Umbral mínimo de 24px para considerar un Swipe direccional
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
   CARTUCHO 02: SUDOKU MINIMALISTA (TECLADO + TÁCTIL + ILUMINACIÓN DE EJES)
   ============================================================================ */
if (activeGame === 'sudoku') {
    const boardEl = document.getElementById('sudoku-board');
    const numpadEl = document.getElementById('sudoku-numpad');
    const statusEl = document.getElementById('sudoku-status');
    let solution = [];
    let puzzle = [];
    let userGrid = [];
    let selectedIdx = null;

    function generateSudoku() {
        const base = [
            1,2,3,4,5,6,7,8,9, 4,5,6,7,8,9,1,2,3, 7,8,9,1,2,3,4,5,6,
            2,3,4,5,6,7,8,9,1, 5,6,7,8,9,1,2,3,4, 8,9,1,2,3,4,5,6,7,
            3,4,5,6,7,8,9,1,2, 6,7,8,9,1,2,3,4,5, 9,1,2,3,4,5,6,7,8
        ];
        const digits = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
        solution = base.map(n => digits[n - 1]);
        puzzle = solution.map(n => (Math.random() < 0.48 ? 0 : n));
        userGrid = [...puzzle];
        selectedIdx = puzzle.findIndex(v => v === 0);
        if (selectedIdx === -1) selectedIdx = 0;
        statusEl.textContent = 'Usa el teclado (1-9 y flechas) o toca una casilla y luego un número debajo.';
        renderSudoku();
    }

    function selectCell(idx) {
        selectedIdx = idx;
        const cells = boardEl.querySelectorAll('.sudoku-cell');
        const selR = Math.floor(idx / 9);
        const selC = idx % 9;
        const selBoxR = Math.floor(selR / 3);
        const selBoxC = Math.floor(selC / 3);
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
        renderSudoku();
        selectCell(selectedIdx);

        // Verificar automáticamente si ya se llenó todo el tablero
        if (userGrid.every(v => v !== 0)) {
            checkSolution();
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

            cell.addEventListener('click', () => selectCell(idx));
            boardEl.appendChild(cell);
        });
        if (selectedIdx !== null) selectCell(selectedIdx);
    }

    function checkSolution() {
        const cells = boardEl.querySelectorAll('.sudoku-cell');
        let complete = true;
        let errors = 0;
        cells.forEach((cell, i) => {
            cell.classList.remove('error-cell');
            if (userGrid[i] === 0) {
                complete = false;
            } else if (userGrid[i] !== solution[i]) {
                errors++;
                if (puzzle[i] === 0) cell.classList.add('error-cell');
            }
        });
        if (!complete && errors === 0) {
            statusEl.textContent = 'Vas muy bien: todos los números colocados hasta ahora son correctos.';
        } else if (errors > 0) {
            statusEl.textContent = `Hay ${errors} casilla(s) incorrecta(s) marcada(s) en rojo.`;
        } else {
            statusEl.textContent = '¡Sudoku completado a la perfección!';
        }
    }

    // Construir teclado numérico táctil
    numpadEl.innerHTML = '';
    for (let n = 1; n <= 9; n++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sudoku-key';
        btn.textContent = n;
        btn.addEventListener('click', () => setCellValue(n));
        numpadEl.appendChild(btn);
    }

    // Soporte completo de teclado físico en computadora
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
            selectCell(r * 9 + c);
        }
    });

    document.getElementById('sudoku-erase').addEventListener('click', () => setCellValue(0));
    document.getElementById('sudoku-check').addEventListener('click', checkSolution);
    document.getElementById('sudoku-new').addEventListener('click', generateSudoku);
    generateSudoku();
}


/* ============================================================================
   CARTUCHO 03: SOLITARIO KLONDIKE (CASCADA REAL + AUTO-MOVIMIENTO CON 1 TOQUE)
   ============================================================================ */
if (activeGame === 'solitario') {
    const tableEl = document.getElementById('solitaire-table');
    const statusEl = document.getElementById('solitaire-status');
    const SUITS = [
        { s: '♠', color: 'dark' },
        { s: '♣', color: 'dark' },
        { s: '♥', color: 'red' },
        { s: '♦', color: 'red' }
    ];
    const LABELS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

    let stock = [], waste = [], foundations = [[], [], [], []], tableau = [[], [], [], [], [], [], []];
    let selected = null;

    function initSolitaire() {
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
        selected = null;
        statusEl.textContent = 'Toca una carta para seleccionarla, o haz doble toque sobre ella para enviarla automáticamente a su lugar válido.';
        renderSolitaire();
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

    // Auto-movimiento inteligente: busca primero si puede subir a una Base y si no a una Columna
    function autoMoveCard(fromType, colIdx, cardIdx) {
        let card = null;
        let isTopCard = false;

        if (fromType === 'waste') {
            if (waste.length === 0) return false;
            card = waste[waste.length - 1];
            isTopCard = true;
        } else {
            const pile = tableau[colIdx];
            card = pile[cardIdx];
            isTopCard = (cardIdx === pile.length - 1);
        }

        // 1. Intentar subir a cualquiera de las 4 bases si es la carta superior
        if (isTopCard) {
            for (let f = 0; f < 4; f++) {
                if (canMoveToFoundation(card, f)) {
                    if (fromType === 'waste') foundations[f].push(waste.pop());
                    else {
                        foundations[f].push(tableau[colIdx].pop());
                        if (tableau[colIdx].length > 0) tableau[colIdx][tableau[colIdx].length - 1].up = true;
                    }
                    selected = null;
                    renderSolitaire();
                    checkSolitaireWin();
                    return true;
                }
            }
        }

        // 2. Intentar mover a alguna de las 7 columnas
        for (let c = 0; c < 7; c++) {
            if (fromType === 'tableau' && c === colIdx) continue;
            if (canMoveToTableau(card, c)) {
                if (fromType === 'waste') {
                    tableau[c].push(waste.pop());
                } else {
                    const moving = tableau[colIdx].slice(cardIdx);
                    tableau[c].push(...moving);
                    tableau[colIdx] = tableau[colIdx].slice(0, cardIdx);
                    if (tableau[colIdx].length > 0) tableau[colIdx][tableau[colIdx].length - 1].up = true;
                }
                selected = null;
                renderSolitaire();
                return true;
            }
        }
        return false;
    }

    function checkSolitaireWin() {
        const total = foundations.reduce((acc, f) => acc + f.length, 0);
        if (total === 52) {
            statusEl.textContent = '¡Felicidades! Completaste las 4 bases del Solitario.';
        }
    }

    function renderSolitaire() {
        tableEl.innerHTML = '';

        const topRow = document.createElement('div');
        topRow.className = 'sol-top-row';

        // Mazo
        const stockEl = document.createElement('div');
        stockEl.className = 'sol-slot sol-stock';
        stockEl.innerHTML = stock.length > 0
            ? `<div class="sol-deck-count">${stock.length}</div><span>Robar</span>`
            : `<span>Reciclar ↻</span>`;
        stockEl.addEventListener('click', () => {
            if (stock.length > 0) {
                const c = stock.pop();
                c.up = true;
                waste.push(c);
            } else {
                stock = waste.reverse().map(c => ({ ...c, up: false }));
                waste = [];
            }
            selected = null;
            renderSolitaire();
        });
        topRow.appendChild(stockEl);

        // Descarte
        const wasteEl = document.createElement('div');
        wasteEl.className = 'sol-slot';
        if (waste.length > 0) {
            const top = waste[waste.length - 1];
            const isSel = selected && selected.from === 'waste';
            const cardEl = createCardDOM(top, isSel);
            cardEl.addEventListener('click', (e) => {
                e.stopPropagation();
                if (isSel) {
                    autoMoveCard('waste', 0, 0);
                } else {
                    selected = { from: 'waste' };
                    renderSolitaire();
                }
            });
            wasteEl.appendChild(cardEl);
        } else {
            wasteEl.textContent = 'Descarte';
        }
        topRow.appendChild(wasteEl);

        // Espaciador visual
        const spacer = document.createElement('div');
        spacer.className = 'sol-spacer';
        topRow.appendChild(spacer);

        // 4 Bases
        const suitIcons = ['♠', '♣', '♥', '♦'];
        foundations.forEach((pile, fIdx) => {
            const fEl = document.createElement('div');
            fEl.className = 'sol-slot sol-foundation';
            if (pile.length > 0) {
                fEl.appendChild(createCardDOM(pile[pile.length - 1], false));
            } else {
                fEl.textContent = suitIcons[fIdx];
            }
            fEl.addEventListener('click', () => {
                if (!selected) return;
                if (selected.from === 'waste') {
                    const card = waste[waste.length - 1];
                    if (canMoveToFoundation(card, fIdx)) {
                        foundations[fIdx].push(waste.pop());
                        selected = null;
                        renderSolitaire();
                        checkSolitaireWin();
                    }
                } else if (selected.from === 'tableau') {
                    const colPile = tableau[selected.col];
                    if (selected.cardIdx === colPile.length - 1) {
                        const card = colPile[colPile.length - 1];
                        if (canMoveToFoundation(card, fIdx)) {
                            foundations[fIdx].push(colPile.pop());
                            if (colPile.length > 0) colPile[colPile.length - 1].up = true;
                            selected = null;
                            renderSolitaire();
                            checkSolitaireWin();
                        }
                    }
                }
            });
            topRow.appendChild(fEl);
        });
        tableEl.appendChild(topRow);

        // 7 Columnas en Cascada
        const colsRow = document.createElement('div');
        colsRow.className = 'sol-cols-row';
        tableau.forEach((pile, cIdx) => {
            const colEl = document.createElement('div');
            colEl.className = 'sol-col';
            if (pile.length === 0) {
                const emptySlot = document.createElement('div');
                emptySlot.className = 'sol-slot';
                emptySlot.textContent = 'K';
                emptySlot.addEventListener('click', () => moveSelectedToCol(cIdx));
                colEl.appendChild(emptySlot);
            }
            pile.forEach((card, cardIdx) => {
                const isSel = selected && selected.from === 'tableau' && selected.col === cIdx && selected.cardIdx === cardIdx;
                const cardDOM = createCardDOM(card, isSel);
                // Efecto cascada: cada carta se superpone limpiamente sobre la anterior
                if (cardIdx > 0) {
                    cardDOM.style.marginTop = card.up ? '-42px' : '-52px';
                }
                cardDOM.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!card.up) {
                        if (cardIdx === pile.length - 1) {
                            card.up = true;
                            renderSolitaire();
                        }
                        return;
                    }
                    // Si ya estaba seleccionada esta misma carta y la vuelves a tocar: Auto-Mover
                    if (isSel) {
                        autoMoveCard('tableau', cIdx, cardIdx);
                        return;
                    }
                    if (selected && moveSelectedToCol(cIdx)) return;
                    selected = { from: 'tableau', col: cIdx, cardIdx };
                    renderSolitaire();
                });
                colEl.appendChild(cardDOM);
            });
            colsRow.appendChild(colEl);
        });
        tableEl.appendChild(colsRow);
    }

    function moveSelectedToCol(targetCol) {
        if (!selected) return false;
        if (selected.from === 'waste') {
            const card = waste[waste.length - 1];
            if (canMoveToTableau(card, targetCol)) {
                tableau[targetCol].push(waste.pop());
                selected = null;
                renderSolitaire();
                return true;
            }
        } else if (selected.from === 'tableau') {
            if (selected.col === targetCol) return false;
            const srcPile = tableau[selected.col];
            const movingCards = srcPile.slice(selected.cardIdx);
            if (canMoveToTableau(movingCards[0], targetCol)) {
                tableau[targetCol].push(...movingCards);
                tableau[selected.col] = srcPile.slice(0, selected.cardIdx);
                if (tableau[selected.col].length > 0) {
                    tableau[selected.col][tableau[selected.col].length - 1].up = true;
                }
                selected = null;
                renderSolitaire();
                return true;
            }
        }
        return false;
    }

    function createCardDOM(card, isSelected) {
        const div = document.createElement('div');
        div.className = `sol-card ${card.up ? card.color : 'down'} ${isSelected ? 'selected' : ''}`;
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

    document.getElementById('solitaire-new').addEventListener('click', initSolitaire);
    initSolitaire();
}


/* ============================================================================
   CARTUCHO 04: TETRIS CLÁSICO (PIEZA FANTASMA + GESTOS SWIPE + COLORES)
   ============================================================================ */
if (activeGame === 'tetris') {
    const canvas = document.getElementById('tetris-canvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('tetris-score');
    const linesEl = document.getElementById('tetris-lines');
    const statusEl = document.getElementById('tetris-status');
    const COLS = 10, ROWS = 20, BLOCK = 26;

    // 7 Tetrominós con tonos diferenciados dentro de la estética botánica
    const PIECES = [
        { shape: [[1,1,1,1]], color: '#dad7cd' },           // I
        { shape: [[1,1],[1,1]], color: '#a3b18a' },         // O
        { shape: [[0,1,0],[1,1,1]], color: '#7ea172' },     // T
        { shape: [[1,0,0],[1,1,1]], color: '#588157' },     // L
        { shape: [[0,0,1],[1,1,1]], color: '#b5c29e' },     // J
        { shape: [[0,1,1],[1,1,0]], color: '#8fb388' },     // S
        { shape: [[1,1,0],[0,1,1]], color: '#c4bfa8' }      // Z
    ];

    let grid = [], piece = null, score = 0, lines = 0, timer = null, isGameOver = false;

    function resetTetris() {
        grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
        score = 0; lines = 0; isGameOver = false;
        scoreEl.textContent = 0; linesEl.textContent = 0;
        statusEl.textContent = 'PC: Flechas o WASD y Espacio. Móvil: Desliza el dedo sobre el tablero o usa los botones.';
        spawnPiece();
        if (timer) clearInterval(timer);
        timer = setInterval(stepDown, 480);
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
            statusEl.textContent = 'Fin de la partida. Presiona Reiniciar Partida para jugar de nuevo.';
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
        while (!collides(piece.shape, piece.x, gy + 1)) {
            gy++;
        }
        return gy;
    }

    function mergePiece() {
        piece.shape.forEach((row, r) => {
            row.forEach((val, c) => {
                if (val && piece.y + r >= 0) {
                    grid[piece.y + r][piece.x + c] = piece.color;
                }
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
            lines += cleared;
            score += cleared * cleared * 100;
            scoreEl.textContent = score;
            linesEl.textContent = lines;
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
        // Wall-kick básico: si rota pegado a la pared, intenta ajustar 1 casilla a los lados
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
            ctx.fillStyle = 'rgba(255,255,255,0.18)';
            ctx.fillRect(x * BLOCK + 2, y * BLOCK + 2, BLOCK - 4, 4);
        }
    }

    function drawTetris() {
        ctx.fillStyle = '#25392f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Cuadrícula guía sutil
        ctx.strokeStyle = 'rgba(163, 177, 138, 0.08)';
        ctx.lineWidth = 1;
        for (let c = 1; c < COLS; c++) {
            ctx.beginPath(); ctx.moveTo(c * BLOCK, 0); ctx.lineTo(c * BLOCK, canvas.height); ctx.stroke();
        }
        for (let r = 1; r < ROWS; r++) {
            ctx.beginPath(); ctx.moveTo(0, r * BLOCK); ctx.lineTo(canvas.width, r * BLOCK); ctx.stroke();
        }

        // Bloques ya fijados
        grid.forEach((row, r) => {
            row.forEach((color, c) => {
                if (color) drawBlock(c, r, color);
            });
        });

        if (piece && !isGameOver) {
            // Dibujar Pieza Fantasma (Ghost Piece)
            const ghostY = getGhostY();
            piece.shape.forEach((row, r) => {
                row.forEach((val, c) => {
                    if (val) drawBlock(piece.x + c, ghostY + r, piece.color, true);
                });
            });

            // Dibujar Pieza Activa
            piece.shape.forEach((row, r) => {
                row.forEach((val, c) => {
                    if (val) drawBlock(piece.x + c, piece.y + r, piece.color, false);
                });
            });
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

    document.querySelectorAll('[data-tctrl]').forEach(btn => {
        btn.addEventListener('click', () => handleAction(btn.dataset.tctrl));
    });

    // Gestos táctiles sobre el propio Canvas del Tetris
    attachTouchSwipe(canvas, {
        onLeft: () => handleAction('left'),
        onRight: () => handleAction('right'),
        onDown: () => handleAction('drop'),
        onUp: () => handleAction('rotate'),
        onTap: () => handleAction('rotate')
    });

    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (['arrowleft','arrowright','arrowdown','arrowup',' ','a','d','s','w'].includes(key)) {
            e.preventDefault();
        }
        if (key === 'arrowleft' || key === 'a') handleAction('left');
        if (key === 'arrowright' || key === 'd') handleAction('right');
        if (key === 'arrowdown' || key === 's') handleAction('down');
        if (key === 'arrowup' || key === 'w') handleAction('rotate');
        if (key === ' ') handleAction('drop');
    });

    document.getElementById('tetris-reset').addEventListener('click', resetTetris);
    resetTetris();
}


/* ============================================================================
   CARTUCHO 05: 2048 BOTÁNICO (SWIPE TÁCTIL + WASD/FLECHAS + COLORES POR VALOR)
   ============================================================================ */
if (activeGame === '2048') {
    const boardEl = document.getElementById('board-2048');
    const scoreEl = document.getElementById('g2048-score');
    const statusEl = document.getElementById('g2048-status');
    let grid = Array(16).fill(0);
    let score = 0;

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
            scoreEl.textContent = score;
            render2048();
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
        grid = Array(16).fill(0);
        score = 0;
        scoreEl.textContent = 0;
        statusEl.textContent = 'Desliza el dedo sobre el tablero (o usa Flechas / WASD) para fusionar bloques.';
        addRandomTile();
        addRandomTile();
        render2048();
    }

    // Gestos de deslizamiento directo sobre el tablero de 2048
    attachTouchSwipe(boardEl, {
        onLeft: () => move2048('left'),
        onRight: () => move2048('right'),
        onUp: () => move2048('up'),
        onDown: () => move2048('down')
    });

    document.querySelectorAll('[data-dir]').forEach(btn => {
        btn.addEventListener('click', () => move2048(btn.dataset.dir));
    });

    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (['arrowleft','arrowright','arrowup','arrowdown','a','d','w','s'].includes(key)) {
            e.preventDefault();
        }
        if (key === 'arrowleft' || key === 'a') move2048('left');
        if (key === 'arrowright' || key === 'd') move2048('right');
        if (key === 'arrowup' || key === 'w') move2048('up');
        if (key === 'arrowdown' || key === 's') move2048('down');
    });

    document.getElementById('g2048-reset').addEventListener('click', init2048);
    init2048();
}


/* ============================================================================
   CARTUCHO 06: SNAKE RETRO (SWIPE TÁCTIL + COLA DE GIRO + CUADRÍCULA)
   ============================================================================ */
if (activeGame === 'snake') {
    const canvas = document.getElementById('snake-canvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('snake-score');
    const bestEl = document.getElementById('snake-best');
    const statusEl = document.getElementById('snake-status');
    const GRID = 18, CELL = 20;

    let snake = [], dir = { x: 1, y: 0 }, nextDir = { x: 1, y: 0 }, food = { x: 10, y: 10 }, loop = null;
    let best = parseInt(localStorage.getItem('snake_best') || '3', 10);
    bestEl.textContent = best;

    function initSnake() {
        snake = [{ x: 6, y: 9 }, { x: 5, y: 9 }, { x: 4, y: 9 }];
        dir = { x: 1, y: 0 };
        nextDir = { x: 1, y: 0 };
        placeFood();
        scoreEl.textContent = snake.length;
        statusEl.textContent = 'Desliza el dedo hacia cualquier dirección en el lienzo o usa las Flechas / WASD.';
        if (loop) clearInterval(loop);
        loop = setInterval(stepSnake, 125);
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
            statusEl.textContent = 'Colisión. Toca el lienzo o presiona Nueva Partida para jugar otra vez.';
            return;
        }
        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
            scoreEl.textContent = snake.length;
            if (snake.length > best) {
                best = snake.length;
                bestEl.textContent = best;
                localStorage.setItem('snake_best', best);
            }
            placeFood();
        } else {
            snake.pop();
        }
        drawSnake();
    }

    function drawSnake() {
        ctx.fillStyle = '#25392f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Cuadrícula sutil de referencia
        ctx.strokeStyle = 'rgba(163, 177, 138, 0.07)';
        for (let i = 1; i < GRID; i++) {
            ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(canvas.width, i * CELL); ctx.stroke();
        }

        // Comida circular orgánica
        ctx.fillStyle = '#7ea172';
        ctx.beginPath();
        ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
        ctx.fill();

        // Cuerpo y cabeza diferenciada de la serpiente
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

    // Gestos táctiles sobre el propio lienzo de Snake
    attachTouchSwipe(canvas, {
        onLeft: () => changeDir('LEFT'),
        onRight: () => changeDir('RIGHT'),
        onUp: () => changeDir('UP'),
        onDown: () => changeDir('DOWN')
    });

    document.querySelectorAll('[data-sdir]').forEach(btn => {
        btn.addEventListener('click', () => changeDir(btn.dataset.sdir));
    });

    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (['arrowleft','arrowright','arrowup','arrowdown','a','d','w','s'].includes(key)) {
            e.preventDefault();
        }
        if (key === 'arrowleft' || key === 'a') changeDir('LEFT');
        if (key === 'arrowright' || key === 'd') changeDir('RIGHT');
        if (key === 'arrowup' || key === 'w') changeDir('UP');
        if (key === 'arrowdown' || key === 's') changeDir('DOWN');
    });

    document.getElementById('snake-reset').addEventListener('click', initSnake);
    initSnake();
}