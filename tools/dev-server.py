# Static server for `make dev`. Sends Cache-Control: no-store so the browser always loads the files as they are on
# disk; python's plain http.server sends no caching header and browsers then keep old scripts for hours.
import http.server
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
print(f'Serving on http://localhost:{port}')
http.server.ThreadingHTTPServer(('', port), NoCacheHandler).serve_forever()
