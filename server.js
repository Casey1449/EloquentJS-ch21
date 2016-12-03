const http = require('http');
let Router = require('./router');
const ecstatic = require('ecstatic');

const fileServer = ecstatic({root: './public'});
const router = new Router();

//if request can't be resolved by our router, intrpret it as a request for a file in the filesystem, and find it through 'public':
http.createServer((request, response) => {
  if(!router.resolve(request, response))
    fileServer(request, response);
}).listen(8000);

//helpers for crafting and formatting server responses:
const respond = (response, status, data, type) => {
  response.writeHead(status, {
    'Content-type': type || 'text/plain'
  });
  response.end(data);
}

const respondJSON = (response, status, data) => {
  respond(response, status, JSON.stringify(data), 'application/json');
}
