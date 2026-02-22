#!/usr/bin/env python3
"""
Simple Python HTTP Server for WeatherFlow
Just run: python server.py
Then open: http://localhost:8000
"""

import http.server
import socketserver
import os
import webbrowser
from pathlib import Path

PORT = 8001
DIRECTORY = Path(__file__).parent

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)

def run_server():
    Handler = MyHTTPRequestHandler
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}"
        print("=" * 60)
        print("🌤️  WeatherFlow Server Started!")
        print("=" * 60)
        print(f"✅ Server running at: {url}")
        print(f"📂 Serving files from: {DIRECTORY}")
        print("\n🌐 Opening in browser...")
        print("\n💡 Press Ctrl+C to stop the server")
        print("=" * 60)
        
        try:
            # Open browser automatically
            webbrowser.open(url)
        except:
            pass
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n✅ Server stopped.")

if __name__ == "__main__":
    run_server()
