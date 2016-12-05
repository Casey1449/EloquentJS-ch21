let lastServerTime = 0;

const request = (options, callback) => {
  let req = new XMLHttpRequest();
  req.open(options.method || 'GET', options.pathname, true);
  req.addEventListener('load', () => {
    req.status < 400 ? callback(null, req.responseText) : callback(new Error(`Request failed: ${req.statusText}`));
  })
  req.addEventListener('error', () => callback(new Error('Network error')));
  req.send(options.body || null);
}

request({pathname: 'talks'}, (error, response) => {
  if (error) {
    reportError(error)
  } else {
    console.log(response);
    response = JSON.parse(response);
    displayTalks(response.talks);
    lastServerTime = response.serverTime;
    waitForChanges();
  };
});

const reportError = error => {
  if (error) { alert(error.toString()) }
};

let talkDiv = document.querySelector("#talks");
let shownTalks = Object.create(null);

const displayTalks = talks => {
  talks.forEach(talk => {
    let shown = shownTalks[talk.title];
    if (talk.deleted) {
      if (shown) {
        talkDiv.removeChild(shown)
        delete shownTalks[talk.title];
        }
      } else {
        let node = drawTalk(talk);
        shown ? talkDiv.replaceChild(node, shown) : talkDiv.appendChild(node);
        shownTalks[talk.title] = node;
      }
  });
}

// const instantiateTemplate = (name, values) => {
//   const instantiateText = text => {
//     return text.replace(/\{\{(\w+)\}\}/g, (_, name) => {
//       return values[name];
//     });
//   };
//   const instantiate = node => {
//     if(node.nodeType == document.ELEMENT_NODE) {
//       let copy = node.cloneNode();
//       for (let i = 0; i < node.children.length; i++)
//         copy.appendChild(instantiate(node.childNodes[i]));
//       return copy;
//     } else if (node.nodeType == document.TEXT_NODE) {
//       return document.createTextNode(instantiateText(node.nodeValue));
//     }
//   }
//
//   let template = document.querySelector(`#template .${name}`);
//   return instantiate(template);
// }

function instantiateTemplate(name, values) {
  function instantiateText(text) {
    return text.replace(/\{\{(\w+)\}\}/g, function(_, name) {
      return values[name];
    });
  }
  function instantiate(node) {
    if (node.nodeType == document.ELEMENT_NODE) {
      var copy = node.cloneNode();
      for (var i = 0; i < node.childNodes.length; i++)
        copy.appendChild(instantiate(node.childNodes[i]));
      return copy;
    } else if (node.nodeType == document.TEXT_NODE) {
      return document.createTextNode(
               instantiateText(node.nodeValue));
    } else {
      return node;
    }
  }

  var template = document.querySelector("#template ." + name);
  return instantiate(template);
}

// const drawTalk = talk => {
//   let node = instantiateTemplate('talk', talk);
//   let comments = node.querySelector('.comments');
//   talk.comments.forEach(comment => { comments.appendChild(instantiateTemplate('comment', comment));});
//
//   node.querySelector('button.del').addEventListener(
//     'click', deleteTalk.bind(null, talk.title));
//
//   let form = node.querySelector('form');
//   form.addEventListener('submit', (e) => {
//     e.preventDefault();
//     addComment(talk.title, form.elements.comment.value);
//     form.reset();
//   });
//   return node;
// }
function drawTalk(talk) {
  var node = instantiateTemplate("talk", talk);
  var comments = node.querySelector(".comments");
  talk.comments.forEach(function(comment) {
    comments.appendChild(
      instantiateTemplate("comment", comment));
  });

  node.querySelector("button.del").addEventListener(
    "click", deleteTalk.bind(null, talk.title));

  var form = node.querySelector("form");
  form.addEventListener("submit", function(event) {
    event.preventDefault();
    addComment(talk.title, form.elements.comment.value);
    form.reset();
  });
  return node;
}

const talkURL = title => `talks/${encodeURIComponent(title)}`;

const deleteTalk = title => request({pathname: talkURL(title), method: 'DELETE'}, reportError);

const addComment = (title, comment) => {
  let comment = {author: nameField.value, message: comment};
  request(  {pathname: `${talkURL(title)}/comments`,
            body: JSON.stringify(comment),
            method: 'POST'},
          reportError);
}

let nameField = document.querySelector('#name');

nameField.value = localStorage.getItem('name') || '';

nameField.addEventListener('change', () => localStorage.setItem('name', nameField.value));

let talkForm = document.querySelector('#newtalk');

talkForm.addEventListener('submit', (e) => {
  e.preventDefault();
  request({pathname: talkURL(talkForm.elements.title.value),
            method: 'PUT',
            body: JSON.stringify({
              presenter: nameField.value,
              summary: talkForm.elements.summary.value
            })}, reportError);
  talkForm.reset();
});

const waitForChanges = () => {
  request({pathname: `talks?changesSince=${lastServerTime}`},
            (error, response) => {
              if (error) {
                setTimeout(waitForChanges, 2500);
                console.error(error.stack);
              } else {
                response = JSON.parse(response);
                displayTalks(response.talks);
                lastServerTime = response.serverTime;
                waitForChanges();
              }
            });
}
