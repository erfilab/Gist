<template>
  <v-layout row wrap>
    <v-flex xs4> </v-flex>
    <v-flex xs4 class="text-xs-center">
      <v-select
        v-show="btn"
        v-bind:items="items"
        v-model="selected"
        label="Select a language"
      ></v-select>
      <v-btn
        v-show="btn"
        @click.end="startRecording"
        block
        round
        color="primary"
        dark
      >
        <v-icon left>mic</v-icon> Recording</v-btn
      >
      <v-btn
        v-show="btnStop"
        @click.end="stopRecording"
        block
        round
        color="error"
        dark
      >
        <v-icon left>stop</v-icon> Stop
      </v-btn>
    </v-flex>
    <v-flex xs4> </v-flex>
    <v-flex xs12>
      <transition name="slide">
        <div v-show="result">
          <v-layout row wrap>
            <v-flex xs3> </v-flex>
            <v-flex xs6>
              <v-card class="blue-grey darken-2 white--text">
                <v-card-title primary-title>
                  <div class="headline"></div>
                  <div>{{ textResult }}</div>
                </v-card-title>

                <h6></h6>
              </v-card>
            </v-flex>
            <v-flex xs3> </v-flex>
          </v-layout>
        </div>
      </transition>
      <transition name="slide">
        <div v-show="resultError" class="text-xs-center">
          <v-layout row wrap>
            <v-flex xs3> </v-flex>
            <v-flex xs6>
              <v-card class="red darken-3 white--text">
                <v-card-title primary-title>
                  <div class="headline">Reached transcription time limit</div>
                </v-card-title>
                <v-card-actions>
                  <v-btn @click.native="redirectError" flat dark
                    >Try Again</v-btn
                  >
                </v-card-actions>
              </v-card>
            </v-flex>
            <v-flex xs3> </v-flex>
          </v-layout>
        </div>
      </transition>
    </v-flex>
  </v-layout>
</template>

<script>
import { io } from "socket.io-client";
const nowDay = new Date().toISOString().slice(0, 10);
let socket = null;
let context, processor, source, audioContext, globalStream, audioInput;
let mediaRecorder = null;
let stream = null;

export default {
  data() {
    return {
      btn: true,
      btnStop: false,
      result: false,
      resultError: false,
      textResult: "",
      selected: "en-US",
      items: [
        {
          text: "English (Australia)",
          value: "en-AU",
        },
        {
          text: "English (Canada)",
          value: "en-CA",
        },
        {
          text: "English (Great Britain)",
          value: "en-GB",
        },
        {
          text: "English (India)",
          value: "en-IN",
        },
        {
          text: "English (Ireland)",
          value: "en-IE",
        },
        {
          text: "English (Kenya)",
          value: "en-KE",
        },
        {
          text: "English (New Zealand)",
          value: "en-NZ",
        },
        {
          text: "English (Nigeria)",
          value: "en-NG",
        },
        {
          text: "English (Philippines)",
          value: "en-PH",
        },
        {
          text: "English (South Africa)",
          value: "en-ZA",
        },
        {
          text: "English (Tanzania)",
          value: "en-TZ",
        },
        {
          text: "English (United States)",
          value: "en-US",
        },
        {
          text: "한국어 (대한민국)",
          value: "ko-KR",
        },
        {
          text: "國語 (台灣)",
          value: "cmn-Hant-TW",
        },
        {
          text: "廣東話 (香港)",
          value: "yue-Hant-HK",
        },
        {
          text: "日本語（日本)",
          value: "ja-JP",
        },
        {
          text: "普通話 (香港)",
          value: "cmn-Hans-HK",
        },
        {
          text: "普通话 (中国大陆)",
          value: "cmn-Hans-CN",
        },
      ],
    };
  },
  methods: {
    successCallback(stream) {
      const vm = this;
      console.log("successCallback:....IN");
      var input = audioContext.createMediaStreamSource(stream);
      var bufferSize = 2048;
      scriptNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
      scriptNode.onaudioprocess = scriptNodeProcess;
      input.connect(scriptNode);

      // console.log('ScriptNode BufferSize:', scriptNode.bufferSize);
      function scriptNodeProcess(audioProcessingEvent) {
        var inputBuffer = audioProcessingEvent.inputBuffer;
        var outputBuffer = audioProcessingEvent.outputBuffer;
        var inputData = inputBuffer.getChannelData(0);
        var outputData = outputBuffer.getChannelData(0);

        // Loop through the 4096 samples
        for (var sample = 0; sample < inputBuffer.length; sample++) {
          outputData[sample] = inputData[sample];
        }
        ssStream.write(
          new ss.Buffer(vm.downsampleBuffer(inputData, 44100, 16000))
        );
      }
    },
    downsampleBuffer(buffer, sampleRate, outSampleRate) {
      if (outSampleRate == sampleRate) {
        return buffer;
      }
      if (outSampleRate > sampleRate) {
        throw "downsampling rate show be smaller than original sample rate";
      }
      var sampleRateRatio = sampleRate / outSampleRate;
      var newLength = Math.round(buffer.length / sampleRateRatio);
      var result = new Int16Array(newLength);
      var offsetResult = 0;
      var offsetBuffer = 0;
      while (offsetResult < result.length) {
        var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
        var accum = 0,
          count = 0;
        for (
          var i = offsetBuffer;
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
    startRecording() {
      // const languageSelected = this.selected;
      // socket.emit("LANGUAGE_SPEECH", languageSelected);
      this.result = true;
      this.btn = false;
      this.btnStop = true;

      socket.emit("startRecording");
      audioContext = window.AudioContext || window.webkitAudioContext
      context = new audioContext({ latencyHint: "interactive" });
      processor = context.createScriptProcessor(2048, 1, 1);
      processor.connect(context.destination);
      context.resume();

      const handleSuccess = stream => {
        globalStream = stream;
        audioInput = context.createMediaStreamSource(stream);
        audioInput.connect(processor);

        processor.onaudioprocess = e => {
          if (!socket) {
            return;
          }
          socket.emit("BINARY_DATA", this.downsampleBuffer(e.inputBuffer.getChannelData(0), 44100, 16000));
        };
      }

      navigator.mediaDevices
        .getUserMedia({ audio: true, video: false })
        .then(handleSuccess);
    },
    stopRecording() {
      this.btnStop = false;
      this.btn = true;
      
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
    },
    errorCallback(error) {
      console.log("errorCallback:", error);
    },
    redirectError() {
      window.location.href = "http://localhost:8080/";
    },
  },
  async created() {
    socket = io("http://localhost:3000/" + nowDay);
    console.log("mounted:....IN", socket.id);

    socket.on("INTERIM_TRANSCRIPT", (data) => {
      console.log("interim:", data);
    });

    socket.on("FINAL_TRANSCRIPT", (data) => {
      console.log("final:", data);
    });

    socket.emit("joinRoom", "default_room_name");
  },
  beforeUnmount() {
    socket.disconnect();
  },
};
</script>

<style>
.slide-enter {
  opacity: 0;
}

.slide-enter-active {
  animation: slide-in 1s ease-out forwards;
  transition: opacity 0.5s;
}

.slide-move {
  transition: transform 1s;
}

@keyframes slide-in {
  from {
    transform: translateY(20px);
  }
  to {
    transform: translateY(0);
  }
}
</style>
