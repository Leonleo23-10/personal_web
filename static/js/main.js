/**
 * ============================================================================
 * ARCHIVO CENTRAL DE INTERACTIVIDAD Y LÓGICA: static/js/main.js
 * ============================================================================
 * ÍNDICE DE MÓDULOS DE ESTE ARCHIVO:
 *   [MÓDULO 0] Activos Vectoriales SVG (Banderas, Minas y Cursores).
 *   [MÓDULO 1] Cursor Magnético Personalizado y Etiqueta Flotante (Awwwards UI).
 *   [MÓDULO 2] Acordeón Desplegable de Casos de Estudio (Sección Proyectos).
 *   [MÓDULO 3] Navegación de Scroll Suave y Conmutador de Tema (Claro / Oscuro).
 *   [MÓDULO 4] Motor Completo de Buscaminas (Primer clic seguro + Chording).
 *   [MÓDULO 5] Motor del Sandbox Físico en Portada (index.html).
 *   [MÓDULO 6] Motor Multi-Lienzo para la página /experimentos.
 *   [MÓDULO 7] Instalador de Aplicaciones Web Progresivas (PWA) por Cartucho.
 * ============================================================================
 */

/* ============================================================================
   [MÓDULO 0] ACTIVOS VECTORIALES SVG
   Si deseas cambiar el diseño o el color de la bandera o la mina en el futuro,
   solo modifica los atributos `fill` o `stroke` de estos strings SVG.
   ============================================================================ */
const SVG_FLAG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 21V4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M5 4L19 9L5 14V4Z" fill="#588157" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
</svg>`;

const SVG_PICK = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2.2"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
</svg>`;

const SVG_MINE = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="5.5" fill="currentColor"/>
    <path d="M12 3V21M3 12H21M5.6 5.6L18.4 18.4M18.4 5.6L5.6 18.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
