<template>
  <div>
    <v-app style="position: relative">
      <v-btn-toggle
          tile
          group
          style="margin: 0 auto;"
      >
        <v-btn @click="() => {this.baseMode = false; this.postAnalMode = false}">
          Gist
          <v-icon right>mdi-alpha-g-box</v-icon>
        </v-btn>
        <v-btn @click="() => {this.baseMode = true; this.postAnalMode = false}">
          Baseline
          <v-icon right>mdi-alpha-b-box</v-icon>
        </v-btn>
        <v-btn @click="() => {this.baseMode = false; this.postAnalMode = true}">
          Analysis
          <v-icon right>mdi-alpha-a-box</v-icon>
        </v-btn>
      </v-btn-toggle>
      <v-touch v-if="!baseMode && !postAnalMode">
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

      <div class="container"
           v-if="baseMode && !postAnalMode"
           contenteditable="true"
           style="
            text-align: justify;

            margin: 25px 20px 20px 20px;
            text-justify: inter-word;
          "
      >
        <div class="backdrop">
          <div class="highlights" v-html="clonedBaseText">
          </div>
        </div>
        <textarea
            @click="select"
            id="base-textarea"
            v-model="baseText"
            ref="input"
        >
        </textarea>
      </div>
      <v-main
          v-if="postAnalMode && !baseMode"
          contenteditable="true"
          style="
            text-align: justify;
            margin: 25px 20px 20px 20px;
            text-justify: inter-word;
          "
      >
        <v-textarea
            id="post-anal-textarea"
            v-model="postAnalText"
            @click="selectPostText"
            @input="inputPostText"
        >
        </v-textarea>
      </v-main>

<!--      <v-btn fab dark-->
<!--             absolute bottom left-->
<!--             style="position: fixed; bottom: 15px; left: 25px"-->
<!--             @click.end="toggleFullScreen"-->
<!--      >-->
<!--        <v-icon-->
<!--        >{{ isFullScreen ? "mdi-fullscreen-exit" : "mdi-fullscreen" }}-->
<!--        </v-icon>-->
<!--      </v-btn>-->

      <v-btn fab dark
             absolute bottom left
             style="position: fixed; bottom: 15px; left: 83px"
             @click="exportText"
      >
        <v-icon>mdi-download</v-icon>
      </v-btn>

      <v-btn
          fab
          color="warning"
          absolute
          bottom
          left
          style="position: fixed; bottom: 15px; left: 25px"

          @click="deleteText"
      >
        <v-icon>mdi-close</v-icon>
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
import {diffChars, diffWords} from 'diff'

const nowDay = new Date().toISOString().slice(0, 10);
let socket = null;
let context, processor, audioContext, globalStream, audioInput, timer;

