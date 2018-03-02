var fs = require('fs');
var scissors = require('scissors');
var Duplex = require('stream').Duplex;
var inspect = require('eyes').inspector({
  maxLength: 20000
});
var pdf_extract = require('pdf-extract');

var Slide = require('../models/slide');

var database = {}

database.createFromLecture = createFromLecture;

module.exports = database;

const TEMP_PRESENTATION = 'temp.pdf';

function createFromLecture(lecture) {
  return new Promise((resolve, reject) => {
    if (lecture === null) {
      reject("Parameter lecture was null");
    } else {
      /*
       * 1. Store the PDF presentation in a temp file on disk
       * 2. Extract array containing text of all slides
       * 3. Iterate over the array and use the page numbers to convert PDF pages into PNG images
       * 4. Iterate over the array and save all slides into the database
       * 5. Finally, remove the temp PDF file
       */
      fs.writeFile(TEMP_PRESENTATION, lecture.file, 'binary', (err) => {
        if (err) {
          reject(err);
        } else {
          extractSlidesTextArray(TEMP_PRESENTATION).then((slidesArr) => {
            // 3
            var promisesQueue = [];
            for (var i = 0; i < slidesArr.length; i++) {
              promisesQueue.push(extractImageFromSlide(slidesArr[i]));
            }
            Promise.all(promisesQueue).then((images) => {

            }).catch((err) => {
              // clean up the temp file
              fs.unlink(TEMP_PRESENTATION, (err) => {
                reject(err);
              });
              reject(err);
            });
          }).catch((err) => {
            // clean up the temp file
            fs.unlink(TEMP_PRESENTATION, (err) => {
              reject(err);
            });
            reject(err);
          });
        }
      });

      // pngStream = scissors(bufferToStream(lecture.file)).pages(1).pngStream(300);
      // streamToBuffer(pngStream).then((buffer) => {
      //   var slide = new Slide({
      //     lectureId: lecture._id,
      //     image: buffer,
      //     text: "This is some text found on the slide",
      //     isQuiz: false
      //   });
      //   slide.save().then((savedSlide) => {
      //     resolve();
      //   }).catch((err) => {
      //     reject(err);
      //   })
      // }).catch((err) => {
      //   reject(err);
      // });
    }
  });
}

function extractSlidesTextArray(filePath) {
  return new Promise((resolve, reject) => {
    /*
     * 1. Use pdf_extract to extract text from each slide
     * 2. Keep track of the paths to pdf single page file leftovers and append
     *    them to the output array for future PDF -> PNG conversion
     */
    var options = {
      type: 'text',
      clean: false // keeps the single page pdfs on disk after processor completes
    };
    var processor = pdf_extract(filePath, options, (err) => {
      if (err) {
        reject(err);
      } else {
        processor.on('complete', (data) => {
          var slides = [];
          for (var i = 0; i < data.text_pages.length) {
            slides.push({
              text: data.text_pages[i],
              slidePath: data.single_page_pdf_file_paths[i]
            });
          }
          resolve(slides);
        });
        processor.on('error', (err) => {
          reject(err);
        });
      }
    });
  });
}

function extractImageFromSlide(slide) {
  return new Promise((resolve, reject) => {
    /*
     * 1. Extract the png from the single page PDF provided
     * 2. Clean up the slide from disk before resolving the image back
     */
    var pngStream = scissors(slide.slidePath).pages(1).pngStream(300);
    streamToBuffer(pngStream).then((img) => {
      fs.unlink(slide.slidePath, (err) => {
        // does not matter
        console.warn(err);
        resolve(img);
      });
      resolve(img);
    }).catch((err) => {
      console.error("[ERR] extractImageFromSlide failed: " + err);
      reject(err);
    });
  });
}

// http://derpturkey.com/buffer-to-stream-in-node/
function bufferToStream(buffer) {
  let stream = new Duplex();
  stream.push(buffer);
  stream.push(null);
  return stream;
}

// http://derpturkey.com/buffer-to-stream-in-node/
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    let buffers = [];
    stream.on('error', reject);
    stream.on('data', (data) => buffers.push(data));
    stream.on('end', () => resolve(Buffer.concat(buffers)));
  });
}
