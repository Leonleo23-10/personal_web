/**
 * ============================================================================
 * MOTORES DE JUEGOS DEL CATÁLOGO ARCADE: static/js/arcade_engines.js
 * ============================================================================
 * Contiene la lógica completa, sin dependencias externas y 100% offline de:
 *   - Cartucho 02: Sudoku Minimalista (Generador por permutación de bloques).
 *   - Cartucho 03: Solitario Klondike (Mazo completo de 52 cartas, 7 columnas y 4 bases).
 *   - Cartucho 04: Tetris Clásico (7 Tetrominós, rotación matricial y limpieza de líneas).
 *   - Cartucho 05: 2048 Botánico (Fusión de matrices 4x4 con teclado y botones).
 *   - Cartucho 06: Snake Retro (Bucle en Canvas 2D con bordes toroidales y récord en localStorage).
 * ============================================================================
 */

const activeGame = document.body.dataset.activeGame;

/* ============================================================================
   CARTUCHO 02: MOTOR DE SUDOKU MINIMALISTA
   ============================================================================ */
if (activeGame === 'sudoku') {
    const boardEl = document.getElementById('sudoku-board');
    const numpadEl = document.getElementById('sudoku-numpad');
    const statusEl = document.getElementById('sudoku-status');
    let solution = [];
    let puzzle = [];
    let selectedIdx = null;

    // Genera una solución válida 9x9 permutando filas y bloques
    function generateSudoku() {
        const base = [
            1,2,3,4,5,6,7,8,9, 4,5,6,7,8,9,1,2,3, 7,8,9,1,2,3,4,5,6,
            2,3,4,5,6,7,8,9,1, 5,6,7,8,9,1,2,3,4, 8,9,1,2,3,4,5,6,7,
            3,4,5,6,7,8,9,1,2, 6,7,8,9,1,2,3,4,5, 9,1,2,3,4,5,6,7,8
        ];
        // Permutar dígitos aleatoriamente para crear miles de tableros distintos
        const digits = [1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
        solution = base.map(n => digits[n - 1]);
        puzzle = solution.map(n => (Math.random() < 0.46 ? 0 : n));
        selectedIdx = null;
        renderSudoku();
    }

    function renderSudoku() {
        boardEl.innerHTML = '';
        puzzle.forEach((val, idx) => {
            const cell = document.createElement('button');
            cell.className = 'sudoku-cell';
            const r = Math.floor(idx / 9), c = idx % 9;
            if (c === 2 || c === 5) cell.classList.add('border-right');
            if (r === 2 || r === 5) cell.classList.add('border-bottom');

            if (val !== 0) {
                cell.textContent = val;
                cell.classList.add('fixed');
            } else {
                cell.addEventListener('click', () => {
                    document.querySelectorAll('.sudoku-cell').forEach(el => el.classList.remove('selected'));
                    cell.classList.add('selected');
                    selectedIdx = idx;
                });
            }
            boardEl.appendChild(cell);
        });
    }

    for (let n = 1; n <= 9; n++) {
        const btn = document.createElement('button');
        btn.className = 'btn-editorial';
        btn.textContent = n;
        btn.addEventListener('click', () => {
            if (selectedIdx === null) return;
            const cells = boardEl.querySelectorAll('.sudoku-cell');
            cells[selectedIdx].textContent = n;
            cells[selectedIdx].classList.add('user-input');
        });
        numpadEl.appendChild(btn);
    }

    document.getElementById('sudoku-erase').addEventListener('click', () => {
        if (selectedIdx === null) return;
        const cells = boardEl.querySelectorAll('.sudoku-cell');
        cells[selectedIdx].textContent = '';
    });

    document.getElementById('sudoku-check').addEventListener('click', () => {
        const cells = boardEl.querySelectorAll('.sudoku-cell');
        let complete = true;
        let errors = 0;
        cells.forEach((cell, i) => {
            const val = parseInt(cell.textContent, 10);
            if (!val) complete = false;
            else if (val !== solution[i]) errors++;
        });
        if (!complete) statusEl.textContent = 'Aún quedan casillas vacías por completar.';
        else if (errors === 0) statusEl.textContent = 'Tablero resuelto perfectamente. Sin errores.';
        else statusEl.textContent = `Se encontraron ${errors} casillas que no coinciden. Revisa tus números.`;
    });

    document.getElementById('sudoku-new').addEventListener('click', generateSudoku);
    generateSudoku();
}


/* ============================================================================
   CARTUCHO 03: MOTOR DE SOLITARIO KLONDIKE
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
    let selected = null; // { from: 'waste' | 'tableau', col: idx, cardIdx: idx }

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
        renderSolitaire();
    }

    function canMoveToTableau(card, targetCol) {
        const pile = tableau[targetCol];
        if (pile.length === 0) return card.v === 13; // Solo Reyes (K) en columna vacía
        const top = pile[pile.length - 1];
        return top.up && top.color !== card.color && top.v === card.v + 1;
    }

    function canMoveToFoundation(card, fIdx) {
        const pile = foundations[fIdx];
        if (pile.length === 0) return card.v === 1; // Solo Ases (A) inician base
        const top = pile[pile.length - 1];
        return top.s === card.s && card.v === top.v + 1;
    }

    function renderSolitaire() {
        tableEl.innerHTML = '';

        // Fila Superior: Mazo, Descarte y 4 Bases (Foundations)
        const topRow = document.createElement('div');
        topRow.className = 'sol-top-row';

        // Mazo (Stock)
        const stockEl = document.createElement('div');
        stockEl.className = 'sol-slot sol-stock';
        stockEl.textContent = stock.length > 0 ? `Mazo (${stock.length})` : 'Reciclar ↻';
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

        // Descarte (Waste)
        const wasteEl = document.createElement('div');
        wasteEl.className = 'sol-slot';
        if (waste.length > 0) {
            const top = waste[waste.length - 1];
            const cardEl = createCardDOM(top, selected && selected.from === 'waste');
            cardEl.addEventListener('click', () => {
                selected = { from: 'waste' };
                renderSolitaire();
            });
            wasteEl.appendChild(cardEl);
        }
        topRow.appendChild(wasteEl);

        // 4 Bases (Foundations)
        foundations.forEach((pile, fIdx) => {
            const fEl = document.createElement('div');
            fEl.className = 'sol-slot sol-foundation';
            if (pile.length > 0) {
                fEl.appendChild(createCardDOM(pile[pile.length - 1], false));
            } else {
                fEl.textContent = 'Base A';
            }
            fEl.addEventListener('click', () => {
                if (!selected) return;
                if (selected.from === 'waste') {
                    const card = waste[waste.length - 1];
                    if (canMoveToFoundation(card, fIdx)) {
                        foundations[fIdx].push(waste.pop());
                        selected = null;
                        renderSolitaire();
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
                        }
                    }
                }
            });
            topRow.appendChild(fEl);
        });
        tableEl.appendChild(topRow);

        // 7 Columnas (Tableau)
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
                cardDOM.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!card.up) return;
                    if (selected) {
                        if (moveSelectedToCol(cIdx)) return;
                    }
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
        div.textContent = card.up ? `${LABELS[card.v]}${card.s}` : 'leo.';
        return div;
    }

    document.getElementById('solitaire-new').addEventListener('click', initSolitaire);
    initSolitaire();
}


/* ============================================================================
   CARTUCHO 04: MOTOR DE TETRIS CLÁSICO
   ============================================================================ */
if (activeGame === 'tetris') {
    const canvas = document.getElementById('tetris-canvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('tetris-score');
    const linesEl = document.getElementById('tetris-lines');
    const COLS = 10, ROWS = 20, BLOCK = 26;

    const SHAPES = [
        [[1,1,1,1]],
        [[1,1],[1,1]],
        [[0,1,0],[1,1,1]],
        [[1,0,0],[1,1,1]],
        [[0,0,1],[1,1,1]],
        [[0,1,1],[1,1,0]],
        [[1,1,0],[0,1,1]]
    ];

    let grid = [], piece = null, score = 0, lines = 0, timer = null;

    function resetTetris() {
        grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        score = 0; lines = 0;
        scoreEl.textContent = 0; linesEl.textContent = 0;
        spawnPiece();
        if (timer) clearInterval(timer);
        timer = setInterval(stepDown, 520);
        drawTetris();
    }

    function spawnPiece() {
        const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        piece = { shape, x: Math.floor((COLS - shape[0].length) / 2), y: 0 };
        if (collides(piece.shape, piece.x, piece.y)) {
            clearInterval(timer);
            document.getElementById('tetris-status').textContent = 'Tablero lleno. Presiona Reiniciar Partida.';
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

    function mergePiece() {
        piece.shape.forEach((row, r) => {
            row.forEach((val, c) => {
                if (val) grid[piece.y + r][piece.x + c] = 1;
            });
        });
        for (let r = ROWS - 1; r >= 0; r--) {
            if (grid[r].every(v => v === 1)) {
                grid.splice(r, 1);
                grid.unshift(Array(COLS).fill(0));
                lines++;
                score += 100;
                r++;
            }
        }
        scoreEl.textContent = score;
        linesEl.textContent = lines;
        spawnPiece();
    }

    function stepDown() {
        if (!collides(piece.shape, piece.x, piece.y + 1)) piece.y++;
        else mergePiece();
        drawTetris();
    }

    function rotatePiece() {
        const rotated = piece.shape[0].map((_, i) => piece.shape.map(row => row[i]).reverse());
        if (!collides(rotated, piece.x, piece.y)) piece.shape = rotated;
        drawTetris();
    }

    function drawTetris() {
        ctx.fillStyle = '#344e41';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Dibujar bloques fijos
        ctx.fillStyle = '#a3b18a';
        grid.forEach((row, r) => {
            row.forEach((val, c) => {
                if (val) ctx.fillRect(c * BLOCK + 1, r * BLOCK + 1, BLOCK - 2, BLOCK - 2);
            });
        });

        // Dibujar pieza activa
        if (piece) {
            ctx.fillStyle = '#dad7cd';
            piece.shape.forEach((row, r) => {
                row.forEach((val, c) => {
                    if (val) ctx.fillRect((piece.x + c) * BLOCK + 1, (piece.y + r) * BLOCK + 1, BLOCK - 2, BLOCK - 2);
                });
            });
        }
    }

    function handleAction(act) {
        if (!piece) return;
        if (act === 'left' && !collides(piece.shape, piece.x - 1, piece.y)) piece.x--;
        if (act === 'right' && !collides(piece.shape, piece.x + 1, piece.y)) piece.x++;
        if (act === 'down') stepDown();
        if (act === 'rotate') rotatePiece();
        if (act === 'drop') {
            while (!collides(piece.shape, piece.x, piece.y + 1)) piece.y++;
            mergePiece();
        }
        drawTetris();
    }

    document.querySelectorAll('[data-tctrl]').forEach(btn => {
        btn.addEventListener('click', () => handleAction(btn.dataset.tctrl));
    });

    window.addEventListener('keydown', (e) => {
        if (['ArrowLeft','ArrowRight','ArrowDown','ArrowUp',' '].includes(e.key)) e.preventDefault();
        if (e.key === 'ArrowLeft') handleAction('left');
        if (e.key === 'ArrowRight') handleAction('right');
        if (e.key === 'ArrowDown') handleAction('down');
        if (e.key === 'ArrowUp') handleAction('rotate');
        if (e.key === ' ') handleAction('drop');
    });

    document.getElementById('tetris-reset').addEventListener('click', resetTetris);
    resetTetris();
}


/* ============================================================================
   CARTUCHO 05: MOTOR DE 2048 BOTÁNICO
   ============================================================================ */
if (activeGame === '2048') {
    const boardEl = document.getElementById('board-2048');
    const scoreEl = document.getElementById('g2048-score');
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
            tile.textContent = val > 0 ? val : '';
            boardEl.appendChild(tile);
        });
    }

    function init2048() {
        grid = Array(16).fill(0);
        score = 0;
        scoreEl.textContent = 0;
        addRandomTile();
        addRandomTile();
        render2048();
    }

    document.querySelectorAll('[data-dir]').forEach(btn => {
        btn.addEventListener('click', () => move2048(btn.dataset.dir));
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') move2048('left');
        if (e.key === 'ArrowRight') move2048('right');
        if (e.key === 'ArrowUp') move2048('up');
        if (e.key === 'ArrowDown') move2048('down');
    });

    document.getElementById('g2048-reset').addEventListener('click', init2048);
    init2048();
}


/* ============================================================================
   CARTUCHO 06: MOTOR DE SNAKE RETRO
   ============================================================================ */
if (activeGame === 'snake') {
    const canvas = document.getElementById('snake-canvas');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('snake-score');
    const bestEl = document.getElementById('snake-best');
    const GRID = 18, CELL = 20;

    let snake = [], dir = { x: 1, y: 0 }, food = { x: 10, y: 10 }, loop = null;
    let best = parseInt(localStorage.getItem('snake_best') || '3', 10);
    bestEl.textContent = best;

    function initSnake() {
        snake = [{ x: 5, y: 9 }, { x: 4, y: 9 }, { x: 3, y: 9 }];
        dir = { x: 1, y: 0 };
        placeFood();
        scoreEl.textContent = snake.length;
        if (loop) clearInterval(loop);
        loop = setInterval(stepSnake, 130);
    }

    function placeFood() {
        food = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    }

    function stepSnake() {
        const head = {
            x: (snake[0].x + dir.x + GRID) % GRID,
            y: (snake[0].y + dir.y + GRID) % GRID
        };
        if (snake.some(s => s.x === head.x && s.y === head.y)) {
            clearInterval(loop);
            document.getElementById('snake-status').textContent = 'Colisión. Presiona Nueva Partida para continuar.';
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
        ctx.fillStyle = '#344e41';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#588157';
        ctx.fillRect(food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4);

        ctx.fillStyle = '#dad7cd';
        snake.forEach(s => {
            ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
        });
    }

    function changeDir(d) {
        if (d === 'LEFT' && dir.x === 0) dir = { x: -1, y: 0 };
        if (d === 'RIGHT' && dir.x === 0) dir = { x: 1, y: 0 };
        if (d === 'UP' && dir.y === 0) dir = { x: 0, y: -1 };
        if (d === 'DOWN' && dir.y === 0) dir = { x: 0, y: 1 };
    }

    document.querySelectorAll('[data-sdir]').forEach(btn => {
        btn.addEventListener('click', () => changeDir(btn.dataset.sdir));
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') changeDir('LEFT');
        if (e.key === 'ArrowRight') changeDir('RIGHT');
        if (e.key === 'ArrowUp') changeDir('UP');
        if (e.key === 'ArrowDown') changeDir('DOWN');
    });

    document.getElementById('snake-reset').addEventListener('click', initSnake);
    initSnake();
}