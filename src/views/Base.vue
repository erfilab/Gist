<template>
  <div>
    <v-main
        id="base-main"
        contenteditable="true"
        style="
      user-select: text;
      text-align: justify;
      margin: 25px 20px 20px 20px;
      text-justify: inter-word;
      "
    >
    </v-main>

    <v-btn fab dark
           absolute bottom left
           style="position: fixed; bottom: 15px; left: 25px"
           @click.end="toggleFullScreen"
    >
      <v-icon
      >{{ isFullScreen ? "mdi-fullscreen-exit" : "mdi-fullscreen" }}
      </v-icon>
    </v-btn>

    <!-- <v-btn
      fab
      dark
      absolute
      bottom
      left
      style="position: fixed; bottom: 15px; left: 46px"
      @click="deleteText"
    >
      <v-icon>mdi-close</v-icon>
    </v-btn> -->
    <v-btn fab dark
           absolute bottom left
           style="position: fixed; bottom: 15px; left: 100px"
           @click="exportText"
    >
      <v-icon>mdi-download</v-icon>
    </v-btn>
    <v-btn fab dark
           absolute bottom right
           :color="isStreaming ? 'green' : 'grey'"
           style="position: fixed; bottom: 15px; right: 25px"
           @click="isStreaming ? turnOffMic() : turnOnMic()"
    >
      <v-icon>mdi-microphone</v-icon>
    </v-btn>
  </div>
</template>

<script>
import {io} from "socket.io-client";
import {db} from '@/plugins/firebase.js';
import {ref, set, get, push} from 'firebase/database';

const nowDay = new Date().toISOString().slice(0, 10);
let socket = null;
let context, processor, audioContext, globalStream, audioInput;

export default {
  name: "Base",
  data: () => ({
    voice2text: "",
    text: "",

    // transcript
    formattedMessages: [],
    messages: [],

    isFullScreen: false,
    isStreaming: false,
    trialName: null,
  }),
  methods: {
    uuidv4() {
      return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
          (
              c ^
              (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
          ).toString(16)
      );
    },
    async storeDataLog(payload) {
      await push(ref(db, `base-trials/${this.trialName}/systemLogs`), {
        timestamp: new Date().getTime(),
        ...payload,
      }).catch(console.error)
    },
    async exportText() {
      let text = "";
      this.semanticList.forEach(block => {
        text += block.text.trim()
        text += " "
      })
      await navigator.clipboard.writeText(text.trim());

      await this.storeDataLog({
        type: 'export',
        content: text
      })
    },
    async turnOnMic() {
      this.isStreaming = true;
      this.messages = [];
      this.formattedMessages = [];
      this.voice2text = null;

      await this.storeDataLog({
        type: 'microphone',
        event: true
      })

      socket.emit("startRecording");
      audioContext = window.AudioContext || window.webkitAudioContext;
      context = new audioContext({latencyHint: "interactive"});
      processor = context.createScriptProcessor(2048, 1, 1);
      processor.connect(context.destination);
      context.resume();

      const handleSuccess = (stream) => {
        globalStream = stream;
        audioInput = context.createMediaStreamSource(stream);
        audioInput.connect(processor);

        processor.onaudioprocess = (e) => {
          if (!socket) {
            return;
          }
          socket.emit(
              "BINARY_DATA",
              this.downsampleBuffer(e.inputBuffer.getChannelData(0), 44100, 16000)
          );
        };
      };

      navigator.mediaDevices
          .getUserMedia({audio: true, video: false})
          .then(handleSuccess);
    },
    turnOffMic() {
      this.isStreaming = false;

      socket.emit("endRecording");
      let track = globalStream.getTracks()[0];
      track.stop();
      audioInput.disconnect(processor);
      processor.disconnect(context.destination);
      context.close().then(() => {
        audioContext = null;
        context = null;
        processor = null;
        audioInput = null;
        globalStream = null;
      });

      this.storeDataLog({
        type: 'microphone',
        event: false
      })

      this.voice2text = "";
      this.formattedMessages = [];
      this.messages = [];
    },

    // for speech recognition
    downsampleBuffer(buffer, sampleRate, outSampleRate) {
      if (outSampleRate === sampleRate) {
        return buffer;
      }
      if (outSampleRate > sampleRate) {
        throw "downsampling rate show be smaller than original sample rate";
      }
      let sampleRateRatio = sampleRate / outSampleRate;
      let newLength = Math.round(buffer.length / sampleRateRatio);
      let result = new Int16Array(newLength);
      let offsetResult = 0;
      let offsetBuffer = 0;
      while (offsetResult < result.length) {
        let nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
        let accum = 0,
            count = 0;
        for (
            let i = offsetBuffer;
            i < nextOffsetBuffer && i < buffer.length;
            i++
        ) {
          accum += buffer[i];
          count++;
        }

        result[offsetResult] = Math.min(1, accum / count) * 0x7fff;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
      }
      return result.buffer;
    },
    getFinalResults() {
      return this.formattedMessages.filter(
          (r) => r.results && r.results.length && r.results[0].isFinal
      );
    },

    getCurrentInterimResult() {
      const r = this.formattedMessages[this.formattedMessages.length - 1];
      if (!r || !r.results || !r.results.length || r.results[0].isFinal) {
        return null;
      }
      return r;
    },

    getFinalAndLatestInterimResult() {
      const final = this.getFinalResults();
      const interim = this.getCurrentInterimResult();
      if (interim) {
        final.push(interim);
      } else {
        const finalResults = this.messages
            .map((msg) =>
                msg.results.map((result) => result.alternatives[0].transcript)
            )
            .reduce((a, b) => a.concat(b), [])
        this.storeDataLog({
          type: `final_transcript`,
          content: finalResults
        })
      }
      return final;
    },

    toggleFullScreen() {
      if (this.isFullScreen) {
        this.isFullScreen = false;
        window.document.exitFullscreen().catch(console.error);
      } else {
        window.document
            .querySelector("#app")
            .requestFullscreen({navigationUI: "hide"})
            .catch(console.error);

        this.isFullScreen = true;
      }
      this.storeDataLog({
        type: 'fullscreen',
        event: this.isFullScreen
      })
    },
  },

  async created() {
    socket = io(
        `${
            process.env.NODE_ENV === "production"
                ? "https://ryanyen2.tech/"
                : "http://localhost:3000/"
        }` + nowDay
    );

    socket.on("BASE_TRANSCRIPT", async (data) => {
      this.formattedMessages = this.formattedMessages.concat(data);
      this.messages = this.getFinalAndLatestInterimResult();

      this.voice2text = this.messages
          .map((msg) =>
              msg.results.map((result) => result.alternatives[0].transcript)
          )
          .reduce((a, b) => a.concat(b), [])

      console.log('base: ', this.voice2text)
    });

    this.trialName = `trial-${this.uuidv4()}`
    const trialRef = ref(db, `base-trials/` + this.trialName)
    socket.emit("joinBaseRoom", this.trialName);

    await get(trialRef).then(async (snapshot) => {
      if (!snapshot.exists()) {
        await set(trialRef, {
          trialName: this.trialName,
          createdAt: new Date().getTime(),
        }).catch(console.error)
      }
    }).catch((error) => {
      console.error(error);
    });

    window.onerror = async function (msg, url, line, col, error) {
      await push(ref(db, `trials/${this.trialName}/errorLogs`), {
        timestamp: new Date().getTime(),
        errorMsg: msg,
        errorUrl: url,
        errorLine: line,
        errorCol: col,
        error: error
      })
    }
  },
  beforeUnmount() {
    socket.disconnect();
  },

}
</script>

<style scoped>

</style>
