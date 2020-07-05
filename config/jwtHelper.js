const jwt = require('jsonwebtoken');

const mongoose = require('mongoose');
const User = mongoose.model('User');
const Blacklist = mongoose.model('Blacklist');


module.exports.verifyJwtToken = (req, res, next) => {
  var token;
  if ('authorization' in req.headers) {
    token = req.headers['authorization'].split(' ')[1];
  }
  if (!token) {
    return res.status(403).send({ auth: false, message: 'No token provided.' });
  } else {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        res.status(403);
        res.json({"auth": false, "message":`Forbidden: Token authentication failed, please login to post`});
      } else {
        Blacklist.find({"token": token})
        .then(docs => {
          if (docs.length === 0) {
            // If token not blacklisted it's ok
            req.token = token;
            req.exp = jwt.decode(token).exp;
            req._id = decoded._id;
            User.findOneAndUpdate({ _id: req._id }, { lastActive: Date.now(), active: true }, { useFindAndModify: false }, (err, doc) => {
              if (err) {
                console.log(`User ${req._id} last active could not be updated.`);
              } else {
                req.username = doc.username 
                next();
              }
            });
          } else {
            // If token is blacklisted send 500 response
            res.status(403);
            res.json({"auth": false, "message":`Forbidden: Token invalid, please login to post`});
          }
        })
      }
    })
  }
}
