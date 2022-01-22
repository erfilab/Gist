<template>
  <div>
    <!--  -->
    <v-app style="position: relative">
      <v-touch v-on:tap="deselect">
        <!-- <v-app-bar elevation="4" app dark clipped-left clipped-right>
          <v-toolbar-title style="margin-right: 20px">
            Blurt-Ed</v-toolbar-title
          >
        </v-app-bar> -->

        <v-main
          style="margin: 20px 40px 80px 40px; position: relative"
          id="main"
        >
          <SemanticText :semantic_text="this.text"></SemanticText>
          <MyCursor id="my_cursor" />
        </v-main>
      </v-touch>

      <!--    <router-view/>-->
      <!--        <v-fab-transition>-->
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
        <v-icon>{{
          isFullScreen ? "mdi-fullscreen-exit" : "mdi-fullscreen"
        }}</v-icon>
      </v-btn>

      <v-btn
        :color="this.cancelButtonColor"
        fab
        dark
        absolute
        bottom
        left
        style="position: fixed; bottom: 15px; left: 46px"
        @click="deleteText"
      >
        <v-icon>mdi-close</v-icon>
      </v-btn>
      <!--        </v-fab-transition>-->

      <v-touch v-on:press="pressSpeak" v-on:pressup="releaseSpeak">
        <v-btn
          :color="this.speakButtonColor"
          fab
          dark
          absolute
          bottom
          right
          style="position: fixed; bottom: 15px; right: 36px"
        >
          <v-icon>mdi-microphone</v-icon>
        </v-btn>
      </v-touch>

      <v-touch id="to_modify_area" style="display: none">
        <SwipeText />
      </v-touch>
      <div id="speaking_area" style="display: none; width: 100%" />
    </v-app>
  </div>
</template>

<script>
import SemanticText from "@/components/SemanticText";
import SwipeText from "@/components/SwipeText";
import MyCursor from "@/components/MyCursor";

import { io } from "socket.io-client";

const nowDay = new Date().toISOString().slice(0, 10);
let socket = null;
let context, processor, audioContext, globalStream, audioInput;
// let stream = null;

