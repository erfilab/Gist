<template>
  <span>
    <span
      @click.stop="singleTapText"
      v-touch="{
        //start: (e) => touchStart(e),
        //end: (e) => endDrag(e),
        //move: (e) => startDraggingHandler(e),
      }"
      :id="this.id"
      :data-index="this.semantic_index"
      style="background-color: #e0e0e0; padding: 5px"
    >
      {{ this.block }}
    </span>
    <span>&nbsp;</span>
  </span>
</template>

<script>
import store from "../store/";
import { mapGetters } from "vuex";
import {db} from '@/plugins/firebase.js';
import {push, ref} from "firebase/database";

export default {
  store,
  name: "SemanticBlock",
  props: ["semantic_block", "semantic_id", "semantic_index", 'trialName'],

  data() {
    return {
      block: this.semantic_block,
      id: this.semantic_id,
      index: this.semantic_index,
      yDiff: 0,
      startY: 0,

      clickTimer: null,
      clicks: 0,
    };
  },
  computed: {
    ...mapGetters(["selectedNo", "semanticList", "selectedElements"]),
  },

  methods: {
    async storeDataLog(payload) {
      await push(ref(db, `trials/${this.trialName}/systemLogs`), {
        timestamp: new Date().getTime(),
        ...payload,
      }).catch(console.error)
    },
    async set_cursor_location(target, isMultiSelection) {
      if (isMultiSelection) {
        const cursor_ele = document.getElementById("my_cursor");
        target.parentNode.insertBefore(cursor_ele, target);
      } else {
        const range = document.createRange();
        range.selectNodeContents(target);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);

        this.$store.commit("update_current_index", parseInt(target.dataset.index) + 1);
        let targetSibling = document.querySelector(
          `[data-index="${parseInt(target.dataset.index) + 1}"]`
        );

        this.$store.commit("update_current_target_block", targetSibling);
        // console.log('st', target.dataset.index, targetSibling)

        const cursor_ele = document.getElementById("my_cursor");
        sel.focusNode.parentNode.insertBefore(
          cursor_ele,
          sel.focusNode.nextElementSibling
        );
      }
      if (!isNaN((parseInt(target.dataset.index) + 1))) {
        await this.storeDataLog({
          type: `set_cursor_${isMultiSelection?'multi':'single'}`,
          targetId: target.id? target.id : (parseInt(target.dataset.index) + 1),
        })
      }
    },

    // double tap event listener
    // touchStart: function (e) {
    //   if (this.clickTimer === null) {
    //     this.clickTimer = setTimeout(function () {
    //       this.clickTimer = null;
    //       // console.log("single");
    //     }, 500)
    //   } else {
    //     clearTimeout(this.clickTimer);
    //     this.clickTimer = null;
    //     e.target.style.backgroundColor = "yellow";
    //     this.$store.commit('add_element', e.target);
    //     // this.set_cursor_location(e.target);
    //     // console.log("double");
    //   }
    // },

    async singleTapText(e) {
      this.$store.commit("clear_element");
      this.$store.commit("change_location_speaking");
      await this.set_cursor_location(e.target, false);
      const speaking_area = document.getElementById("speaking_area");
      speaking_area.style.display = "contents";
      const cursorElement = document.getElementById("my_cursor");
      cursorElement.parentNode.insertBefore(
        speaking_area,
        cursorElement.nextElementSibling
      );

      this.currentTapTarget = e.target;

      this.currentTapTarget.addEventListener(
        "touchstart",
        this.handleTouchStart,
        false
      );

      this.currentTapTarget.addEventListener(
        "touchmove",
        this.handleTouchMove,
        false
      );
      this.currentTapTarget.addEventListener(
        "touchend",
        this.handleTouchEnd,
        false
      );


      await this.storeDataLog({
        type: `single_tap`,
        targetId: this.currentTapTarget.dataset.index,
      })
      // this.clicks++;
      // if (this.clicks === 1) {
      //   this.clickTimer = setTimeout(() => {
      //     console.log("single");
      //     this.clicks = 0;
      //   }, 700);
      // } else {
      //   clearTimeout(this.clickTimer);
      //   this.clicks = 0;
      //   e.target.style.backgroundColor = "yellow";
      //   this.$store.commit("add_element", e.target);
      //   // this.set_cursor_location(e.target);
      //   console.log("double");
      //   this.handleTouchEnd();
      // }
    },
    getTouches(e) {
      return e.touches || e.originalEvent.touches;
    },
    handleTouchStart(e) {
      document.getElementById("app").style.overflow = "hidden";
      const firstTouch = this.getTouches(e)[0];
      this.startY = firstTouch.clientY;
    },
    async handleTouchMove(e) {
      if (!this.startY) return;

      const yUp = e.touches[0].clientY;
      if (Math.abs(this.startY - yUp - this.yDiff) > 25) {
        if (this.startY - yUp > this.yDiff) {
          if (!this.currentTapTarget.parentNode.nextElementSibling || this.currentTapTarget.parentNode.nextElementSibling.id) {
            this.currentTapTarget.style.backgroundColor = "#E0E0E0";
            this.$store.commit("remove_element");
          }
          this.currentTapTarget =
            this.currentTapTarget.parentNode.previousElementSibling.firstChild;
          this.currentTapTarget.style.backgroundColor = "#E0E0E0";
          this.$store.commit("remove_element");
          // await this.storeDataLog({
          //   type: `backward_selection`,
          //   content: this.currentTapTarget.innerText,
          // })
        } else {
          if (this.currentTapTarget && this.currentTapTarget.tagName === "SPAN" && this.currentTapTarget.style.display !== "none") {
            if (
              this.currentTapTarget.innerText.length &&
              (!this.selectedElements.length ||
                this.currentTapTarget.innerText !==
                  this.selectedElements.slice(-1)[0].innerText)
            ) {
              this.currentTapTarget.style.backgroundColor = "yellow";
              this.$store.commit("add_element", this.currentTapTarget);
            }

            if (this.currentTapTarget.parentNode.nextElementSibling && this.currentTapTarget.parentNode.nextElementSibling.innerText.length > 1 && !this.currentTapTarget.parentNode.nextElementSibling.id) {
              this.currentTapTarget = this.currentTapTarget.parentNode.nextElementSibling.firstChild;
            }
          } else {
            this.currentTapTarget = this.currentTapTarget.nextElementSibling?
            this.currentTapTarget.nextElementSibling : this.currentTapTarget;
          }
          // await this.storeDataLog({
          //   type: `frontward_selection`,
          //   content: this.currentTapTarget.innerText,
          // })
          // console.log("next", this.currentTapTarget.tagName, this.currentTapTarget.innerText);
        }

        this.yDiff = this.startY - yUp;
      }
    },
    handleTouchEnd() {
      document.getElementById("app").style.overflow = "auto";
      this.currentTapTarget.removeEventListener(
        "touchstart",
        this.handleTouchStart,
        true
      );

      this.currentTapTarget.removeEventListener(
        "touchmove",
        this.handleTouchMove,
        true
      );
      this.currentTapTarget.removeEventListener(
        "touchend",
        this.handleTouchEnd,
        true
      );
      this.$store.commit(
        "update_current_index",
        parseInt(this.currentTapTarget.dataset.index)
      );
      const targetSibling = document.querySelector(
        `[data-index="${parseInt(this.currentTapTarget.dataset.index)}"]`
      );
      this.$store.commit("update_current_target_block", targetSibling);

      this.set_cursor_location(this.currentTapTarget.parentNode, true);
      this.$store.commit("add_selectedNo", 1);

      this.startX = null;
      this.xDiff = 0;
      this.currentTapTarget = null;
    },
  },
};
</script>
