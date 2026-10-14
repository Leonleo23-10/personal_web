// 1. Cursor personalizado y vista previa flotante
const cursor = document.getElementById('custom-cursor');
const preview = document.getElementById('floating-preview');
const previewTag = document.getElementById('preview-tag');

if (cursor) {
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
        if (preview) {
            preview.style.left = `${e.clientX}px`;
            preview.style.top = `${e.clientY}px`;
        }
    });
}

// 2. Despliegue de Proyectos (Acordeón completo al hacer clic)
document.querySelectorAll('.work-item').forEach(item => {
    const row = item.querySelector('.work-row');
    row.addEventListener('mouseenter', () => {
        if (cursor) cursor.classList.add('hovered');
        if (preview && previewTag) {
            previewTag.textContent = row.dataset.preview;
            preview.classList.add('visible');
        }
    });
    row.addEventListener('mouseleave', () => {
        if (cursor) cursor.classList.remove('hovered');
        if (preview) preview.classList.remove('visible');
    });
    row.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        document.querySelectorAll('.work-item').forEach(el => el.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
    });
});

// 3. Navegación y cambio de tema
document.querySelectorAll('.mode-pill').forEach(pill => {
    pill.addEventListener('click', () => {
        if (pill.id === 'theme-toggle') {
            const html = document.documentElement;
            html.dataset.mode = html.dataset.mode === 'light' ? 'dark' : 'light';
            return;
        }
        const target = pill.dataset.target;
        if (target && document.querySelector(target)) {
            document.querySelectorAll('.mode-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            document.querySelector(target).scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// 4. Buscaminas con función CHORDING (clic en casilla descubierta desbloquea vecinas si las banderas coinciden)
let SIZE = 8;
let MINES_COUNT = 10;
const boardEl = document.getElementById('minesweeper-board');
const statusEl = document.getElementById('mine-status');
const modeBtn = document.getElementById('mode-toggle');
const resetBtn = document.getElementById('reset-mines');

let flagMode = false;
let firstClick = true;
let gameOver = false;
let mines = new Set();
let cells = [];
let counts = [];

if (modeBtn) {
    modeBtn.addEventListener('click', () => {
        flagMode = !flagMode;
        modeBtn.textContent = flagMode ? 'Modo: Bandera (F)' : 'Modo: Cavar';
        modeBtn.classList.toggle('active', !flagMode);
    });
}

// Botones de dificultad en /arcade
document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        SIZE = parseInt(btn.dataset.size, 10);
        MINES_COUNT = parseInt(btn.dataset.mines, 10);
        boardEl.style.gridTemplateColumns = `repeat(${SIZE}, minmax(30px, 40px))`;
        initBoard();
    });
});

function getNeighbors(idx) {
    const r = Math.floor(idx / SIZE), c = idx % SIZE;
    const list = [];
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) {
                list.push(nr * SIZE + nc);
            }
        }
    }
    return list;
}

function initBoard() {
    if (!boardEl) return;
    boardEl.innerHTML = '';
    mines.clear();
    cells = [];
    counts = new Array(SIZE * SIZE).fill(0);
    firstClick = true;
    gameOver = false;
    if (statusEl) {
        statusEl.textContent = `Minas: ${MINES_COUNT} · Haz clic sobre un número descubierto con sus banderas listas para despejar alrededor.`;
    }

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
    const safeZone = new Set([safeIndex, ...getNeighbors(safeIndex)]);
    while (mines.size < MINES_COUNT) {
        const idx = Math.floor(Math.random() * (SIZE * SIZE));
        if (!safeZone.has(idx)) mines.add(idx);
    }
    for (let i = 0; i < SIZE * SIZE; i++) {
        counts[i] = getNeighbors(i).filter(n => mines.has(n)).length;
    }
}

function toggleFlag(idx) {
    const cell = cells[idx];
    if (gameOver || cell.classList.contains('revealed')) return;
    const isFlagged = cell.classList.toggle('flagged');
    cell.textContent = isFlagged ? 'F' : '';
}

function onCellClick(idx) {
    if (gameOver) return;
    const cell = cells[idx];

    // SI LA CASILLA YA ESTÁ DESCUBIERTA: Ejecutar Chording (desbloquear vecinas si la cuota de banderas se cumplió)
    if (cell.classList.contains('revealed')) {
        const neededFlags = counts[idx];
        if (neededFlags > 0) {
            const neighbors = getNeighbors(idx);
            const placedFlags = neighbors.filter(n => cells[n].classList.contains('flagged')).length;
            if (placedFlags === neededFlags) {
                neighbors.forEach(n => {
                    if (!cells[n].classList.contains('flagged') && !cells[n].classList.contains('revealed')) {
                        triggerReveal(n);
                    }
                });
                checkWin();
            }
        }
        return;
    }

    if (flagMode) {
        toggleFlag(idx);
        return;
    }

    if (cell.classList.contains('flagged')) return;

    if (firstClick) {
        placeMines(idx);
        firstClick = false;
    }

    triggerReveal(idx);
    checkWin();
}

