const express = require('express');
// library for talking to mongo db
const monk = require('monk');
const jwt = require('jsonwebtoken');
const router = express.Router();
const db = monk(process.env.MONGO_URI || 'localhost/trollbox');

const trollposts = db.get('trollposts');
const users = db.get('trollusers');

// Troll functions
function isValidPost(post) {
  return post.content && post.content.toString().trim() !== '';
}

// User functions
function isValidUserData(data) {
  // to be built....
  return true;
}

function isValidLoginData(data) {
  // to be built....
  return true;
}

// Get trollposts without authentication
router.get('/', (req, res) => {
  trollposts
    .find()
    .then(trollposts => {
      res.json(trollposts);
    });
});

// Create trollposts - needs authentication
router.post('/', verifyToken, (req, res) => {
  jwt.verify(req.token, 'secretKey', (err, authData) => {
    if (err) {
      res.status(403);
      res.json(`Unauthorised user, please login to post`);
    } else {
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
          message: 'Hey! We don\'t accept blank content!'
        });
      }
    }
  })
});

router.post('/register', (req, res) => {
  // console.log(req.body);
  let userData = req.body;
  if (isValidUserData()) {
    users
      .findOne({ name: userData.name })
      .then(result => {
        // If user not in database add user to database
        if (result === null) {
          users
            .insert(userData)
            .then(createdUser => {
              res.status(200);
              res.json({
                message: `User ${createdUser.name} successfully added to database!`
              });
            })
            .catch(error => {
              res.status(422);
              res.json({
                message: `Sorry ${userData.name} could not be added to the database!`
              });
            })
        // If user is already in the database ask the user to login instead
        } else {
          res.status(500);
          res.json({
            message: `${userData.name} already exists in the database, please login instead!`
          });
        }
      })
  }
})

router.post('/login', (req, res) => {
  let loginData = req.body;
  if (isValidLoginData(loginData)) {
    // Check if user is in database
    users
      .findOne({ name: loginData.name, pass: loginData.pass })
      .then(result => {
        // If null user details are incorrect or user needs to register
        if (result === null) {
          res.status(400);
          res.json({
            message: `Login details incorrect`
          })
        } else {
          console.log(result);
          // const user = {
          //   id: 1,
          //   username: 'Matt',
          //   email: 'matt@yopmail.com'
          // }
      
          jwt.sign({result}, 'secretKey', (err, token) => {
            res.status(200);
            res.json({
              token: token,
              message: `Login successful, welcome ${result.name}`
            })
          })
        }
      })
  }

});

// Format of token
// Authorization: Bearer <access_token>

// Verify token
function verifyToken(req, res, next) {
  // Get auth header value
  const bearerHeader = req.headers['authorization'];
  // Check if bearer is undefined
  if (typeof bearerHeader !== 'undefined') {
    // Split at the space
    const bearer = bearerHeader.split(' ');
    // Get token from array
    const bearerToken = bearer[1];
    // Set the token
    req.token = bearerToken;
    // Next middleware
    next();
  } else {
    // Forbidden
    res.sendStatus(403);
  }
}

module.exports = router;