// 1. Efecto Spotlight + Tilt 3D suave en las tarjetas Bento
const cards = document.querySelectorAll('.bento-card');

cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Variables para el brillo radial en CSS
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);

        // Inclinación sutil 3D
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -2.5;
        const rotateY = ((x - centerX) / centerX) * 2.5;

        card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-3px)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0)';
    });
});

// 2. Conmutador de Tema (Crema <-> Bosque)
const themeBtn = document.getElementById('theme-toggle');
themeBtn.addEventListener('click', () => {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'cream' ? 'forest' : 'cream';
    html.setAttribute('data-theme', next);
});

// 3. Mini-Buscaminas 4x4 en vivo dentro del Bento
const boardEl = document.getElementById('mini-board');
const modeBtn = document.getElementById('mode-toggle');
const resetBtn = document.getElementById('reset-mines');
let flagMode = false;
let mines = new Set();
let gameOver = false;

modeBtn.addEventListener('click', () => {
    flagMode = !flagMode;
    modeBtn.textContent = flagMode ? '🚩 Bandera' : '⛏️ Cavar';
    modeBtn.classList.toggle('active-dig', !flagMode);
});

function initMiniMinesweeper() {
    boardEl.innerHTML = '';
    mines.clear();
    gameOver = false;
    while (mines.size < 3) {
        mines.add(Math.floor(Math.random() * 16));
    }

    for (let i = 0; i < 16; i++) {
        const cell = document.createElement('button');
        cell.className = 'mine-cell';
        cell.addEventListener('click', () => handleCellClick(i, cell));
        boardEl.appendChild(cell);
    }
}

function handleCellClick(idx, cell) {
    if (gameOver || cell.classList.contains('revealed')) return;
    if (flagMode) {
        cell.textContent = cell.textContent === '🚩' ? '' : '🚩';
        if (navigator.vibrate) navigator.vibrate(30);
        return;
    }
    if (cell.textContent === '🚩') return;

    cell.classList.add('revealed');
    if (mines.has(idx)) {
        cell.textContent = '💣';
        cell.classList.add('boom');
        gameOver = true;
        return;
    }

    // Contar minas vecinas en matriz 4x4
    const r = Math.floor(idx / 4), c = idx % 4;
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4 && mines.has(nr * 4 + nc)) count++;
        }
    }
    cell.textContent = count > 0 ? count : '';
}

resetBtn.addEventListener('click', initMiniMinesweeper);
initMiniMinesweeper();

// 4. Mini-Simulación Orbital en Canvas
const canvas = document.getElementById('gravity-canvas');
const ctx = canvas.getContext('2d');
let particles = [];
let attractor = { x: 120, y: 100 };

function resizeCanvas() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
    attractor = { x: canvas.width / 2, y: canvas.height / 2 };
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    attractor.x = e.clientX - r.left;
    attractor.y = e.clientY - r.top;
});

for (let i = 0; i < 18; i++) {
    particles.push({
        x: Math.random() * 200,
        y: Math.random() * 200,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2
    });
}

function animateOrbit() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--leaf-primary').trim();
    ctx.fillStyle = accent;

    // Atractor central
    ctx.beginPath();
    ctx.arc(attractor.x, attractor.y, 5, 0, Math.PI * 2);
    ctx.fill();

    particles.forEach(p => {
        const dx = attractor.x - p.x;
        const dy = attractor.y - p.y;
        const distSq = Math.max(dx * dx + dy * dy, 120);
        const force = 35 / distSq;
        p.vx += dx * force;
        p.vy += dy * force;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.x += p.vx;
        p.y += p.vy;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
    });
    requestAnimationFrame(animateOrbit);
}
animateOrbit();

// 5. Registro del Service Worker (Modo Offline)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}