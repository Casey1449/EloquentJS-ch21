const http = require('http');
let Router = require('./router');
const ecstatic = require('ecstatic');
const fileServer = ecstatic({root: './public'});
const router = new Router();
const talks = Object.create(null);

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

const readStreamAsJSON = (stream, callback) => {
  let data = '';
  stream.on('data', (chunk) => data += chunk);
  stream.on('end', () => {
    let result, error;
    try { result = JSON.parse(data); }
    catch(e) { error = e; }
    callback(error, result);
  });
  stream.on('error', (error) => callback(error));
}

//helper to attach 'servertime' to responses, to calculate 'changesSince':
const sendTalks = (talks, response) => respondJSON(response, 200, {servertime: Date.now(), talks});


//let's add routes!
router.add('GET', /^\/talks\/([^\/]+)$/, (request, response, title) => {
  (title in talks) ? respondJSON(response, 200, talks[title])
                    : respond(response, 404, `No talk '${title}' found!`);
});

router.add('DELETE', /^\/talks\/([^\/]+)$/, (request, response, title) => {
  if (title in talks) {
    delete talks[title];
    registerChange(title);
  }
  respond(response, 204, null);
});

router.add('PUT', /^\/talks\/([^\/]+)$/, (request, response, title) => {
  readStreamAsJSON(request, (error, talk) => {
    if (error) {
      respond(response, 400, error.toString());
    } else if (!talk || typeof talk.presenter != 'string' || typeof talk.summary != 'string'){
      respond(response, 400, 'Bad talk data');
    } else {
      talks[title] = {title,
                      presenter: talk.presenter,
                      summary: talk.summary,
                      comments: []};
      registerChange(title);
      respond(response, 204, null);
    }
  });
});

router.add('POST', /^\/talks\/([^\/]+)\/comments$/, (request, response, title) => {
  readStreamAsJSON(request, (error, comment) => {
    if (error) {
      respond(response, 400, error.toString());
    } else if (!comment || typeof comment.author != 'string' || typeof comment.message != 'string'){
      respond(response, 400, 'Bad comment data');
    } else if (title in talks) {
      talks[title].comments.push(comment);
      registerChange(title);
      respond(response, 204, null);
    } else {
      respond(response, 404, `No talk '${title}' found!`);
    }
  });
});

router.add('GET', /^\/talks$/, (request, response) => {
  let query = require('url').parse(request.url, true).query;
  if (query.changesSince == null) {
    let list = [];
    for (let title in talks)
      list.push(talks[title]);
    sendTalks(list, response);
  } else {
    let since = Number(query.changesSince);
    if (isNaN(since)) {
      respond(respons, 400, 'Invalid parameter');
    } else {
      let changed = getChangedTalks(since);
      (changed.length > 0) ? sendTalks(changed, response) : waitforChanges(since, response);
    }
  }
});
