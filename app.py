import os
import subprocess
from flask import Flask, render_template, send_from_directory, request, abort

app = Flask(__name__)

REPO_PATH = '/home/viscayaleonardo/personal_web'
WSGI_FILE = '/var/www/viscayaleonardo_pythonanywhere_com_wsgi.py'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/arcade')
def arcade():
    return render_template('arcade.html')

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