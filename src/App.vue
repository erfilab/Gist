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
          <SemanticText :semantic_text="this.text" :trialName="this.trialName"></SemanticText>
          <MyCursor id="my_cursor"/>
          <div id="last-element"/>
        </v-main>
      </v-touch>

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

      <hr id="speaking_area_lower" style="display: none; margin: 5px 0"/>
    </v-app>
  </div>
</template>

<script>
import SemanticText from "@/components/SemanticText";
// import SwipeText from "@/components/SwipeText";
import MyCursor from "@/components/MyCursor";

import {io} from "socket.io-client";
import {mapGetters} from "vuex";
import {db} from '@/plugins/firebase.js';
import {ref, set, get, push} from 'firebase/database';

const nowDay = new Date().toISOString().slice(0, 10);
let socket = null;
let context, processor, audioContext, globalStream, audioInput;

export default {
  name: "App",

  data: () => ({
    text: "",
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

    // trial information
    trialName: null,

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
    async selectedNo() {
      if (this.selectedNo >= 1) {
        if (this.selectedElements.length > 0) {
          this.changeLocationAndSpeak();

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
          const cursorElement = document.getElementById("my_cursor");
          cursorElement.parentNode.insertBefore(
              clone_modify_area,
              cursorElement
          );
          speaking_area.style.removeProperty("display");

          clone_modify_area.style.display = "block";
          clone_modify_area.parentNode.insertBefore(
              speaking_area,
              clone_modify_area.nextElementSibling
          );

          await this.storeDataLog({
            type: 'multi_select',
            content: clone_modify_area.innerHTML,
            targetId: `to-modify-area-${this.selectedNo}`
          })

          // remove selected blocks
          this.selectedElements.forEach((i) => {
            if (i.previousElementSibling && i.previousElementSibling.tagName === 'HR') {
              const speaking_area = document.getElementById('speaking_area_lower')
              const inserted_target = document.getElementById('last-element')
              speaking_area.style.display = 'none'
              inserted_target.parentNode.insertBefore(
                  speaking_area,
                  inserted_target
              );
            }
            i.parentNode.parentNode.removeChild(i.parentNode)
          });
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
    async storeDataLog(payload) {
      await push(ref(db, `trials/${this.trialName}/systemLogs`), {
        timestamp: new Date().getTime(),
        ...payload,
      }).catch(console.error)
      // .then(res => this.currentChannel = {...this.currentChannel, dbKey: res.key})
    },
    // export the text to the clipboard
    async exportText() {
      let text = "";
      this.$store.state.semanticList.forEach(ele => {
        text += ele.text.trim();
        text += " ";
      })
      await navigator.clipboard.writeText(text.trim());
      await this.storeDataLog({
        type: 'export',
        content: text
      })
    },
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
    async handleTouchStart(e) {
      this.currentTarget = document.getElementById(e.target.id);
      const firstTouch = this.getTouches(e)[0];
      this.startX = firstTouch.clientX;

      this.$store.commit("clear_element");
      this.$store.commit("change_location_speaking");

      let selectedSpanElement = null
      let insertedIndex = 0
      let targetSibling = null

      const selectedList = this.currentTarget.innerText
          .split(/(.*?[.,;?])/g)
          .filter((i) => i && i.trim());

      // check if is the last element
      if (!this.currentTarget.nextElementSibling ||
          (this.currentTarget.nextElementSibling.tagName === 'DIV' &&
              this.currentTarget.nextElementSibling.nextElementSibling &&
              this.currentTarget.nextElementSibling.nextElementSibling.tagName === 'DIV' &&
              !this.currentTarget.nextElementSibling.nextElementSibling.nextElementSibling
          )) {
        // is the last element
        if (!this.currentTarget.previousElementSibling) {
          // the first element being selected
          insertedIndex = 0
        } else {
          selectedSpanElement = this.currentTarget.previousElementSibling.firstChild
          insertedIndex = parseInt(selectedSpanElement.dataset.index) + selectedList.length
        }
        targetSibling = document.getElementById('last-element')
        this.$store.commit("update_current_target_block", null);
      } else {
        if (this.currentTarget.nextElementSibling.tagName === 'DIV') {
          if (this.currentTarget.nextElementSibling.nextElementSibling && this.currentTarget.nextElementSibling.nextElementSibling.firstChild.innerText.length > 1) {
            selectedSpanElement = this.currentTarget.nextElementSibling.nextElementSibling.firstChild
          } else selectedSpanElement = this.currentTarget.nextElementSibling.nextElementSibling.nextElementSibling.firstChild
        } else {
          if (this.currentTarget.nextElementSibling && this.currentTarget.nextElementSibling.firstChild.innerText.length > 1) {
            // select other green and come back
            selectedSpanElement = this.currentTarget.nextElementSibling.firstChild
          } else selectedSpanElement = this.currentTarget.nextElementSibling.childNodes[2]
        }

        insertedIndex = parseInt(selectedSpanElement.dataset.index)
        targetSibling = document.querySelector(
            `[data-index="${insertedIndex}"]`
        );
        this.$store.commit("update_current_target_block", targetSibling);
      }
      this.$store.commit("update_current_index", insertedIndex);
      // console.log('start', targetSibling, insertedIndex)

      const speaking_area = document.getElementById("speaking_area");
      speaking_area.style.display = "contents";
      const cursorElement = document.getElementById("my_cursor");

      if (targetSibling) targetSibling.parentNode.insertBefore(cursorElement, targetSibling);

      cursorElement.parentNode.insertBefore(
          speaking_area,
          cursorElement.nextElementSibling
      );

      await this.storeDataLog({
        type: 'touch_block',
        targetId: e.target.id,
        content: this.currentTarget.innerText,
      })
    },
    handleTouchMove(e) {
      if (!this.startX) return;

      const xUp = e.touches[0].clientX;
      this.xDiff = this.startX - xUp;

      this.currentTarget.style.right = `${this.xDiff}px`;
      if (this.xDiff > 0) {
        this.currentTarget.style.backgroundColor = `rgb(${197 + this.xDiff}, ${
            225 - this.xDiff
        }, ${165 - this.xDiff})`;
      }
    },
    async handleTouchEnd() {
      if (this.xDiff > 180) {
        this.currentTarget.parentNode.removeChild(this.currentTarget);
        const removed_list = this.currentTarget.innerText
            .split(/(.*?[.,;?])/g)
            .filter((i) => i && i.trim());

        let temp_semanticList = this.semanticList;
        removed_list.forEach((i) => {
          temp_semanticList = temp_semanticList.filter((ele) => ele.text !== i);
        });

        await this.storeDataLog({
          type: 'remove_text',
          content: this.currentTarget.innerText,
          currentContent: temp_semanticList
        })

        this.$store.commit("set_semanticList", temp_semanticList);
        this.$store.commit("clear_element");
      } else if (this.xDiff < -180) {
        const insertedList = this.currentTarget.innerText
            .split(/(.*?[.,;?])/g)
            .filter((i) => i && i.trim())
            .map((val) => {
              return {
                key: this.uuidv4(),
                text: val,
                id: this.uuidv4(),
                fadeIn: true,
              };
            });

        let insertedIndex = parseInt(this.$store.state.current_block_index)
        let semantic_block = this.semanticList.slice(0);
        if (!this.currentTarget.nextElementSibling ||
            (this.currentTarget.nextElementSibling.tagName === 'DIV' &&
                this.currentTarget.nextElementSibling.nextElementSibling &&
                this.currentTarget.nextElementSibling.nextElementSibling.tagName === 'DIV' &&
                !this.currentTarget.nextElementSibling.nextElementSibling.nextElementSibling
            )) {
          // is the last element
          if (!this.currentTarget.previousElementSibling) {
            // select all
            semantic_block.push(...insertedList)
          } else {
            insertedIndex = insertedIndex + 1
            semantic_block.splice(parseInt(insertedIndex), 0, ...insertedList);
          }
        } else {
          semantic_block.splice(parseInt(insertedIndex), 0, ...insertedList);
        }

        await this.storeDataLog({
          type: 'remain_text',
          content: this.currentTarget.innerText,
          currentContent: semantic_block
        })
        this.currentTarget.parentNode.removeChild(this.currentTarget);
        await this.$store.commit("update_current_index", parseInt(insertedIndex) + insertedList.length);
        await this.$store.commit("set_semanticList", semantic_block);
        // console.log('insert: ', insertedIndex, this.semanticList)
        await this.$store.commit("clear_element");
      } else {
        this.currentTarget.style.right = 0;
        this.currentTarget.style.backgroundColor = "rgb(197, 225, 165)";
      }

      this.startX = null;
      this.xDiff = 0;
      this.currentTarget = null;
    },
    async turnOnMic() {
      this.isStreaming = true;
      this.messages = [];
      this.formattedMessages = [];
      this.voice2text = null;
      this.$store.commit("clear_element");

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

      this.storeDataLog({
        type: 'microphone',
        event: false
      })

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

    socket.on("TRANSCRIPT", async (data) => {
      this.formattedMessages = this.formattedMessages.concat(data);
      this.messages = this.getFinalAndLatestInterimResult();

      this.voice2text = this.messages
          .map((msg) =>
              msg.results.map((result) => result.alternatives[0].transcript)
          )
          .reduce((a, b) => a.concat(b), [])
    });

    this.trialName = `trial-${this.uuidv4()}`
    const trialRef = ref(db, `trials/` + this.trialName)
    socket.emit("joinRoom", this.trialName);

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

    await this.$store.commit("update_current_target_block", null);
    await this.$store.commit("update_current_index", 0);

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
};
</script>

<style lang="scss">
#app {
  overflow-y: auto;
}
</style>
