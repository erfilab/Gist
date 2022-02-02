<template>
  <div>
    <v-app style="position: relative">
      <v-touch>
        <v-main
          style="
            margin: 25px 20px 20px 20px;
            position: relative;
            text-align: justify;
            text-justify: inter-word;
          "
          id="main"
        >
          <SemanticText :semantic_text="this.text"></SemanticText>
          <MyCursor id="my_cursor" />
        </v-main>
      </v-touch>

      <v-btn
        fab
        dark
        absolute
        bottom
        left
        small
        style="position: fixed; bottom: 15px; left: 5px"
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
      <v-btn
        :color="isStreaming ? 'green' : 'grey'"
        fab
        dark
        absolute
        bottom
        right
        style="position: fixed; bottom: 15px; right: 36px"
        @click="isStreaming ? turnOffMic() : turnOnMic()"
      >
        <v-icon>mdi-microphone</v-icon>
      </v-btn>

      <span
        id="to-modify-area"
        style="
          display: none;
          background-color: #c5e1a5;
          right: 0px;
          position: relative;
        "
      />
      <!-- <SwipeText /> -->
      <div
        id="speaking_area"
        style="display: none; width: 100%; font-size: large"
      ></div>

      <hr id="speaking_area_lower" style="display: none; margin: 5px 0" />
    </v-app>
  </div>
</template>

<script>
import SemanticText from "@/components/SemanticText";
// import SwipeText from "@/components/SwipeText";
import MyCursor from "@/components/MyCursor";

import { io } from "socket.io-client";

const nowDay = new Date().toISOString().slice(0, 10);
let socket = null;
let context, processor, audioContext, globalStream, audioInput;
import { mapGetters } from "vuex";

export default {
  name: "App",

  data: () => ({
    text: "Once upon a time, there was a king; who used to wear a single horned crown. He had a lavish palace, three beautiful wives, and seven children; all well qualified in their respective fields. The king was reaching the retirement age, so he asked his elder son to lead his empire so that he could undergo seclusion. Now, his Elder Son, Jonathan had set other plans for himself. So he turned down his father’s offer. Jonathan was a nature lover; and he wished to live in a thatched house within the deepest parts of the jungle. The king was disheartened; but he accepted Jonathan’s plea. He asked Jonathan’s immediate junior brother Sharlie to handle the loads of the throne. Sharlie accepted; but on a clause – whenever Jonathan would change his mind, Sharlie would return his throne to him.",
    voice2text: "",

    resultError: false,
    speechLang: "en-US",

    // transcript
    formattedMessages: [],
    messages: [],

    isFullScreen: false,
    isStreaming: false,

    startX: null,
    xDiff: 0,
    currentTarget: null,
  }),

  components: {
    MyCursor,
    SemanticText,
    // SwipeText,
  },

  computed: {
    ...mapGetters([
      "selectedNo",
      "selectedElements",
      "semanticList",
      "newSemanticContent",
    ]),
    voice2text_val() {
      return this.voice2text;
    },
  },

  watch: {
    selectedNo() {
      if (this.selectedNo >= 1) {
        if (this.selectedElements.length > 0) {
          this.changeLocationAndSpeak();
          this.selectedElements.forEach((ele) => {
            ele.style.display = "none";
            if (ele.parentNode) ele.parentNode.removeChild(ele);
          });

          const to_modify_area = document.getElementById("to-modify-area");
          let clone_modify_area = to_modify_area.cloneNode(true);
          clone_modify_area.setAttribute(
            "id",
            `to-modify-area-${this.selectedNo}`
          );

          clone_modify_area.innerHTML = this.selectedElements
            .map((ele) => ele.innerHTML)
            .join(" ");

          clone_modify_area.addEventListener(
            "touchstart",
            this.handleTouchStart,
            false
          );
          clone_modify_area.addEventListener(
            "touchmove",
            this.handleTouchMove,
            false
          );
          clone_modify_area.addEventListener(
            "touchend",
            this.handleTouchEnd,
            false
          );

          const speaking_area = document.getElementById("speaking_area");
          const cursorElement = this.$store.state.cursor_ele_loc;

          cursorElement.parentNode.insertBefore(
            clone_modify_area,
            cursorElement.nextElementSibling
          );
          speaking_area.style.removeProperty("display");

          clone_modify_area.style.display = "block";
          clone_modify_area.parentNode.insertBefore(
            speaking_area,
            clone_modify_area.nextElementSibling
          );
        }
      }
    },

    newSemanticContent(newVal, oldVal) {
      if (oldVal && !newVal) {
        this.changeLocationAndSpeak();
      }
    },

    voice2text_val() {
      this.$store.commit("set_new_semantic_content", this.voice2text);
    },
  },

  methods: {
    uuidv4() {
      return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
        (
          c ^
          (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
        ).toString(16)
      );
    },
    changeLocationAndSpeak() {
      this.$store.commit("change_location_speaking");
      this.messages = [];
      this.formattedMessages = [];
      this.voice2text = null;
    },
    getTouches(e) {
      return e.touches || e.originalEvent.touches;
    },
    handleTouchStart(e) {
      this.currentTarget = document.getElementById(e.target.id);
      const firstTouch = this.getTouches(e)[0];
      this.startX = firstTouch.clientX;
    },
    handleTouchMove(e) {
      if (!this.startX) return;

      const xUp = e.touches[0].clientX;
      this.xDiff = this.startX - xUp;

      if (this.xDiff > 0) {
        this.currentTarget.style.right = `${this.xDiff}px`;
      }
    },
    handleTouchEnd() {
      if (this.xDiff > 200) {
        this.currentTarget.parentNode.removeChild(this.currentTarget);
        const removed_list = this.currentTarget.innerText
          .split(/(.*?[.,;?])/g)
          .filter((i) => i && i.trim());

        let temp_semanticList = this.semanticList;
        removed_list.forEach((i) => {
          temp_semanticList = temp_semanticList.filter(
            (ele) => ele.content !== i
          );
        });
        this.$store.commit("set_semanticList", temp_semanticList);
        this.$store.commit("clear_element");
      } else {
        this.currentTarget.style.right = 0;
      }

      this.startX = null;
      this.xDiff = 0;
      this.currentTarget = null;
    },
    turnOnMic() {
      this.isStreaming = true;
      this.messages = [];
      this.formattedMessages = [];
      this.voice2text = null;
      this.$store.commit("clear_element");

      socket.emit("startRecording");
      audioContext = window.AudioContext || window.webkitAudioContext;
      context = new audioContext({ latencyHint: "interactive" });
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
        .getUserMedia({ audio: true, video: false })
        .then(handleSuccess);
    },
    turnOffMic() {
      this.isStreaming = false;
      this.$store.commit("clear_element");

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

      this.voice2text = "";
      this.formattedMessages = [];
      this.messages = [];

      const speaking_area = document.getElementById("speaking_area");
      speaking_area.style.display = "none";
      speaking_area.innerHTML = "";
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
          .requestFullscreen({ navigationUI: "hide" })
          .catch(console.error);

        this.isFullScreen = true;
      }
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

    socket.on("TRANSCRIPT", (data) => {
      this.formattedMessages = this.formattedMessages.concat(data);
      this.messages = this.getFinalAndLatestInterimResult();

      const results = this.messages
        .map((msg) =>
          msg.results.map((result) => result.alternatives[0].transcript)
        )
        .reduce((a, b) => a.concat(b), []);

      this.voice2text = results;
    });

    socket.emit("joinRoom", this.uuidv4());
  },
  beforeUnmount() {
    socket.disconnect();
  },
};
</script>
