import functools
import http.server
import os

ROOT = r"D:\momolab"
os.chdir(ROOT)


class NoStoreHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Pragma", "no-cache")
        super().end_headers()


if __name__ == "__main__":
    http.server.ThreadingHTTPServer(
        ("127.0.0.1", 8010), functools.partial(NoStoreHandler, directory=ROOT)
    ).serve_forever()
