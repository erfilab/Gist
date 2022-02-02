
const express = require('express');
const cors = require('cors');
const path = require('path');

const routes = require('express').Router();
// routes.get('/', (req, res) => {
//     res.status(200).json({ message: 'Connected to API' })
// })

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', routes);


app.use(
    express.static(
        path.join(
            __dirname,
            `${process.env.NODE_ENV === 'development' ? '.' : '..'}/dist`
        )
    )
);

const HOST = process.env.HOST || 'localhost';
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}/`);
});

const { Server } = require('socket.io');
const io = new Server(server, { cors: {origin: '*'}});


const speech = require('@google-cloud/speech');
const speechClient = new speech.SpeechClient({
    projectId: 'gist-speech-websocket',
    keyFilename: '../gist-google-speech.json'
});
const encoding = 'LINEAR16';
const sampleRateHertz = 16000;
const languageCode = 'en-US';

const request = {
    config: {
        encoding: encoding,
        sampleRateHertz: sampleRateHertz,
        languageCode: languageCode,
        profanityFilter: false,
        enableWordTimeOffsets: false,
        enableAutomaticPunctuation: true,
        speechContexts: [{
            phrases: ["stop", "respeak", "again"]
           }]
    },
    interimResults: true,
};


const namespaces = io.of(/^\/[a-zA-Z0-9_\/-]+$/)
let recognizeStream = null;

namespaces.on('connection', (socket) => {
    const namespaceDir = socket.nsp.name;
    console.log(`Connected to ${namespaceDir}`);
    
    socket.on('joinRoom', async (room) => {
        socket.join(room);
        console.log(`Joined ${room}`);

        socket.on('startRecording', async () => {
            startRecognitionStream(room);
        });

        socket.on('endRecording', async () => {
            stopRecognitionStream(room);
        });

        socket.on('BINARY_DATA', data => {
            if (recognizeStream !== null) {
                recognizeStream.write(data);
            }
        });

    });
});

function startRecognitionStream(room) {
    console.log("StartRS")
    recognizeStream = speechClient
        .streamingRecognize(request)
        .on('error', console.error)
        .on('data', data => {
            namespaces.in(room).emit("TRANSCRIPT", data);
            // const transcript = data.results[0].alternatives[0].transcript;

            // // console.log(`Interim: ${transcript}`);
            // namespaces.in(room).emit("INTERIM_TRANSCRIPT", transcript);

            if (data.results[0] && data.results[0].isFinal) {
                // console.log(`Final: ${transcript}`);
                // namespaces.in(room).emit('FINAL_TRANSCRIPT', transcript);
                stopRecognitionStream();
                startRecognitionStream(room);
                console.log('Restarted Stream on Serverside');
            }
        });
}

function stopRecognitionStream() {
    console.log("StopRS")
    if (recognizeStream) recognizeStream.end();
    recognizeStream = null;
}