function triggerReveal(idx) {
    if (mines.has(idx)) {
        cells[idx].textContent = 'X';
        cells[idx].classList.add('boom');
        statusEl.textContent = 'Partida terminada: pisaste una mina. Presiona Reiniciar Tablero.';
        gameOver = true;
        mines.forEach(m => {
            if (!cells[m].classList.contains('flagged')) cells[m].textContent = 'X';
        });
        return;
    }
    revealCell(idx);
}

function revealCell(idx) {
    const cell = cells[idx];
    if (cell.classList.contains('revealed') || cell.classList.contains('flagged')) return;
    cell.classList.add('revealed');

    const count = counts[idx];
    if (count > 0) {
        cell.textContent = count;
    } else {
        getNeighbors(idx).forEach(nIdx => revealCell(nIdx));
    }
}

function checkWin() {
    if (gameOver) return;
    const revealedCount = cells.filter(c => c.classList.contains('revealed')).length;
    if (revealedCount === SIZE * SIZE - MINES_COUNT) {
        statusEl.textContent = 'Tablero completado con éxito. Todas las minas fueron despejadas.';
        gameOver = true;
    }
}

if (resetBtn) resetBtn.addEventListener('click', initBoard);
initBoard();

// 5. Laboratorio de Mini Experimentos en Canvas (Gravedad y Ondas)
const expCanvas = document.getElementById('experiment-canvas');
if (expCanvas) {
    const ctx = expCanvas.getContext('2d');
    const paramSlider = document.getElementById('sim-param');
    const resetSimBtn = document.getElementById('sim-reset');
    const captionEl = document.getElementById('canvas-caption');
    let currentSim = 'gravity';
    let particles = [];
    let pointer = { x: 200, y: 180 };
    let phase = 0;

    function resizeExpCanvas() {
        expCanvas.width = expCanvas.parentElement.clientWidth;
        expCanvas.height = expCanvas.parentElement.clientHeight - 36;
        pointer = { x: expCanvas.width / 2, y: expCanvas.height / 2 };
    }

    function initParticles() {
        particles = [];
        for (let i = 0; i < 32; i++) {
            particles.push({
                x: Math.random() * expCanvas.width,
                y: Math.random() * expCanvas.height,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3
            });
        }
    }

    window.addEventListener('resize', resizeExpCanvas);
    resizeExpCanvas();
    initParticles();

    expCanvas.addEventListener('mousemove', (e) => {
        const r = expCanvas.getBoundingClientRect();
        pointer.x = e.clientX - r.left;
        pointer.y = e.clientY - r.top;
    });

    document.querySelectorAll('.exp-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.exp-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSim = btn.dataset.sim;
            captionEl.textContent = currentSim === 'gravity'
                ? 'Mueve el cursor para alterar la posición del atractor gravitacional.'
                : 'Interferencia constructiva y destructiva entre dos fuentes armónicas.';
        });
    });

    resetSimBtn.addEventListener('click', initParticles);

    function renderLoop() {
        ctx.fillStyle = '#344e41';
        ctx.fillRect(0, 0, expCanvas.width, expCanvas.height);
        const param = parseFloat(paramSlider.value);

        if (currentSim === 'gravity') {
            ctx.fillStyle = '#dad7cd';
            ctx.beginPath();
            ctx.arc(pointer.x, pointer.y, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#a3b18a';
            particles.forEach(p => {
                const dx = pointer.x - p.x;
                const dy = pointer.y - p.y;
                const distSq = Math.max(dx * dx + dy * dy, 160);
                const force = (param * 1.4) / distSq;
                p.vx = (p.vx + dx * force) * 0.99;
                p.vy = (p.vy + dy * force) * 0.99;
                p.x += p.vx;
                p.y += p.vy;

                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();
            });
        } else {
            phase += 0.06;
            const freq = param * 0.004;
            ctx.strokeStyle = '#a3b18a';
            ctx.lineWidth = 2;
            for (let row = 30; row < expCanvas.height; row += 28) {
                ctx.beginPath();
                for (let x = 0; x < expCanvas.width; x += 6) {
                    const d1 = Math.hypot(x - pointer.x, row - pointer.y);
                    const yOffset = Math.sin(d1 * freq - phase) * 10;
                    if (x === 0) ctx.moveTo(x, row + yOffset);
                    else ctx.lineTo(x, row + yOffset);
                }
                ctx.stroke();
            }
        }
        requestAnimationFrame(renderLoop);
    }
    renderLoop();
}

// 6. Formulario de Contacto y gestor de instalación PWA
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const feedback = document.getElementById('form-feedback');
        feedback.textContent = 'Mensaje registrado correctamente. Me pondré en contacto contigo pronto.';
        contactForm.reset();
    });
}

let deferredPrompt;
const pwaBtn = document.getElementById('pwa-install-btn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
});

if (pwaBtn) {
    pwaBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
        } else {
            alert('El Arcade ya está guardado en caché para uso offline o puedes añadirlo a tu pantalla de inicio desde el menú del navegador.');
        }
    });
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}