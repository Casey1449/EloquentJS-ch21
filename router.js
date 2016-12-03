const Router = module.exports = function(){
  this.routes = [];
};

Router.prototype.add = (method, url, handler) => this.routes.push({ method, url, handler });

Router.prototype.resolve = (request, response) => {
  //parse the url from the request:
  let path = require('url').parse(request.url).pathname;

  return this.routes.some(route => {
    //test if the request url matches any in the routes array, via regex:
    let match = route.url.exec(path);
    //quit if it doesn't, or if the request's method is different from the one stored in the array:
    if (!match || route.method != request.method){ return false; }


    let urlParts = match.slice(1).map(decodeURIComponent);
    //apply the route's handler function:
    route.handler.apply(null, [request, response].concat(urlParts));

    return true;
  });
};
