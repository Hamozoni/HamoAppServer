import mongoose from "mongoose";

const MEDIA_SCHEMA = new mongoose.Schema({
    name : {type: String,require:true},
    type: {type: String,enum: ['AUDIO', 'IMAGE','VIDEO','APPLICATION'],default: 'IMAGE'},
    fileURL: {type: String ,require : true},
    fileURLId: {type: String ,require : true},
    fileSize: {type : Number , require: true},
    duration: {type: Number}
  }, { timestamps: true});

  const Media = mongoose.model('File',MEDIA_SCHEMA);

  export default Media;