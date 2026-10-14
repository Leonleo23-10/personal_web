import os
import subprocess
from flask import Flask, render_template, send_from_directory, request, abort

app = Flask(__name__)

# Rutas exactas de tu servidor en PythonAnywhere
REPO_PATH = '/home/viscayaleonardo/personal_web'
WSGI_FILE = '/var/www/viscayaleonardo_pythonanywhere_com_wsgi.py'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/sw.js')
def service_worker():
    return send_from_directory('static', 'sw.js', mimetype='application/javascript')

@app.route('/manifest.json')
def manifest():
    return send_from_directory('static', 'manifest.json', mimetype='application/json')

# RUTA SECRETA PARA AUTO-DEPLOY CON GITHUB WEBHOOKS
@app.route('/update_server', methods=['POST'])
def webhook():
    if request.method == 'POST':
        try:
            # 1. Hace git pull en tu carpeta de PythonAnywhere
            subprocess.run(['git', '-C', REPO_PATH, 'pull', 'origin', 'main'], check=True)
            # 2. Toca el archivo WSGI para que PythonAnywhere recargue la web sola
            if os.path.exists(WSGI_FILE):
                os.utime(WSGI_FILE, None)
            return 'Servidor actualizado y recargado con éxito 🚀', 200
        except Exception as e:
            return f'Error al actualizar: {str(e)}', 500
    abort(400)

if __name__ == '__main__':
    app.run(debug=True, port=5000)