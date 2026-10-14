"""
===============================================================================
ARCHIVO PRINCIPAL DE SERVIDOR: app.py
===============================================================================
PROPÓSITO:
Controla las rutas principales del portafolio, el laboratorio de experimentos,
el sistema de aplicaciones web progresivas (PWA) individuales para cada juego
del Arcade y el Webhook de despliegue automático desde GitHub hacia PythonAnywhere.

GUÍA RÁPIDA DE MANTENIMIENTO:
1. ¿Cómo agregar un nuevo juego al Arcade?
   - Solo agrega una nueva clave al diccionario `GAMES` (abajo).
   - Automáticamente se creará su tarjeta en `/arcade`, su ruta `/arcade/<id>/`,
     su `manifest.json` independiente, su Service Worker y su ícono vectorial.
2. ¿Cómo agregar una nueva página HTML al sitio?
   - Crea el archivo en `templates/nombre.html` y añade una función `@app.route('/ruta')`.
===============================================================================
"""

import os
import subprocess
from flask import Flask, render_template, send_from_directory, request, abort, jsonify, Response

app = Flask(__name__)

# Configuración de rutas absolutas en el servidor PythonAnywhere
REPO_PATH = '/home/viscayaleonardo/personal_web'
WSGI_FILE = '/var/www/viscayaleonardo_pythonanywhere_com_wsgi.py'

# =============================================================================
# CATÁLOGO CENTRAL DEL ARCADE (FUENTE DE VERDAD)
# =============================================================================
# Estructura de cada cartucho:
# - number: Número de serie que se muestra en la esquina superior de la tarjeta.
# - title: Nombre completo del juego (se usa en la vista y al instalar la PWA).
# - short_name: Nombre corto que aparece debajo del ícono en la pantalla del celular.
# - status: Etiqueta de estado ('DISPONIBLE' o 'EN DESARROLLO').
# - description: Resumen técnico del juego que se muestra en el catálogo.
# - svg_path: Trazo vectorial SVG exclusivo que se dibuja en el ícono de la App.
GAMES = {
    'buscaminas': {
        'number': '01',
        'title': 'Buscaminas Botánico',
        'short_name': 'Buscaminas',
        'status': 'DISPONIBLE',
        'description': 'Versión táctil con banderas vectoriales, primer clic garantizado sin mina, despeje rápido (chording) y tres tamaños de tablero.',
        'svg_path': '<path d="M190 130v252M190 140l160 65-160 65" fill="#588157" stroke="#dad7cd" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>'
    },
    'sudoku': {
        'number': '02',
        'title': 'Sudoku Minimalista',
        'short_name': 'Sudoku',
        'status': 'DISPONIBLE',
        'description': 'Tableros generados matemáticamente con solución única, modo de anotaciones por casilla y guardado automático en memoria local.',
        'svg_path': '<path d="M140 215h232M140 297h232M215 140v232M297 140v232" stroke="#dad7cd" stroke-width="20" stroke-linecap="round"/>'
    },
    'solitario': {
        'number': '03',
        'title': 'Solitario Klondike',
        'short_name': 'Solitario',
        'status': 'DISPONIBLE',
        'description': 'Baraja vectorial de alto contraste con arrastre fluido, autocompletado inteligente al despejar columnas y cero cortes publicitarios.',
        'svg_path': '<rect x="175" y="135" width="162" height="242" rx="22" fill="#588157" stroke="#dad7cd" stroke-width="20"/><circle cx="256" cy="256" r="34" fill="#dad7cd"/>'
    },
    'tetris': {
        'number': '04',
        'title': 'Tetris Clásico',
        'short_name': 'Tetris',
        'status': 'DISPONIBLE',
        'description': 'Motor de caída de tetrominós con pieza fantasma de guía, retención de ficha (hold), controles táctiles precisos y tabla de récords.',
        'svg_path': '<path d="M160 220h192v64H160zM224 156h64v64h-64z" fill="#588157" stroke="#dad7cd" stroke-width="18" stroke-linejoin="round"/>'
    },
    '2048': {
        'number': '05',
        'title': '2048 Botánico',
        'short_name': '2048',
        'status': 'DISPONIBLE',
        'description': 'Rompecabezas numérico de deslizamiento sobre matriz 4x4 con transiciones suaves en CSS, botón de deshacer movimiento y guardado de sesión.',
        'svg_path': '<rect x="150" y="150" width="95" height="95" rx="16" fill="#588157" stroke="#dad7cd" stroke-width="16"/><rect x="267" y="267" width="95" height="95" rx="16" fill="#a3b18a" stroke="#dad7cd" stroke-width="16"/>'
    },
    'snake': {
        'number': '06',
        'title': 'Snake Retro',
        'short_name': 'Snake',
        'status': 'DISPONIBLE',
        'description': 'El clásico de Nokia reconstruido en lienzo limpio con velocidad progresiva, gestos de deslizamiento en móvil y modo sin bordes.',
        'svg_path': '<path d="M150 320h110V200h102" fill="none" stroke="#dad7cd" stroke-width="28" stroke-linecap="round" stroke-linejoin="round"/><circle cx="362" cy="145" r="18" fill="#a3b18a"/>'
    }
}

