"""Solarist Discord status helper.

Browsers can't talk to Discord directly, so this small script sits in between: Solarist sends it what you're
doing (only when "Discord status" is on in Settings), and it passes that to the Discord app on this computer.

Run it with Python 3.8 or newer (nothing to install):
    python solarist_presence.py --client-id YOUR_APPLICATION_ID
or put the ID in a file called client_id.txt next to this script and just run:
    python solarist_presence.py
Use pythonw instead of python to run it without a console window. See README.md in this folder.
"""
import argparse
import json
import os
import socket
import struct
import sys
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

PORT = 6473
# only these pages may set your status, so no other website can
ALLOWED_ORIGINS = {'https://licoryte.github.io'}  # plus localhost on any port: your own copy while you work on it
STALE_AFTER = 150  # seconds without news from Solarist (closed, or the computer slept): clear the status
ICON = 'https://licoryte.github.io/solarist/icons/icon-512.png'
PLAY_URL = 'https://licoryte.github.io/solarist/'


def origin_ok(origin):
    if not origin:
        return False
    if origin in ALLOWED_ORIGINS:
        return True
    u = urlparse(origin)
    return u.scheme in ('http', 'https') and (u.hostname or '') in {'localhost', '127.0.0.1', '::1'}


class Discord:
    """Discord's local connection: a named pipe on Windows, a socket elsewhere. Frames are [op, length] + JSON."""

    def __init__(self, client_id):
        self.client_id = client_id
        self.pipe = None
        self.lock = threading.Lock()
        self.last_error = ''

    def _paths(self):
        if sys.platform == 'win32':
            return [r'\\?\pipe\discord-ipc-%d' % i for i in range(10)]
        base = os.environ.get('XDG_RUNTIME_DIR') or os.environ.get('TMPDIR') or os.environ.get('TMP') or '/tmp'
        dirs = [base, os.path.join(base, 'app/com.discordapp.Discord'), os.path.join(base, 'snap.discord')]
        return [os.path.join(d, 'discord-ipc-%d' % i) for d in dirs for i in range(10)]

    def _open(self):
        for path in self._paths():
            try:
                if sys.platform == 'win32':
                    return open(path, 'r+b', buffering=0)
                s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
                s.connect(path)
                return s.makefile('rwb', buffering=0)
            except OSError:
                continue
        return None

    def _send(self, op, payload):
        data = json.dumps(payload).encode('utf-8')
        self.pipe.write(struct.pack('<II', op, len(data)) + data)
        self.pipe.flush()

    def _recv(self):
        head = self.pipe.read(8)
        if not head or len(head) < 8:
            raise OSError('Discord closed the connection')
        op, n = struct.unpack('<II', head)
        body = b''
        while len(body) < n:
            chunk = self.pipe.read(n - len(body))
            if not chunk:
                raise OSError('Discord closed the connection')
            body += chunk
        return op, json.loads(body.decode('utf-8'))

    def _connect(self):
        if self.pipe:
            return True
        self.pipe = self._open()
        if not self.pipe:
            self.last_error = 'Discord is not running'
            return False
        try:
            self._send(0, {'v': 1, 'client_id': self.client_id})
            op, msg = self._recv()
            if op == 2 or msg.get('evt') == 'ERROR':  # 2: closed, usually a wrong application ID
                raise OSError(msg.get('message') or msg.get('data', {}).get('message') or 'Discord refused the connection')
        except (OSError, ValueError) as e:
            self.last_error = str(e)
            self._drop()
            return False
        self.last_error = ''
        print('Connected to Discord.', flush=True)
        return True

    def _drop(self):
        try:
            if self.pipe:
                self.pipe.close()
        except OSError:
            pass
        self.pipe = None

    def set(self, activity):
        """activity: a dict, or None to clear. Returns True when Discord took it."""
        with self.lock:
            for _ in range(2):  # one retry: Discord may have restarted since the last update
                if not self._connect():
                    return False
                try:
                    self._send(1, {'cmd': 'SET_ACTIVITY', 'args': {'pid': os.getpid(), 'activity': activity}, 'nonce': str(uuid.uuid4())})
                    op, msg = self._recv()
                    if msg.get('evt') == 'ERROR':
                        self.last_error = (msg.get('data') or {}).get('message', 'Discord said no')
                        return False
                    return True
                except (OSError, ValueError) as e:
                    self.last_error = str(e)
                    self._drop()
            return False


