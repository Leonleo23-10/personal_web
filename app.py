import os
import subprocess
from flask import Flask, render_template, send_from_directory, request, abort, jsonify, Response

app = Flask(__name__)

REPO_PATH = '/home/viscayaleonardo/personal_web'
WSGI_FILE = '/var/www/viscayaleonardo_pythonanywhere_com_wsgi.py'

# Catálogo de juegos instalables individualmente como PWA
GAMES = {
    'buscaminas': {
        'title': 'Buscaminas Botánico',
        'short_name': 'Buscaminas',
        'description': 'Buscaminas táctil con despeje rápido y cero anuncios.'
    },
    'sudoku': {
        'title': 'Sudoku Minimalista',
        'short_name': 'Sudoku',
        'description': 'Sudoku limpio con notas por casilla y guardado offline.'
    }
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/arcade')
def arcade():
    return render_template('arcade.html', games=GAMES)

# Ruta individual de cada juego (con barra final para aislar el scope de la PWA)
@app.route('/arcade/<game_id>/')
def play_game(game_id):
    if game_id not in GAMES:
        abort(404)
    return render_template('game_pwa.html', game_id=game_id, game=GAMES[game_id])

# Manifest dinámico exclusivo para cada juego
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

# Service Worker con alcance individual para cada juego
@app.route('/arcade/<game_id>/sw.js')
def game_sw(game_id):
    sw_code = f"""
    const CACHE_NAME = 'pwa-game-{game_id}-v1';
    const URLS = [
        '/arcade/{game_id}/',
        '/static/css/style.css',
        '/static/js/main.js',
        '/arcade/{game_id}/manifest.json',
        '/arcade/{game_id}/icon.svg'
    ];
    self.addEventListener('install', e => {{
        self.skipWaiting();
        e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(URLS)));
    }});
    self.addEventListener('fetch', e => {{
        e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
    }});
    """
    return Response(sw_code, mimetype='application/javascript')

# Ícono vectorial generado con tu paleta para que el navegador valide la PWA
@app.route('/arcade/<game_id>/icon.svg')
def game_icon(game_id):
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
        <rect width="512" height="512" rx="110" fill="#344e41"/>
        <rect x="64" y="64" width="384" height="384" rx="70" fill="#3a5a40" stroke="#a3b18a" stroke-width="12"/>
        <path d="M190 130v252M190 140l160 65-160 65" fill="#588157" stroke="#dad7cd" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>"""
    return Response(svg, mimetype='image/svg+xml')

# Nueva sección dedicada a Mini Experimentos
@app.route('/experimentos')
def experimentos():
    return render_template('experimentos.html')

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
    app.run(debug=True, port=5000)