# =============================================================================
# RUTAS DE VISTAS PRINCIPALES
# =============================================================================
@app.route('/')
def index():
    """Renderiza la portada principal con Proyectos, Demo de Buscaminas, Sandbox y Contacto."""
    return render_template('index.html')

@app.route('/arcade')
def arcade():
    """Renderiza el catálogo completo iterando sobre el diccionario GAMES."""
    return render_template('arcade.html', games=GAMES)

@app.route('/experimentos')
def experimentos():
    """Renderiza la página dedicada a las simulaciones físicas en formato scroll."""
    return render_template('experimentos.html')


# =============================================================================
# ARQUITECTURA PWA INDIVIDUAL POR JUEGO (/arcade/<game_id>/)
# =============================================================================
# IMPORTANTE: La barra final '/' en '/arcade/<game_id>/' es obligatoria para que
# el navegador reconozca esa subcarpeta como un "scope" aislado y permita
# instalar cada juego como una aplicación independiente en el teléfono o PC.

@app.route('/arcade/<game_id>/')
def play_game(game_id):
    if game_id not in GAMES:
        abort(404)
    return render_template('game_pwa.html', game_id=game_id, game=GAMES[game_id])

@app.route('/arcade/<game_id>/manifest.json')
def game_manifest(game_id):
    """Genera dinámicamente el archivo manifest.json exclusivo para el juego solicitado."""
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

# En app.py, dentro de game_sw(game_id), actualiza la función así (con estrategia Network-First):
@app.route('/arcade/<game_id>/sw.js')
def game_sw(game_id):
    if game_id not in GAMES:
        abort(404)
    sw_code = f"""
    const CACHE_NAME = 'pwa-game-{game_id}-v3';
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
        e.waitUntil(clients.claim());
    }});
    // Network-First: Si hay internet baja lo más nuevo; si estás offline usa la caché
    self.addEventListener('fetch', e => {{
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
    """Renderiza el ícono vectorial de la aplicación usando el trazo definido en GAMES."""
    if game_id not in GAMES:
        abort(404)
    svg_inner = GAMES[game_id]['svg_path']
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
        <rect width="512" height="512" rx="110" fill="#344e41"/>
        <rect x="64" y="64" width="384" height="384" rx="70" fill="#3a5a40" stroke="#a3b18a" stroke-width="12"/>
        {svg_inner}
    </svg>"""
    return Response(svg, mimetype='image/svg+xml')


# =============================================================================
# SERVICE WORKER GENERAL Y WEBHOOK DE AUTO-DEPLOY
# =============================================================================
@app.route('/sw.js')
def service_worker():
    return send_from_directory('static', 'sw.js', mimetype='application/javascript')

@app.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json', mimetype='application/json')

@app.route('/update_server', methods=['POST'])
def webhook():
    """
    Endpoint invocado automáticamente por GitHub Webhooks al hacer 'git push'.
    Descarga la rama 'main', fuerza la sincronización limpia y actualiza la marca
    de tiempo del archivo WSGI para reiniciar el servidor de PythonAnywhere.
    """
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