</svg>`;


/* ============================================================================
   [MÓDULO 1] CURSOR PERSONALIZADO Y ETIQUETA FLOTANTE
   Actualiza las coordenadas `left` y `top` del círculo `.custom-cursor` y de
   la píldora `.floating-preview` cuando el usuario mueve el ratón.
   ============================================================================ */
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


/* ============================================================================
   [MÓDULO 2] ACORDEÓN DE CASOS DE ESTUDIO (PROYECTOS)
   Detecta todos los contenedores `.work-item`. Al hacer clic en su fila
   superior (`.work-row`), cierra los demás proyectos abiertos y despliega
   únicamente el seleccionado alternando la clase CSS `.open`.
   ============================================================================ */
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


/* ============================================================================
   [MÓDULO 3] NAVEGACIÓN POR PÍLDORAS Y CAMBIO DE TEMA (LIGHT / DARK)
   Alterna el atributo `data-mode` en la etiqueta raíz `<html>` entre "light"
   (fondo Dust Grey) y "dark" (fondo Pine Teal).
   ============================================================================ */
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


/* ============================================================================
   [MÓDULO 4] MOTOR DEL BUSCAMINAS (PRIMER CLIC SEGURO + FUNCIÓN CHORDING)
   REGLAS IMPLEMENTADAS:
   1. `firstClick`: Las minas nunca se colocan hasta después de que el usuario
      hace el primer clic, garantizando que la primera casilla y sus 8 vecinas
      estén siempre despejadas.
   2. `Chording`: Si el usuario hace clic sobre una casilla que YA está revelada
      (`cell.classList.contains('revealed')`) y el número de banderas colocadas
      alrededor coincide exactamente con `counts[idx]`, se revelan de golpe
      todas las casillas vecinas no abanderadas.
   ============================================================================ */
let SIZE = 8;
let MINES_COUNT = 10;
const boardEl = document.getElementById('minesweeper-board');
const statusEl = document.getElementById('mine-status');
const modeBtn = document.getElementById('mode-toggle');
const modeIcon = document.getElementById('mode-icon');
const modeLabel = document.getElementById('mode-label');
const resetBtn = document.getElementById('reset-mines');

let flagMode = false;
let firstClick = true;
let gameOver = false;
let mines = new Set();
let cells = [];
let counts = [];

function updateModeButtonUI() {
    if (!modeBtn) return;
    if (modeIcon) modeIcon.innerHTML = flagMode ? SVG_FLAG : SVG_PICK;
    if (modeLabel) modeLabel.textContent = flagMode ? 'Modo: Bandera' : 'Modo: Cavar';
    modeBtn.classList.toggle('active', !flagMode);
}

if (modeBtn) {
    updateModeButtonUI();
    modeBtn.addEventListener('click', () => {
        flagMode = !flagMode;
        updateModeButtonUI();
    });
}

// Selector de dificultad (8x8, 10x10, 12x12) en la vista individual del juego
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
    cell.innerHTML = isFlagged ? SVG_FLAG : '';
}

function onCellClick(idx) {
    if (gameOver) return;
    const cell = cells[idx];

    // Lógica de Chording (Despeje rápido de vecinas alrededor de una celda ya descubierta)
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
        cells[idx].innerHTML = SVG_MINE;
        cells[idx].classList.add('boom');
        statusEl.textContent = 'Partida terminada: pisaste una mina. Presiona Reiniciar Tablero.';
        gameOver = true;
        mines.forEach(m => {
            if (!cells[m].classList.contains('flagged')) cells[m].innerHTML = SVG_MINE;
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


/* ============================================================================
   [MÓDULO 5] MOTOR DEL SANDBOX FÍSICO EN PORTADA (index.html)
   Controla el lienzo `#experiment-canvas` de la página de inicio.
   ============================================================================ */
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
                : 'Interferencia constructiva y destructiva entre frentes de onda.';
        });
    });

    if (resetSimBtn) resetSimBtn.addEventListener('click', initParticles);

    function renderLoop() {
        ctx.fillStyle = '#344e41';
        ctx.fillRect(0, 0, expCanvas.width, expCanvas.height);
        const param = paramSlider ? parseFloat(paramSlider.value) : 45;

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


/* ============================================================================
   [MÓDULO 6] MOTOR MULTI-LIENZO PARA LA PÁGINA /experimentos
   CÓMO AGREGAR UN NUEVO EXPERIMENTO EN `templates/experimentos.html`:
   1. Añade una nueva sección `<section class="experiments-section" id="exp-04">`
      con un `<canvas id="canvas-nuevo" class="multi-exp-canvas" data-type="nuevo">`.
   2. En este bucle, añade un bloque `else if (type === 'nuevo') { ... }` con
      las ecuaciones de dibujo que desees graficar.
   ============================================================================ */
document.querySelectorAll('.multi-exp-canvas').forEach(canvas => {
    const ctx = canvas.getContext('2d');
    const type = canvas.dataset.type;
    const slider = document.querySelector(`.lab-slider[data-canvas="${canvas.id}"]`);
    let pointer = { x: 200, y: 180 };
    let phase = 0;
    let particles = [];

    function resize() {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight || 360;
        pointer = { x: canvas.width / 2, y: canvas.height / 2 };
    }
    resize();
    window.addEventListener('resize', resize);

    for (let i = 0; i < 30; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: (Math.random() - 0.5) * 2.5,
            vy: (Math.random() - 0.5) * 2.5
        });
    }

    canvas.addEventListener('mousemove', (e) => {
        const r = canvas.getBoundingClientRect();
        pointer.x = e.clientX - r.left;
        pointer.y = e.clientY - r.top;
    });

    function animate() {
        ctx.fillStyle = '#344e41';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const val = slider ? parseFloat(slider.value) : 40;

        if (type === 'gravity') {
            ctx.fillStyle = '#dad7cd';
            ctx.beginPath();
            ctx.arc(pointer.x, pointer.y, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#a3b18a';
            particles.forEach(p => {
                const dx = pointer.x - p.x, dy = pointer.y - p.y;
                const d2 = Math.max(dx * dx + dy * dy, 150);
                const f = (val * 1.4) / d2;
                p.vx = (p.vx + dx * f) * 0.99;
                p.vy = (p.vy + dy * f) * 0.99;
                p.x += p.vx; p.y += p.vy;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();
            });
        } else if (type === 'waves') {
            phase += 0.06;
            ctx.strokeStyle = '#a3b18a';
            ctx.lineWidth = 2;
            for (let row = 28; row < canvas.height; row += 26) {
                ctx.beginPath();
                for (let x = 0; x < canvas.width; x += 6) {
                    const d = Math.hypot(x - pointer.x, row - pointer.y);
                    const yOff = Math.sin(d * (val * 0.004) - phase) * 10;
                    if (x === 0) ctx.moveTo(x, row + yOff);
                    else ctx.lineTo(x, row + yOff);
                }
                ctx.stroke();
            }
        } else if (type === 'field') {
            ctx.strokeStyle = '#a3b18a';
            ctx.lineWidth = 2;
            const step = 36;
            for (let x = step; x < canvas.width - 10; x += step) {
                for (let y = step; y < canvas.height - 10; y += step) {
                    const angle = Math.atan2(pointer.y - y, pointer.x - x);
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x + Math.cos(angle) * val, y + Math.sin(angle) * val);
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animate);
    }
    animate();
});


/* ============================================================================
   [MÓDULO 7] FORMULARIO DE CONTACTO E INSTALACIÓN PWA INDIVIDUAL POR JUEGO
   Si el `<body>` tiene el atributo `data-game-scope="/arcade/<id>/"`, registra
   el Service Worker exclusivo de ese cartucho para aislar su instalación.
   ============================================================================ */
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const feedback = document.getElementById('form-feedback');
        feedback.textContent = 'Mensaje registrado correctamente. Me pondré en contacto contigo pronto.';
        contactForm.reset();
    });
}

let deferredPrompt = null;
const pwaBtn = document.getElementById('pwa-install-btn');
const gameScope = document.body.dataset.gameScope;

if ('serviceWorker' in navigator) {
    if (gameScope) {
        navigator.serviceWorker.register(`${gameScope}sw.js`, { scope: gameScope });
    } else {
        navigator.serviceWorker.register('/sw.js');
    }
}

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
            alert('Si estás en iOS (Safari) o ya instalaste la app, usa el menú del navegador -> "Agregar a la pantalla de inicio" para crear el acceso directo individual de este juego.');
        }
    });
}