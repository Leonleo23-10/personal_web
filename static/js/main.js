// 1. Cursor personalizado y vista previa flotante en las filas de proyectos
const cursor = document.getElementById('custom-cursor');
const preview = document.getElementById('floating-preview');
const previewTag = document.getElementById('preview-tag');

document.addEventListener('mousemove', (e) => {
    cursor.style.left = `${e.clientX}px`;
    cursor.style.top = `${e.clientY}px`;
    preview.style.left = `${e.clientX}px`;
    preview.style.top = `${e.clientY}px`;
});

document.querySelectorAll('.work-row').forEach(row => {
    row.addEventListener('mouseenter', () => {
        cursor.classList.add('hovered');
        previewTag.textContent = row.dataset.preview;
        preview.classList.add('visible');
    });
    row.addEventListener('mouseleave', () => {
        cursor.classList.remove('hovered');
        preview.classList.remove('visible');
    });
});

// 2. Navegación por píldoras (Proyectos / Arcade / Tema Claro-Oscuro)
document.querySelectorAll('.mode-pill').forEach(pill => {
    pill.addEventListener('click', () => {
        const target = pill.dataset.target;
        if (target === 'theme') {
            const html = document.documentElement;
            html.dataset.mode = html.dataset.mode === 'light' ? 'dark' : 'light';
            return;
        }
        document.querySelectorAll('.mode-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const section = target === 'work' ? '#proyectos' : '#arcade';
        document.querySelector(section).scrollIntoView({ behavior: 'smooth' });
    });
});

// 3. Buscaminas 8x8 con "Primer Clic Siempre Seguro"
const SIZE = 8;
const MINES_COUNT = 10;
const boardEl = document.getElementById('minesweeper-board');
const statusEl = document.getElementById('mine-status');
const modeBtn = document.getElementById('mode-toggle');
const resetBtn = document.getElementById('reset-mines');

let flagMode = false;
let firstClick = true;
let gameOver = false;
let mines = new Set();
let cells = [];

modeBtn.addEventListener('click', () => {
    flagMode = !flagMode;
    modeBtn.textContent = flagMode ? '🚩 Modo Bandera' : '⛏️ Modo Cavar';
    modeBtn.classList.toggle('active', !flagMode);
});

function initBoard() {
    boardEl.innerHTML = '';
    mines.clear();
    cells = [];
    firstClick = true;
    gameOver = false;
    statusEl.textContent = 'Minas ocultas: 10 · Primer clic siempre seguro.';

    for (let i = 0; i < SIZE * SIZE; i++) {
        const btn = document.createElement('button');
        btn.className = 'mine-cell';
        btn.addEventListener('click', () => onCellClick(i));
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            toggleFlag(i);
        });
        boardEl.appendChild(btn);
        cells.push(btn);
    }
}

function placeMines(safeIndex) {
    while (mines.size < MINES_COUNT) {
        const idx = Math.floor(Math.random() * (SIZE * SIZE));
        if (idx !== safeIndex) mines.add(idx);
    }
}

function toggleFlag(idx) {
    const cell = cells[idx];
    if (gameOver || cell.classList.contains('revealed')) return;
    cell.textContent = cell.textContent === '🚩' ? '' : '🚩';
    if (navigator.vibrate) navigator.vibrate(25);
}

function onCellClick(idx) {
    if (gameOver) return;
    if (flagMode) {
        toggleFlag(idx);
        return;
    }

    const cell = cells[idx];
    if (cell.textContent === '🚩' || cell.classList.contains('revealed')) return;

    if (firstClick) {
        placeMines(idx);
        firstClick = false;
    }

    if (mines.has(idx)) {
        cell.textContent = '💣';
        cell.classList.add('boom');
        statusEl.textContent = '💥 ¡Pisaste una mina! Dale a "Nuevo Tablero" para intentar otra vez.';
        gameOver = true;
        mines.forEach(m => { cells[m].textContent = '💣'; });
        return;
    }

    revealCell(idx);
    checkWin();
}

function revealCell(idx) {
    const cell = cells[idx];
    if (cell.classList.contains('revealed') || cell.textContent === '🚩') return;
    cell.classList.add('revealed');

    const r = Math.floor(idx / SIZE), c = idx % SIZE;
    let count = 0;
    const neighbors = [];

    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
                const nIdx = nr * SIZE + nc;
                neighbors.push(nIdx);
                if (mines.has(nIdx)) count++;
            }
        }
    }

    if (count > 0) {
        cell.textContent = count;
    } else {
        neighbors.forEach(nIdx => revealCell(nIdx));
    }
}

function checkWin() {
    const revealedCount = cells.filter(c => c.classList.contains('revealed')).length;
    if (revealedCount === SIZE * SIZE - MINES_COUNT) {
        statusEl.textContent = ' ¡Victoria! Despejaste todo el campo.';
        gameOver = true;
    }
}

resetBtn.addEventListener('click', initBoard);
initBoard();

// 4. Botón para descargar la página como archivo .HTML 100% portable y offline
document.getElementById('download-game').addEventListener('click', () => {
    const htmlContent = document.documentElement.outerHTML;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'buscaminas_botanico_offline.html';
    a.click();
});