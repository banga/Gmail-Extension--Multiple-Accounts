from BaseHTTPServer import BaseHTTPRequestHandler
import cgi

class Handler(BaseHTTPRequestHandler):
    def log_request(self, code='-', size='-'):
        pass

    def do_POST(self):
        self.send_response(200)
        if 'origin' in self.headers:
            self.send_header("Access-Control-Allow-Origin",
                    self.headers['origin'])
        self.end_headers()

        form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={'REQUEST_METHOD':'POST',
                    'CONTENT_TYPE':self.headers['Content-Type'],
                    })

        for field in form.keys():
            print form[field].value
        return

    def do_OPTIONS(self):
        self.send_response(200)
        if 'origin' in self.headers:
            self.send_header("Access-Control-Allow-Origin",
                    self.headers['origin'])
        self.send_header("Access-Control-Allow-Methods", "POST")
        self.end_headers()


if __name__ == '__main__':
    from BaseHTTPServer import HTTPServer
    server = HTTPServer(('localhost', 8080), Handler)
    print 'Starting server, use <Ctrl-C> to stop'
    server.serve_forever()
