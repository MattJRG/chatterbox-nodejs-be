const passport = require('passport');
const localStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');

var User = mongoose.model('User');

passport.use(
  new localStrategy({ usernameField: 'email' }, (username, password, done) => {
    User.findOne({ email: username }, (err, user) => {
      if (err) {
        return done(err);
      // Unknown user
      } else if (!user) {
        return done(null, false, { message: 'Email is not registered.' });
      // Wrong password
      } else if (!user.verifyPassword(password)) {
        return done(null, false, { message: 'Wrong password.' });
      } else if (!user.verified) {
        return done(null, false, { message: 'Account not verified.'})
      // Authentication succeeded
      } else {
        User.findOneAndUpdate({ email: username }, { lastActive: Date.now(), active: true }, { useFindAndModify: false }, (err, user) => {
          if (!err) {
            // Login successful - set user to active
            return done(null, user);
          } else {
            // Login successful but couldn't update user active status
            console.log(`Couldn't update user: ${username} active status.`)
            return done(null, user);
          }
        });
      }
    });
  })
);