"""
===============================================================================
ARCHIVO PRINCIPAL DE SERVIDOR: app.py
===============================================================================
Incluye base de datos SQLite (portfolio.db) para almacenar:
1. Mensajes del formulario de contacto (tabla `messages`).
2. Récords históricos de cada juego del Arcade (tabla `game_scores`).
===============================================================================
"""

import os
import sqlite3
import subprocess
from flask import Flask, render_template, send_from_directory, request, abort, jsonify, Response

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))
except ImportError:
    pass

app = Flask(__name__)

REPO_PATH = os.getenv('REPO_PATH', '/home/viscayaleonardo/personal_web')
WSGI_FILE = os.getenv('WSGI_FILE', '/var/www/viscayaleonardo_pythonanywhere_com_wsgi.py')
DB_NAME = os.getenv('DB_NAME', 'portfolio.db')
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), DB_NAME)


# =============================================================================
# INICIALIZACIÓN Y CONEXIÓN A BASE DE DATOS SQLITE
# =============================================================================
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS game_scores (
                game_id TEXT PRIMARY KEY,
                best_score INTEGER NOT NULL DEFAULT 0,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()

init_db()


# =============================================================================
# CATÁLOGO CENTRAL DEL ARCADE
# =============================================================================
GAMES = {
    'buscaminas': {
        'number': '01',
        'title': 'Buscaminas',
        'short_name': 'Buscaminas',
        'status': 'DISPONIBLE',
        'score_label': 'VICTORIAS',
        'description': 'Versión táctil con banderas vectoriales, primer clic garantizado sin mina, despeje rápido (chording) y tres tamaños de tablero.',
        'svg_path': '<path d="M190 130v252M190 140l160 65-160 65" fill="#588157" stroke="#dad7cd" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>'
    },
    'sudoku': {
        'number': '02',
        'title': 'Sudoku',
        'short_name': 'Sudoku',
        'status': 'DISPONIBLE',
        'score_label': 'RESUELTOS',
        'description': 'Tableros con selector numérico emergente al tocar cada casilla, iluminación de ejes y validación instantánea.',
        'svg_path': '<path d="M140 215h232M140 297h232M215 140v232M297 140v232" stroke="#dad7cd" stroke-width="20" stroke-linecap="round"/>'
    },
    'solitario': {
        'number': '03',
        'title': 'Solitario',
        'short_name': 'Solitario',
        'status': 'DISPONIBLE',
        'score_label': 'VICTORIAS',
        'description': 'Baraja con arrastre libre (Drag & Drop táctil y con ratón), apilamiento en cascada y auto-envío con doble toque.',
        'svg_path': '<rect x="175" y="135" width="162" height="242" rx="22" fill="#588157" stroke="#dad7cd" stroke-width="20"/><circle cx="256" cy="256" r="34" fill="#dad7cd"/>'
    },
    'tetris': {
        'number': '04',
        'title': 'Tetris',
        'short_name': 'Tetris',
        'status': 'DISPONIBLE',
        'score_label': 'RÉCORD PTS',
        'description': 'Lienzo central maximizado con pieza fantasma de guía, gestos táctiles de deslizamiento y rotación con un toque.',
        'svg_path': '<path d="M160 220h192v64H160zM224 156h64v64h-64z" fill="#588157" stroke="#dad7cd" stroke-width="18" stroke-linejoin="round"/>'
    },
    '2048': {
        'number': '05',
        'title': '2048',
        'short_name': '2048',
        'status': 'DISPONIBLE',
        'score_label': 'RÉCORD PTS',
        'description': 'Matriz 4x4 centrada de gran formato controlada directamente deslizando el dedo sobre el tablero o con el teclado.',
        'svg_path': '<rect x="150" y="150" width="95" height="95" rx="16" fill="#588157" stroke="#dad7cd" stroke-width="16"/><rect x="267" y="267" width="95" height="95" rx="16" fill="#a3b18a" stroke="#dad7cd" stroke-width="16"/>'
    },
    'snake': {
        'number': '06',
        'title': 'Snake',
        'short_name': 'Snake',
        'status': 'DISPONIBLE',
        'score_label': 'MÁX LONGITUD',
        'description': 'Lienzo maximizado controlado por gestos de deslizamiento directo en pantalla o teclado, con bordes continuos.',
        'svg_path': '<path d="M150 320h110V200h102" fill="none" stroke="#dad7cd" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/><circle cx="362" cy="145" r="18" fill="#a3b18a"/>'
    }
}


# =============================================================================
# RUTAS DE VISTAS Y API SQLITE (MENSAJES Y RÉCORDS)
# =============================================================================
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/arcade')
def arcade():
    return render_template('arcade.html', games=GAMES)

@app.route('/experimentos')
def experimentos():
    return render_template('experimentos.html')

@app.route('/api/contact', methods=['POST'])
def api_contact():
    """Guarda un mensaje del formulario de contacto en la tabla SQLite `messages`."""
    data = request.get_json(silent=True) or request.form
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip()
    message = (data.get('message') or '').strip()
    if not name or not email or not message:
        return jsonify({'ok': False, 'error': 'Todos los campos son obligatorios.'}), 400
    with get_db() as conn:
        conn.execute(
            'INSERT INTO messages (name, email, message) VALUES (?, ?, ?)',
            (name, email, message)
        )
        conn.commit()
    return jsonify({'ok': True, 'message': 'Mensaje guardado correctamente en la base de datos.'})

@app.route('/api/scores/<game_id>', methods=['GET', 'POST'])
def api_scores(game_id):
    """Obtiene o actualiza el récord histórico de un juego en SQLite."""
    if game_id not in GAMES:
        abort(404)
    with get_db() as conn:
        row = conn.execute('SELECT best_score FROM game_scores WHERE game_id = ?', (game_id,)).fetchone()
        current_best = row['best_score'] if row else 0

        if request.method == 'POST':
            data = request.get_json(silent=True) or {}
            new_score = int(data.get('score', 0))
            if new_score > current_best:
                current_best = new_score
                conn.execute('''
                    INSERT INTO game_scores (game_id, best_score, updated_at)
                    VALUES (?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(game_id) DO UPDATE SET
                        best_score = excluded.best_score,
                        updated_at = CURRENT_TIMESTAMP
                ''', (game_id, current_best))
                conn.commit()
        return jsonify({'game_id': game_id, 'best_score': current_best})


# =============================================================================
# RUTAS PWA POR JUEGO Y WEBHOOK DE AUTO-DEPLOY
# =============================================================================
@app.route('/arcade/<game_id>/')
def play_game(game_id):
    if game_id not in GAMES:
        abort(404)
    return render_template('game_pwa.html', game_id=game_id, game=GAMES[game_id])

@app.route('/arcade/<game_id>/manifest.json')
def game_manifest(game_id):
    if game_id not in GAMES:
        abort(404)
    game = GAMES[game_id]
    return jsonify({
        "id": f"/arcade/{game_id}/",
        "name": game['title'],
        "short_name": game['short_name'],
        "description": game['description'],
        "start_url": f"/arcade/{game_id}/",
        "scope": f"/arcade/{game_id}/",
        "display": "standalone",
        "background_color": "#dad7cd",
        "theme_color": "#344e41",
        "icons": [
            {
                "src": f"/arcade/{game_id}/icon.svg",
                "sizes": "192x192 512x512",
                "type": "image/svg+xml",
                "purpose": "any maskable"
            }
        ]
    })

@app.route('/arcade/<game_id>/sw.js')
def game_sw(game_id):
    if game_id not in GAMES:
        abort(404)
    sw_code = f"""
    const CACHE_NAME = 'pwa-game-{game_id}-v5';
    const URLS = [
        '/arcade/{game_id}/',
        '/static/css/style.css',
        '/static/js/main.js',
        '/static/js/arcade_engines.js',
        '/arcade/{game_id}/manifest.json',
        '/arcade/{game_id}/icon.svg'
    ];
    self.addEventListener('install', e => {{
        self.skipWaiting();
        e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(URLS)));
    }});
    self.addEventListener('activate', e => {{
        e.waitUntil(
            caches.keys().then(keys => Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )).then(() => clients.claim())
        );
    }});
    self.addEventListener('fetch', e => {{
        if (e.request.method !== 'GET') return;
        e.respondWith(
            fetch(e.request).then(res => {{
                const copy = res.clone();
                caches.open(CACHE_NAME).then(c => c.put(e.request, copy));
                return res;
            }}).catch(() => caches.match(e.request))
        );
    }});
    """
    return Response(sw_code, mimetype='application/javascript')

@app.route('/arcade/<game_id>/icon.svg')
def game_icon(game_id):
    if game_id not in GAMES:
        abort(404)
    svg_inner = GAMES[game_id]['svg_path']
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
        <rect width="512" height="512" rx="110" fill="#344e41"/>
        <rect x="64" y="64" width="384" height="384" rx="70" fill="#3a5a40" stroke="#a3b18a" stroke-width="12"/>
        {svg_inner}
    </svg>"""
    return Response(svg, mimetype='image/svg+xml')

@app.route('/sw.js')
def service_worker():
    return send_from_directory('static', 'sw.js', mimetype='application/javascript')

@app.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json', mimetype='application/json')

@app.route('/update_server', methods=['POST'])
def webhook():
    if request.method == 'POST':
        try:
            subprocess.run(['git', '-C', REPO_PATH, 'fetch', '--all'], check=True)
            subprocess.run(['git', '-C', REPO_PATH, 'reset', '--hard', 'origin/main'], check=True)
            if os.path.exists(WSGI_FILE):
                os.utime(WSGI_FILE, None)
            return 'Servidor actualizado y recargado correctamente.', 200
        except Exception as e:
            return f'Error al actualizar: {str(e)}', 500
    abort(400)

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', '1') == '1'
    app.run(debug=debug, port=port)