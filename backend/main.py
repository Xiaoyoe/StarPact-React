# Python 后端主文件
from flask import Flask, jsonify, request
import os

app = Flask(__name__)

@app.route('/api/test', methods=['GET'])
def test():
    return jsonify({'message': 'Python backend is working!'})

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
