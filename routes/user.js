const express = require('express');
// library for talking to mongo db
const monk = require('monk');
const multer = require('multer');
const router = express.Router();
const db = monk(process.env.MONGO_URI || 'localhost/trollbox');

var storage = multer.diskStorage({
  // destination
  destination: function (req, file, cb) {
    cb(null, './public/uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

var upload = multer({ storage: storage });

router.post("/", upload.array("uploads[]", 12), function (req, res) {
  console.log('files', req.files);
  res.send(req.files);
});


// // Multer Mime Type Validation
// const upload = multer({ 
//   storage: storage,
//   limits: {
//     fileSize: 1024 * 1024 * 5
//   },
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg") {
//       cb(null, true);
//     } else {
//       cb(null, false);
//       return cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
//     }
//   }
// });

// // POST User
// router.post('/create-user', upload.single('avatar'), (req, res, next) => {
//   const url = req.protocol + '://' + req.get('host')
//   const user = new User({
//     _id: new mongoose.Types.ObjectId(),
//     name: req.body.name,
//     avatar: url + '/public/' + req.file.filename
//   });
//   user.save().then(result => {
//     console.log(result);
//     res.status(201).json({
//       message: "User registered successfully!",
//       userCreated: {
//         _id: result._id,
//         name: result.name,
//         avatar: result.avatar
//       }
//     })
//   }).catch(err => {
//     console.log(err),
//       res.status(500).json({
//         error: err
//       });
//   })
// });

// // GET All User
// router.get("/", (req, res, next) => {
//   User.find().then(data => {
//     res.status(200).json({
//       message: "Users retrieved successfully!",
//       users: data
//     });
//   });
// });

// // GET User
// router.get("/:id", (req, res, next) => {
//   User.findById(req.params.id).then(data => {
//     if (data) {
//       res.status(200).json(post);
//     } else {
//       res.status(404).json({
//         message: "User not found!"
//       });
//     }
//   });
// });

module.exports = router;