export default {
  name: "App",

  data: () => ({
    text: "Once upon a time, there was a king; who used to wear a single horned crown. He had a lavish palace, three beautiful wives, and seven children; all well qualified in their respective fields. The king was reaching the retirement age, so he asked his elder son to lead his empire so that he could undergo seclusion. Now, his Elder Son, Jonathan had set other plans for himself. So he turned down his father’s offer. Jonathan was a nature lover; and he wished to live in a thatched house within the deepest parts of the jungle. The king was disheartened; but he accepted Jonathan’s plea. He asked Jonathan’s immediate junior brother Sharlie to handle the loads of the throne. Sharlie accepted; but on a clause – whenever Jonathan would change his mind, Sharlie would return his throne to him.",
    // text: "one. two. four.",
    cancelButtonColor: "grey",
    speakButtonColor: "grey",
    voice2text: "",
    if_cursor_ele_loc_id_updated: false,

    resultError: false,
    speechLang: "en-US",

    // transcript
    formattedMessages: [],
    messages: [],

    isFullScreen: false,
  }),

  components: {
    // SemanticBlock,
    MyCursor,
    SemanticText,
    SwipeText,
  },

  computed: {
    selected_val() {
      return this.$store.state.selected;
    },
    isSpeaking_val() {
      return this.$store.state.isSpeaking;
    },
    voice2text_val() {
      return this.voice2text;
    },
    cursor_ele_loc_id() {
      return this.$store.state.cursor_ele_loc_id;
    },
  },

  watch: {
    // change the color of the cancel button
    selected_val() {
      if (this.$store.state.selected === false) {
        this.cancelButtonColor = "grey";
        // remove the background color of the selected text
        this.$store.state.selected_elements.forEach((ele) => {
          // ele.style.removeProperty("background-color");
          ele.style.backgroundColor = "#E0E0E0";
        });
        this.$store.commit("clear_element");
      } else {
        this.cancelButtonColor = "red";
      }
    },

    isSpeaking_val() {
      // when the user wants to replace the selected words
      if (this.$store.state.isSpeaking) {
        // the speaking area
        const speaking_area = document.getElementById("speaking_area");
        speaking_area.style.removeProperty("display");
        const to_modify_area = document.getElementById("to_modify_area");

        if (this.$store.state.selected) {
          to_modify_area.style.removeProperty("display");
          // find the inserted location
          const cursorElement = this.$store.state.cursor_ele_loc;
          cursorElement.parentNode.insertBefore(
            to_modify_area,
            cursorElement.nextElementSibling
          );
          this.$store.state.selected_elements.forEach((ele) => {
            ele.style.display = "none";
            ele.parentNode.removeChild(ele);
          });

          to_modify_area.parentNode.insertBefore(
            speaking_area,
            to_modify_area.nextElementSibling
          );
        } else {
          to_modify_area.style.display = "none";
          const cursorElement = this.$store.state.cursor_ele_loc;
          cursorElement.parentNode.insertBefore(
            speaking_area,
            cursorElement.nextElementSibling
          );
        }
      }
    },

    voice2text_val() {
      const speaking_area = document.getElementById("speaking_area");
      speaking_area.innerHTML = this.voice2text;
      if (speaking_area.lastElementChild) {
        while (speaking_area.lastElementChild) {
          // remove all the children first
          speaking_area.removeChild(speaking_area.lastElementChild);
        }
      }

      let newSemanticText = document.createElement("semantic-text-transcribed");
      newSemanticText.setAttribute("semantic_text", this.voice2text);
      speaking_area.appendChild(newSemanticText);
    },

    // set cursor next to the newest sentence
    cursor_ele_loc_id() {
      this.if_cursor_ele_loc_id_updated = true;
    },
  },

  updated() {
    if (this.if_cursor_ele_loc_id_updated) {
      if (this.$store.state.cursor_ele_loc_id !== "") {
        const target = document.getElementById(
          this.$store.state.cursor_ele_loc_id
        );
        this.$store.commit("set_cursor_ele_loc", target.nextElementSibling);
        this.$store.commit("update_current_index", target.dataset.index);

        const cursor_ele = document.getElementById("my_cursor");
        target.parentNode.insertBefore(
          cursor_ele,
          target.nextElementSibling.nextElementSibling
        );
      }
      this.if_cursor_ele_loc_id_updated = false;
    }
  },

  methods: {
    deselect: function () {
      this.$store.commit("deselect_text"); // selected = false
    },
    pressSpeak: function () {
      this.messages = [];
      this.formattedMessages = [];

      this.speakButtonColor = "green";
      this.$store.commit("start_speak");

      if (!this.$store.state.selected) {
        const to_modify_area = document.getElementById("to_modify_area");
        to_modify_area.style.display = "none";
      }

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
    releaseSpeak: function () {
      this.$store.commit("deselect_text"); // selected = false
      this.speakButtonColor = "grey";
      this.$store.commit("stop_speak");

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

      this.$store.commit("set_new_semantic_content", this.voice2text);
      this.voice2text = "";
      this.formattedMessages = [];
      this.messages = [];

      const speaking_area = document.getElementById("speaking_area");
      speaking_area.style.display = "none";
      speaking_area.innerHTML = "";
    },
    deleteText: function () {
      if (this.$store.state.selected) {
        // move the cursor to the next sibling of the last element in the list
        const select_count = this.$store.state.selected_elements.length;
        const cursor_ele = document.getElementById("my_cursor");
        const lastEle = this.$store.state.selected_elements[select_count - 1];
        lastEle.parentNode.nextElementSibling.insertBefore(
          cursor_ele,
          lastEle.parentNode.nextElementSibling.firstChild.nextSibling
            .nextSibling
        );

        const parentNode =
          this.$store.state.selected_elements[0].parentNode.parentNode;
        this.$store.state.selected_elements.forEach((ele) => {
          parentNode.removeChild(ele.parentNode);
        });
        this.$store.commit("clear_element");
        this.$store.commit("deselect_text");
      }
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
        window.document
          .exitFullscreen()
          .catch(console.error);
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
    this.speakButtonColor = "grey";
    this.$store.commit("deselect_text");
    this.$store.commit("stop_speak");
    this.$store.commit("clear_element");

    // speech recognition socket innitialization
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

      //   console.log("Results: ", results);
      this.voice2text = results;
    });

    socket.emit("joinRoom", "default_room_name");
  },
  beforeUnmount() {
    // socket.emit("leaveRoom", "default_room_name");
    socket.disconnect();
  },
};
</script>

<style lang="css">
html {
  overflow: hidden;
}

body {
  width: 100%;
  height: 100%;
  position: fixed;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
</style>
