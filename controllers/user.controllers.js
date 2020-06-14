const mongoose = require('mongoose');
const passport = require('passport');
const _ = require('lodash');

const User = mongoose.model('User');
const Blacklist = mongoose.model('Blacklist');

module.exports.register = (req, res, next) => {
  var user = new User();
  user.username = req.body.username;
  user.email = req.body.email;
  user.password = req.body.password;
  user.save((err, doc) => {
    if (!err) {
      res.send(doc);
    } else {
      if (err.code == 11000) {
        res.status(422).send(['Duplicate email address found.'])
      } else {
        return next(err);
      }
    }
  })
}

module.exports.authenticate = (req, res, next) => {
  // call for passport authentication
  passport.authenticate('local', (err, user, info) => {
    // error from passport middleware
    if (err) return res.status(400).json(err);
    // registered user
    else if (user) {
      return res.status(200).json({ "token": user.generateJwt(), "username": user.username });
    }
    // unknown user or wrong password
    else {
      return res.status(404).json(info);
    } 
  })(req, res, next);
}

module.exports.logout = (req, res, next) => {
  let invalidToken = new Blacklist();
  console.log('User logging out....')
  invalidToken.token = req.token;
  console.log(req.exp)
  invalidToken.created = req.exp * 1000;
  invalidToken.save((err, doc) => {
    console.log(doc)
    if (!err) {
      res.status(200);
      res.json({ "message": 'loggout successful'})
    } else {
      res.status(204);
      console.log(err);
    }
  })
}

module.exports.userProfile = (req, res, next) => {
  User.findOne({ _id: req._id },
    (err, user) => {
      if (!user) {
        return res.status(404).json({ status: false, message: "User record not found." });
      } else {
        return res.status(200).json({ status: true, user : _.pick(user,['username','email']) });
      }
    })
}