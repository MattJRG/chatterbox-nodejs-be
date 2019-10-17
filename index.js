const express = require('express'); 
// get rid of cors errors
const cors = require('cors');
// library for talking to mongo db
const monk = require('monk');
// const rateLimit = require('express-rate-limit');

const app = express();

const db = monk(process.env.MONGO_URI || 'localhost/trollbox');
const trollposts = db.get('trollposts');
const rhymes = db.get('rhymes');
app.use(cors());

// body parser middleware any income requests that has a content type of application json will be added to the body so we can access e.g. req.body
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Hello there'
  })
});

app.get('/trolls', (req, res) => {
  trollposts
    .find()
    .then(trollposts => {
      res.json(trollposts);
    });
});

app.get('/rhymes', (req, res) => {
  rhymes
    .find()
    .then(rhymes => {
      res.json(rhymes);
    });
});

function isValidPost(post) {
  return post.content && post.content.toString().trim() !== '';
}

function isValidRhyme(data) {
  if (data.content.isArray) {
    data.content.array.forEach(element => {
      element = element.toString().trim();
    });
    return data;
  }
  return false;
}

// app.use(rateLimit({
//   windowMs: 1000, // 1 per second
//   max: 1
// }));

app.post('/trolls', (req, res) => {
  if (isValidPost(req.body)) {
    const post = {
      name: req.body.username.toString(),
      content: req.body.content.toString(),
      created: new Date()
    };
    trollposts
      .insert(post)
      .then(createdPost => {
        res.json(createdPost);
      });
  } else {
    res.status(422);
    res.json({
      message: "Hey! We don't accept blank content!"
    });
  }
});

app.post('/rhymes', (req, res) => {
  if (isValidRhyme(req.body)) {
    const rhyme = {
      rhymes: req.body.rhymes.array.forEach(element => element = element.toString())
    }
    rhymes
      .insert(rhyme)
      .then(createdRhyme => {
        res.json(createdRhyme);
      });
  } else {
    res.status(422);
    res.json({
      message: "Hey! Rhymes must be an array of strings"
    });
  }
});

app.listen(5000, () => {
  console.log('Listening on http://localhost:5000');
});