var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var lecturerSchema = mongoose.Schema({
  googleId: String,
  name: String,
  token: String
});

module.exports = mongoose.model('Lecturer', lecturerSchema);
