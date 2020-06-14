const express = require('express');
// library for talking to mongo db
const monk = require('monk');
const router = express.Router();
const db = monk(process.env.MONGO_URI || 'localhost/trollbox');
const users = db.get('trollusers');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


// Auth functions
function isValidUserData(data) {
  // to be built....
  return true;
}

async function hashPassword(password, saltRounds) {
 const hashedPassword = await bcrypt.hash(password, 10);
  return hashedPassword;
}

async function isPasswordCorrect(enteredPassword, user) {
  return await bcrypt.compare(enteredPassword, user.password)
}

function isValidLoginData(data) {
  // to be built....
  return true;
}

router.post('/register', (req, res) => {
  if (isValidUserData()) {
    users
      .findOne({ username: req.body.username })
      .then(result => {
        // If user not in database add user to database
        if (result === null) {
          hashPassword(req.body.password, 10)
          .then(hashedPassword => {
            let userData = {
              username: req.body.username,
              email: req.body.email,
              password: hashedPassword,
              shoeSize: req.body.shoeSize
            }
          users
            .insert(userData)
            .then(createdUser => {
              res.status(200);
              res.json({
                message: `User ${createdUser.username} successfully added to database!`
              });
              console.log(createdUser);
            })
            .catch(error => {
              res.status(422);
              res.json({
                message: `Sorry ${userData.username} could not be added to the database!`
              });
            })
          })
        // If user is already in the database ask the user to login instead
        } else {
          res.status(500);
          res.json({
            message: `${userData.username} already exists in the database, please login instead!`
          });
        }
      })
  }
})

router.post('/login', (req, res) => {
  let loginData = req.body;
  let query;
  if (loginData.hasOwnProperty('email')) {
    console.log('Login by email');
    query = { email: loginData.email }
  } else {
    console.log('Login by username');
    query = { username: loginData.username };
  }
  if (isValidLoginData(loginData)) {
    // Check if user is in database
    users
      .findOne(query)
      .then(user => {
        // If null user details are incorrect or user needs to register
        if (user === null) {
          res.status(400);
          res.json({
            message: `That user does not exist`
          })
        } else {
          // If user is in the database check if passwords matches
          isPasswordCorrect(loginData.password, user).then(correctPassword => {
            // If password correct login successful
            if (correctPassword) {
              jwt.sign({user}, 'secretKey', (err, token) => {
                res.status(200);
                res.json({
                  token: token,
                  message: `Login successful, welcome ${user.username}`
                })
              })
            // If password incorrect respond with error
            } else {
              res.status(400);
              res.json({
                message: `Login details are incorrect user`
              })
            }
          });
        }
      })
      .catch(err => {
        // If database unavailable respond with error
        res.status(500);
        res.json({
          message: `Database currently unavailable`
        })
      })
  }

});

// Route to request to reset password
router.post('/forgot', (req, res) => {

})

// Route to reset the users password
router.post('/reset', (req, res) => {

})

module.exports = {
  router: router,
  // Verify token
  verifyToken: function(req, res, next) {
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
}