export default {
  name: "App",

  data: () => ({
    // text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. In diam arcu, aliquet a tellus feugiat, tincidunt maximus sapien. Integer urna eros, blandit non lacinia et, feugiat a elit. Mauris in sapien quis velit ultricies ultricies. Nulla varius mi in ligula fermentum, ac gravida dolor hendrerit. Phasellus fringilla at odio eget facilisis. ",
    text: "",
    voice2text: "",

    resultError: false,
    speechLang: "en-US",

    // transcript
    formattedMessages: [],
    messages: [],

    isFullScreen: false,
    isStreaming: false,
    isTranscribing: false,

    startX: null,
    xDiff: 0,
    screenX: 9999,
    currentTarget: null,
    allCurrentTargets: [],
    allCurrentTargetText: "",

    // trial information
    trialName: null,

    //gesture
    lastTapTime: null,


    // post analysis mode
    postAnalMode: false,
    postAnalText: "",

    // base mode
    baseMode: true,
    currentHighlightedText: "",
    baseText: "",
    clonedBaseText: "",
    // baseText: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. In diam arcu, aliquet a tellus feugiat, tincidunt maximus sapien. Integer urna eros, blandit non lacinia et, feugiat a elit. Mauris in sapien quis velit ultricies ultricies. Nulla varius mi in ligula fermentum, ac gravida dolor hendrerit. Phasellus fringilla at odio eget love facilisis. ",
    // clonedBaseText: "<mark>Lorem</mark> ipsum dolor sit amet, <mark>consectetur adipiscing elit.</mark> In diam arcu, aliquet a tellus feugiat, <mark>tincidunt</mark> maximus sapien. Integer urna <mark>eros,</mark> blandit non <mark>lacinia et</mark>, feugiat a elit. Mauris in <mark>sapien quis velit ultricies ultricies.</mark> Nulla varius mi in ligula fermentum, ac gravida dolor hendrerit. <mark>Phasellus fringilla at odio</mark> edgit love <mark>facilisis</mark>. ",
    interimResult: "",
    isTransFinal: false,
    selectionEnd: 0,
    previousLength: 0,
    prevText: "",
    previousBaseText: "",

    //post analysis
    previousPostText: ""
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
    // async
    async selectedNo() {
      if (this.selectedNo >= 1) {
        if (this.selectedElements.length > 0) {
          this.changeLocationAndSpeak();
          let selectedText = ""
          this.selectedElements.map(ele => {
            selectedText += ele.innerText.trim() + " "
            ele.style.backgroundColor = '#c5e1a5'
            ele.style.padding = '8px'
            ele.style.margin = 0
            ele.setAttribute(
                "id",
                `to-modify-area-${this.selectedNo}`
            );
            ele.addEventListener(
                "touchstart",
                this.handleTouchStart,
                false
            );
            ele.addEventListener(
                "touchmove",
                this.handleTouchMove,
                false
            );
            ele.addEventListener(
                "touchend",
                this.handleTouchEnd,
                false
            );
          })

          // const to_modify_area = document.getElementById("to-modify-area");
          // let clone_modify_area = to_modify_area.cloneNode(true);
          // clone_modify_area.setAttribute(
          //     "id",
          //     `to-modify-area-${this.selectedNo}`
          // );
          //
          // clone_modify_area.innerHTML = this.selectedElements
          //     .map((ele) => ele.innerHTML)
          //     .join(" ");
          //
          // clone_modify_area.addEventListener(
          //     "touchstart",
          //     this.handleTouchStart,
          //     false
          // );
          // clone_modify_area.addEventListener(
          //     "touchmove",
          //     this.handleTouchMove,
          //     false
          // );
          // clone_modify_area.addEventListener(
          //     "touchend",
          //     this.handleTouchEnd,
          //     false
          // );
          //
          const speaking_area = document.getElementById("speaking_area");
          const cursorElement = document.getElementById("my_cursor");
          cursorElement.parentNode.insertBefore(
              speaking_area,
              cursorElement
          );
          speaking_area.style.removeProperty("display");
          //
          // clone_modify_area.style.display = "block";
          // clone_modify_area.parentNode.insertBefore(
          //     speaking_area,
          //     clone_modify_area.nextElementSibling
          // );
          //
          await this.storeDataLog({
            type: 'multi_select',
            content: selectedText,
            targetId: `to-modify-area-${this.selectedNo}`
          })
          //
          // // remove selected blocks
          // this.selectedElements.forEach((i) => {
          //   if (i.previousElementSibling && i.previousElementSibling.tagName === 'HR') {
          //     const speaking_area = document.getElementById('speaking_area_lower')
          //     const inserted_target = document.getElementById('last-element')
          //     speaking_area.style.display = 'none'
          //     inserted_target.parentNode.insertBefore(
          //         speaking_area,
          //         inserted_target
          //     );
          //   }
          //   i.parentNode.parentNode.removeChild(i.parentNode)
          // });
        }
      }
    },
    newSemanticContent(newVal, oldVal) {
      if (oldVal && !newVal) {
        this.changeLocationAndSpeak();
      }
    },

    voice2text_val() {
      if (!this.baseMode) this.$store.commit("set_new_semantic_content", this.voice2text);
    },

    interimResult() {
      // const inputElement = this.$refs.baseText.querySelector('input')
      // const inputElement = document.getElementById('base-textarea')

    }
  },

  methods: {
    select(e) {
      // this.isTranscribing
      this.selectionEnd = e.target.selectionEnd
      this.prevText = this.baseText.substring(this.selectionEnd + this.interimResult.length)
      this.storeDataLog({
        type: `user_selection`,
        selectionEnd: this.selectionEnd,
        prevTextFromSelectionEnd: this.prevText
      })
    },
    deleteText() {
      this.clonedBaseText = this.baseText.replace(this.currentHighlightedText, '')
      this.baseText = this.clonedBaseText
    },
    // inputText(e) {
    //   if (!this.isTranscribing) {
    //     // console.log('input', this.selectionEnd, this.previousBaseText.length - e.length)
    //     this.selectionEnd += (e.length - this.previousBaseText.length)
    //     // this.prevText = this.baseText.substring(this.selectionEnd)
    //   }
    //
    //   const diffWord = diffChars(this.previousBaseText, e)
    //   const id = this.uuidv4()
    //   diffWord.forEach(part => {
    //     // console.log('input diff: ', part.added ? 'added' : part.removed ? 'removed' : 'no change', part.value)
    //     this.storeDataLog({
    //       type: 'inputDiff',
    //       index: id,
    //       mode: part.added ? 'added' : part.removed ? 'removed' : 'no change',
    //       text: part.value
    //     })
    //   })
    //   this.previousBaseText = e
    // },
    selectPostText(e) {
      this.storeDataLog({
        type: `user_selection`,
        selectionEnd: e.target.selectionEnd,
        selectionStart: e.target.selectionStart
      })
    },
    inputPostText(e) {
      const diffChar = diffChars(this.previousPostText, e)
      const id = this.uuidv4()
      diffChar.forEach(part => {
        this.storeDataLog({
          type: 'inputDiff',
          index: id,
          mode: part.added ? 'added' : part.removed ? 'removed' : 'no change',
          text: part.value
        })
      })
      this.previousPostText = e
    },
    async storeDataLog(payload) {
      await push(ref(db, `${this.baseMode ? 'base-' : (this.postAnalMode ? 'post-' : '')}trials/${this.trialName}/systemLogs`), {
        timestamp: new Date().getTime(),
        ...payload,
      }).catch(console.error)
      // .then(res => this.currentChannel = {...this.currentChannel, dbKey: res.key})
    },
    // export the text to the clipboard
    async exportText() {
      let text = "";
      if (this.baseMode) {
        this.voice2text.forEach(v2t => {
          text += v2t.trim()
          text += " "
        })
      } else {
        this.semanticList.forEach(block => {
          text += block.text.trim()
          text += " "
        })
      }
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
      // this.currentTarget = document.getElementById(e.target.id);
      if ((e.target.getAttribute('id')).trim().startsWith('to-modify-area')) {
        this.allCurrentTargets = document.querySelectorAll(`#${e.target.id}`)
        const firstTouch = this.getTouches(e)[0];
        this.startX = firstTouch.clientX;

        this.$store.commit("clear_element");
        this.$store.commit("change_location_speaking");

        // let selectedSpanElement = null
        // let insertedIndex = 0
        const targetSibling = this.allCurrentTargets[this.allCurrentTargets.length - 1]

        // const selectedList = this.currentTarget.innerText
        //     .split(/(.*?[.,;?])/g)
        //     .filter((i) => i && i.trim());

        // check if is the last element
        // if (!this.currentTarget.nextElementSibling ||
        //     (this.currentTarget.nextElementSibling.tagName === 'DIV' &&
        //         this.currentTarget.nextElementSibling.nextElementSibling &&
        //         this.currentTarget.nextElementSibling.nextElementSibling.tagName === 'DIV' &&
        //         !this.currentTarget.nextElementSibling.nextElementSibling.nextElementSibling
        //     )) {
        //   // is the last element
        //   if (!this.currentTarget.previousElementSibling) {
        //     // the first element being selected
        //     insertedIndex = 0
        //   } else {
        //     selectedSpanElement = this.currentTarget.previousElementSibling.firstChild
        //     insertedIndex = parseInt(selectedSpanElement.dataset.index) + selectedList.length
        //   }
        //   targetSibling = document.getElementById('last-element')
        //   this.$store.commit("update_current_target_block", null);
        // } else {
        //   if (this.currentTarget.nextElementSibling.tagName === 'DIV') {
        //     if (this.currentTarget.nextElementSibling.nextElementSibling && this.currentTarget.nextElementSibling.nextElementSibling.firstChild.innerText.length > 1) {
        //       selectedSpanElement = this.currentTarget.nextElementSibling.nextElementSibling.firstChild
        //     } else selectedSpanElement = this.currentTarget.nextElementSibling.nextElementSibling.nextElementSibling.firstChild
        //   } else {
        //     if (this.currentTarget.nextElementSibling && this.currentTarget.nextElementSibling.firstChild.innerText.length > 1) {
        //       // select other green and come back
        //       selectedSpanElement = this.currentTarget.nextElementSibling.firstChild
        //     } else selectedSpanElement = this.currentTarget.nextElementSibling.childNodes[2]
        //   }
        //
        //   insertedIndex = parseInt(selectedSpanElement.dataset.index)
        //   targetSibling = document.querySelector(
        //       `[data-index="${insertedIndex}"]`
        //   );
        //   this.$store.commit("update_current_target_block", targetSibling);
        // }
        this.$store.commit("update_current_target_block", targetSibling);
        this.$store.commit("update_current_index", targetSibling.dataset.index);
        // console.log('start', targetSibling, insertedIndex)

        // const speaking_area = document.getElementById("speaking_area");
        // speaking_area.style.display = "contents";
        // const cursorElement = document.getElementById("my_cursor");

        // if (targetSibling) targetSibling.parentNode.insertBefore(cursorElement, targetSibling);

        // cursorElement.parentNode.insertBefore(
        //     speaking_area,
        //     cursorElement.nextElementSibling
        // );
        this.lastTapTime = new Date().getTime()


        timer = setTimeout(() => {
          const canVibrate = window.navigator.vibrate
          if (canVibrate) window.navigator.vibrate(100)
        }, 480)

        this.allCurrentTargets.forEach(target => this.allCurrentTargetText += target.innerText.trim() + ' ')
        await this.storeDataLog({
          type: 'touch_green_block',
          chunksLength: this.allCurrentTargets.length,
          followingElementIndex: targetSibling.dataset.index,
          followingElementText: targetSibling.innerText,
          content: this.allCurrentTargetText,
        })
      }
    },
    handleTouchMove(e) {
      if (!this.startX) return;

      const xUp = e.touches[0].clientX;
      this.xDiff = this.startX - xUp;
      this.screenX = e.touches[0].screenX;

      this.allCurrentTargets.forEach(target => {
        target.style.right = `${this.xDiff}px`;
        if (this.xDiff > 0) {
          target.style.backgroundColor = `rgb(${197 + this.xDiff}, ${
              225 - this.xDiff
          }, ${165 - this.xDiff})`;
        }
      })
    },
    async handleTouchEnd() {
      const now = new Date().getTime();
      const timeSince = now - this.lastTapTime;

      if (this.xDiff > 100 || this.screenX < 10) {
        // this.currentTarget.parentNode.removeChild(this.currentTarget);
        // const removed_list = this.currentTarget.innerText
        //     .split(/(.*?[.,;?])/g)
        //     .filter((i) => i && i.trim());

        let temp_semanticList = this.semanticList;
        const cursorElement = document.getElementById("my_cursor");
        const speaking_area = document.getElementById('speaking_area')
        speaking_area.style.display = 'none'
        const targetSibling = document.querySelector(
            `[data-index="${parseInt(this.allCurrentTargets[this.allCurrentTargets.length - 1].dataset.index) + 1}"]`
        );

        targetSibling.parentNode.insertBefore(
            cursorElement,
            targetSibling
        );

        cursorElement.parentNode.insertBefore(
            speaking_area,
            cursorElement.nextElementSibling
        );

        this.allCurrentTargets.forEach(target => {
          temp_semanticList = temp_semanticList.filter((ele) => {
            // console.log(ele.text, target.innerText.trim(), ele.text.trim() === target.innerText.trim())
            return ele.text.trim() !== target.innerText.trim()
          })
          if (target.previousElementSibling && target.previousElementSibling.tagName === 'HR') {
            const speaking_area = document.getElementById('speaking_area_lower')
            const inserted_target = document.getElementById('last-element')
            speaking_area.style.display = 'none'
            inserted_target.parentNode.insertBefore(
                speaking_area,
                inserted_target
            );
          }
          target.parentNode.parentNode.removeChild(target.parentNode)
        })
        const insertedIndex = parseInt(this.allCurrentTargets[this.allCurrentTargets.length - 1].dataset.index) - this.allCurrentTargets.length + 1

        await this.storeDataLog({
          type: 'remove_text',
          content: this.allCurrentTargetText,
          chunksLength: this.allCurrentTargets.length,
          nextInsertedIndex: insertedIndex,
          followingElementText: targetSibling.innerText,
          currentContent: temp_semanticList
        })

        await this.$store.commit("update_current_index", insertedIndex);
        this.$store.commit("update_current_target_block", targetSibling);
        await this.$store.commit("set_semanticList", temp_semanticList);
        this.$store.commit("clear_element");
      } else if (timeSince > 500) {
        this.allCurrentTargets.forEach(target => {
          target.style.backgroundColor = '#e0e0e0'
          target.style.padding = '5px'
          target.style.margin = '0 5px'
          target.style.right = 0;
          target.setAttribute('id', this.uuidv4())

          target.removeEventListener(
              "touchstart",
              this.handleTouchStart,
              {passive: true}
          );
          target.removeEventListener(
              "touchmove",
              this.handleTouchMove,
              {passive: true}
          );
          target.removeEventListener(
              "touchend",
              this.handleTouchEnd,
              {passive: true}
          );
        })

        // const insertedList = this.currentTarget.innerText
        //     .split(/(.*?[.,;?])/g)
        //     .filter((i) => i && i.trim())
        //     .map((val) => {
        //       return {
        //         key: this.uuidv4(),
        //         text: val,
        //         id: this.uuidv4(),
        //         fadeIn: true,
        //       };
        //     });

        // let insertedIndex = parseInt(this.$store.state.current_block_index)
        // let semantic_block = this.semanticList.slice(0);
        // if (!this.currentTarget.nextElementSibling ||
        //     (this.currentTarget.nextElementSibling.tagName === 'DIV' &&
        //         this.currentTarget.nextElementSibling.nextElementSibling &&
        //         this.currentTarget.nextElementSibling.nextElementSibling.tagName === 'DIV' &&
        //         !this.currentTarget.nextElementSibling.nextElementSibling.nextElementSibling
        //     )) {
        //   // is the last element
        //   if (!this.currentTarget.previousElementSibling) {
        //     // select all
        //     semantic_block.push(...insertedList)
        //   } else {
        //     insertedIndex = insertedIndex + 1
        //     semantic_block.splice(parseInt(insertedIndex), 0, ...insertedList);
        //   }
        // } else {
        //   semantic_block.splice(parseInt(insertedIndex), 0, ...insertedList);
        // }
        //
        // this.currentTarget.parentNode.removeChild(this.currentTarget);

        const insertedIndex = this.allCurrentTargets[this.allCurrentTargets.length - 1].dataset.index
        await this.$store.commit("update_current_index", parseInt(insertedIndex) + 1);
        await this.storeDataLog({
          type: 'remain_text',
          content: this.allCurrentTargetText,
          chunksLength: this.allCurrentTargets.length,
          nextInsertedIndex: insertedIndex,
        })
        // await this.$store.commit("set_semanticList", semantic_block);
        // console.log('insert: ', insertedIndex, this.semanticList)
        await this.$store.commit("clear_element");
      } else {
        this.allCurrentTargets.forEach(target => {
          target.style.right = 0;
          target.style.backgroundColor = "rgb(197, 225, 165)";
        })
      }

      this.startX = null;
      this.xDiff = 0;
      this.screenX = 9999;
      this.currentTarget = null;
      if (timer) clearTimeout(timer)
    },
    // async deleteText() {
    //   let temp_semanticList = this.semanticList;
    //   this.selectedElements.forEach(target => {
    //     console.log('tar', target)
    //     temp_semanticList = temp_semanticList.filter((ele) => {
    //       return ele.text.trim() !== target.innerText.trim()
    //     })
    //     if (target.previousElementSibling && target.previousElementSibling.tagName === 'HR') {
    //       const speaking_area = document.getElementById('speaking_area_lower')
    //       const inserted_target = document.getElementById('last-element')
    //       speaking_area.style.display = 'none'
    //       inserted_target.parentNode.insertBefore(
    //           speaking_area,
    //           inserted_target
    //       );
    //     }
    //     target.parentNode.parentNode.removeChild(target.parentNode)
    //   })
    //
    //   // await this.storeDataLog({
    //   //   type: 'remove_text',
    //   //   content: this.currentTarget.innerText,
    //   //   currentContent: temp_semanticList
    //   // })
    //
    //   const insertedIndex = parseInt(this.selectedElements[this.selectedElements.length - 1].dataset.index) - this.selectedElements.length + 1
    //   await this.$store.commit("update_current_index", insertedIndex);
    //   const targetSibling = document.querySelector(
    //       `[data-index="${parseInt(this.selectedElements[this.selectedElements.length - 1].dataset.index) + 1}"]`
    //   );
    //   this.$store.commit("update_current_target_block", targetSibling);
    //   const cursorElement = document.getElementById("my_cursor");
    //   targetSibling.parentNode.insertBefore(
    //       cursorElement,
    //       targetSibling
    //   );
    //   await this.$store.commit("set_semanticList", temp_semanticList);
    //   this.$store.commit("clear_element");
    // },
    async turnOnMic() {
      this.isStreaming = true;
      this.messages = [];
      this.formattedMessages = [];
      this.voice2text = null;
      this.$store.commit("clear_element");
      if (this.baseMode) this.$refs.input.focus()

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
          content: finalResults,
          mode: this.selectedElements.length > 0 ? 'respeak' : 'insert'
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
      this.isTranscribing = true
      if (this.baseMode) {
        this.interimResult = data.results[0].alternatives[0].transcript;
        this.isTransFinal = data.results[0].isFinal;

        // const textarea = this.$refs['input'].$el.querySelector('input:not([type=hidden]),textarea:not([type=hidden])')
        const textarea = document.getElementById('base-textarea')
        const selStart = textarea.selectionStart
        const selEnd = textarea.selectionEnd

        if (window.getSelection && selStart !== selEnd) {
          //user's selection
          this.prevText = this.baseText.substring(selEnd)
          this.selectionEnd = selEnd
          this.currentHighlightedText = this.baseText.substring(selStart, selEnd)
          // console.log('sel: ', this.currentHighlightedText, '\n\n', this.prevText)
          // this.baseText =
          //     this.baseText.substring(0, selEnd) + this.prevText
        }

        this.baseText =
            this.baseText.substring(0, this.selectionEnd) + ' ' + this.interimResult + ' '
            + this.prevText

        this.clonedBaseText = this.baseText.replace(this.currentHighlightedText, `<mark>${this.currentHighlightedText}</mark>`)

        if (this.isTransFinal) {
          this.isTranscribing = false
          this.selectionEnd += (this.interimResult.length + 1)
          await this.storeDataLog({
            type: `final_transcript`,
            content: this.interimResult
          })
          const diffWord = diffWords(this.previousBaseText, this.baseText)
          const id = this.uuidv4()
          diffWord.forEach(part => {
            // console.log('speech diff: ', part.added ? 'added' : part.removed ? 'removed' : 'no change', part.value)
            this.storeDataLog({
              type: 'speechInputDiff',
              index: id,
              mode: part.added ? 'added' : part.removed ? 'removed' : 'no change',
              text: part.value
            })
          })
          this.previousBaseText = this.baseText
          textarea.setSelectionRange(this.selectionEnd, this.selectionEnd)
        }
        else textarea.setSelectionRange(this.selectionEnd + this.interimResult.length, this.selectionEnd + this.interimResult.length)
        // this.$nextTick(() => textarea.setSelectionRange(this.selectionEnd + this.interimResult.length, this.selectionEnd + this.interimResult.length))
        this.interimResult = ""
      } else {
        this.formattedMessages = this.formattedMessages.concat(data);
        this.messages = this.getFinalAndLatestInterimResult();
        this.voice2text = this.messages
            .map((msg) =>
                msg.results.map((result) => result.alternatives[0].transcript)
            )
            .reduce((a, b) => a.concat(b), [])
      }
    });

    this.trialName = `trial-${this.uuidv4()}`
    const trialRef = ref(db, `${this.baseMode ? 'base-' : (this.postAnalMode ? 'post-' : '')}trials/` + this.trialName)
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
    if (this.baseMode) this.$refs.input.focus()

    window.onerror = async function (msg, url, line, col, error) {
      await push(ref(db, `${this.baseMode ? 'base-' : (this.postAnalMode ? 'post-' : '')}trials/${this.trialName}/errorLogs`), {
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

#base-textarea {
  height: 65vh;
  //margin-bottom: 15rem;
  background-color: transparent;
  display: block;
  position: absolute;
  z-index: 2;
  margin: 0;
  border-radius: 0;
  color: #444;
  overflow: auto;
  resize: none;
  transition: transform 1s;
}

#post-anal-textarea {
  height: 65vh
}

.backdrop {
  position: absolute;
  line-height: 1.8;
  background-color: #fff;
  overflow: auto;
  pointer-events: none;
  transition: transform 1s;
}

.highlights {

  white-space: pre-wrap;
  word-wrap: break-word;
  color: transparent;
}

.container, .backdrop, #base-textarea {
  width: 360px;
}

.highlights, #base-textarea {
  padding: 10px;
  font: 16px 'Open Sans', sans-serif;
  letter-spacing: 0;
  text-align: justify;
}

.container {
  display: block;
  margin: 0 auto;
}

mark {
  border-radius: 3px;
  color: transparent;
  background-color: #d4e9ab;
  //transition: visibility 0s 2s, opacity 2s linear;
}
</style>
