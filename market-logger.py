#!/usr/bin/env python3

from http.server import BaseHTTPRequestHandler, HTTPServer
import datetime as dt
import json
import os, re, sys, time

HOST = 'localhost'
PORT = 23456
LOG_FILE_PATTERN = '%Y-%m-%d {market_name}.json'
HTTP_LOG_FILE = '%Y-%m-%d market-logger.log'
WARN_LOG_DELAY = 1.0 # seconds

JS_DATE_FORMAT = '%Y-%m-%dT%H:%M:%S.%fZ' # javascript Date.toISOString

class LoggingServer(BaseHTTPRequestHandler):
    def do_POST(self):
        now = dt.datetime.fromtimestamp(time.time())

        def respond(code, msg):
            self.send_response(code)
            self.send_header("Content-type", "text/plain")
            self.end_headers()
            self.wfile.write(msg.encode('utf-8'))
            http_info = f'{now} {self.request_version} {self.path} -> {code} {msg}'
            with open(now.strftime(HTTP_LOG_FILE), 'a') as f:
                f.write(http_info + '\n')
            print(http_info)

        if self.path == '/log':
            try:
                raw_log = self.rfile.read(int(self.headers['content-length']))
                log = json.loads(raw_log)
                # LOG_FILE_PATTERN will use log timestamp, so parse it
                log['now'] = dt.datetime.strptime(log['now'], JS_DATE_FORMAT)
                # LOG_FILE_PATTERN may use market name, sanitise it
                market_name_sanitised = log['market_name'].replace('/', '?')[:200]

            except Exception as e:
                respond(400, f'Malformed log: {e}')
                return

            try:
                log_file_name = log['now'].strftime(LOG_FILE_PATTERN).format(
                    market_name = market_name_sanitised
                )
                target = f'{log_file_name}'
                log_delay = (log['now'] - now).total_seconds()
                if log_delay > WARN_LOG_DELAY:
                    target += f' (warning: wire delay {log_delay} s)'
                with open(log_file_name, 'ab') as f:
                    f.write(raw_log + b'\n')
                respond(200, f'Logged to: {target}')
                return
            except Exception as e:
                respond(500, f'Failed to log to: {target} -- {e}')
        else:
            respond(404, f'No such endpoint: {self.path}')

if __name__ == "__main__":        
    server = HTTPServer((HOST, PORT), LoggingServer)
    print(f"Logging server started on {HOST}:{PORT}")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass

    server.server_close()
    print("Server stopped.")
