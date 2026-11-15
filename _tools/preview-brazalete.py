"""Serve only the selected public review pages on the local network; never publish them.""" # Explain why this local-only server exists.
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer # Reuse Python's static serving without adding a backend to the website.
from pathlib import Path # Resolve all files within this dedicated release worktree.
from urllib.parse import urlsplit, unquote # Normalize requested paths before checking the review allowlist.
root=Path(__file__).resolve().parents[1] # Serve from this checkout rather than the wider workspace.
class ReviewHandler(SimpleHTTPRequestHandler): # Keep local review routes separate from private working files.
    def __init__(self,*args,**kwargs): super().__init__(*args,directory=str(root),**kwargs) # Pin the server to the selected public release directory.
    def do_GET(self): # Restrict browsing to the product and its historical images.
        path=unquote(urlsplit(self.path).path) # Check decoded paths so encoded dots cannot bypass the boundary.
        if path=='/': self.send_response(302);self.send_header('Location','/brazalete/');self.end_headers();return # Open the introduction by default.
        allowed=path.startswith(('/brazalete/','/stories/brazalete/','/assets/stories/brazalete/','/assets/favicon/','/assets/portfolio/mark.svg')) # Expose only the files required for this review.
        target=(root/path.lstrip('/')).resolve() # Resolve symlinks and parent segments before serving a file.
        if not allowed or not target.is_relative_to(root) or any(part.startswith(('.','_')) for part in Path(path).parts): self.send_error(404);return # Keep repository metadata, internal notes and traversal requests unavailable.
        super().do_GET() # Serve ordinary public HTML, scripts, styles and pictures only.
    def list_directory(self,path): self.send_error(404);return None # Avoid exposing directory inventories on the local network.
    def end_headers(self): self.send_header('Cache-Control','no-store');super().end_headers() # Make revisions visible immediately during NZ's review.
if __name__=='__main__': # Start only when deliberately run for this local review.
    print('Local Brazalete review: http://127.0.0.1:8766/brazalete/',flush=True) # Provide a concrete desktop preview address.
    ThreadingHTTPServer(('0.0.0.0',8766),ReviewHandler).serve_forever() # Also allow a phone on the same network to reach the review without deploying it.