def clip(v, n=128):
    v = str(v or '').strip()
    return (v[:n - 1] + '…') if len(v) > n else v


def to_activity(d):
    """Solarist's status -> a Discord activity. Only known fields are used, all as plain text."""
    details, state = clip(d.get('details')), clip(d.get('state'))
    if len(details) < 2:
        details = 'Using Solarist'
    act = {'details': details, 'assets': {'large_image': ICON, 'large_text': clip(d.get('ship')) or 'Solarist'},
           'buttons': [{'label': 'Play Solarist', 'url': PLAY_URL}]}
    if len(state) >= 2:
        act['state'] = state
    end = d.get('end')
    if isinstance(end, (int, float)) and end > time.time() * 1000:
        act['timestamps'] = {'end': int(end)}  # Discord shows a countdown
    return act


class State:
    discord = None
    last_seen = 0.0
    showing = False


def make_handler():
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *a):
            pass  # quiet

        def _cors(self):
            origin = self.headers.get('Origin', '')
            if origin_ok(origin):
                self.send_header('Access-Control-Allow-Origin', origin)
                self.send_header('Vary', 'Origin')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type')
                self.send_header('Access-Control-Allow-Private-Network', 'true')

        def _reply(self, code, obj):
            body = json.dumps(obj).encode('utf-8')
            self.send_response(code)
            self._cors()
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_OPTIONS(self):
            self.send_response(204 if origin_ok(self.headers.get('Origin', '')) else 403)
            self._cors()
            self.send_header('Content-Length', '0')
            self.end_headers()

        def do_GET(self):  # Settings asks "are you there?"
            if not origin_ok(self.headers.get('Origin', '')):
                return self._reply(403, {'ok': False})
            with State.discord.lock:
                up = State.discord._connect()
            self._reply(200, {'ok': True, 'app': 'solarist-presence', 'discord': up, 'error': State.discord.last_error})

        def do_POST(self):
            if not origin_ok(self.headers.get('Origin', '')):
                return self._reply(403, {'ok': False})
            n = int(self.headers.get('Content-Length') or 0)
            if n > 4096:
                return self._reply(413, {'ok': False})
            try:
                d = json.loads(self.rfile.read(n).decode('utf-8') or '{}')
            except ValueError:
                return self._reply(400, {'ok': False})
            State.last_seen = time.time()
            if self.path.startswith('/clear') or not isinstance(d, dict) or d.get('off'):
                ok = State.discord.set(None)
                State.showing = False
            else:
                ok = State.discord.set(to_activity(d))
                State.showing = ok
            self._reply(200, {'ok': ok, 'error': State.discord.last_error})
    return Handler


def watchdog():
    while True:
        time.sleep(10)
        if State.showing and time.time() - State.last_seen > STALE_AFTER:
            State.discord.set(None)
            State.showing = False


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser(description='Shows what you are doing in Solarist as your Discord status.')
    ap.add_argument('--client-id', help='your Discord application ID (or put it in client_id.txt next to this script)')
    ap.add_argument('--port', type=int, default=PORT)
    a = ap.parse_args()
    cid = (a.client_id or os.environ.get('SOLARIST_DISCORD_ID') or '').strip()
    if not cid:
        try:
            with open(os.path.join(here, 'client_id.txt'), encoding='utf-8') as f:
                cid = f.read().strip()
        except OSError:
            pass
    if not cid.isdigit():
        print('Missing your Discord application ID. See README.md in this folder.', file=sys.stderr)
        sys.exit(1)
    State.discord = Discord(cid)
    threading.Thread(target=watchdog, daemon=True).start()
    try:
        srv = ThreadingHTTPServer(('127.0.0.1', a.port), make_handler())
    except OSError:
        print('Port %d is busy: is the helper already running?' % a.port, file=sys.stderr)
        sys.exit(1)
    print('Solarist Discord helper is running. Turn on "Discord status" in Solarist\'s Settings. Ctrl+C to stop.', flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        State.discord.set(None)


if __name__ == '__main__':
    main()
