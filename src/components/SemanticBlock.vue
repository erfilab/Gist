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

export default {
  store,
  name: "SemanticBlock",
  props: ["semantic_block", "semantic_id", "semantic_index"],

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
    ...mapGetters(["selectedNo", "semanticList"]),
  },

  methods: {
    set_cursor_location(target, isMultiSelection) {
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
        this.$store.commit("update_current_index", target.dataset.index);
        let targetSibling = document.querySelector(
          `[data-index="${parseInt(target.dataset.index) + 1}"]`
        );

        this.$store.commit("update_current_target_block", targetSibling);

        const cursor_ele = document.getElementById("my_cursor");
        sel.focusNode.parentNode.insertBefore(
          cursor_ele,
          sel.focusNode.nextElementSibling
        );
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

    singleTapText(e) {
      this.$store.commit("clear_element");
      this.$store.commit("change_location_speaking");
      this.set_cursor_location(e.target, false);
      const speaking_area = document.getElementById("speaking_area");
      speaking_area.style.display = "contents";
      const cursorElement = document.getElementById("my_cursor");
      cursorElement.parentNode.insertBefore(
        speaking_area,
        cursorElement.nextElementSibling
      );

      this.currentTapTarget = e.target;
      console.log("single tap", this.currentTapTarget);

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
    handleTouchMove(e) {
      if (!this.startY) return;

      const yUp = e.touches[0].clientY;
      if (Math.abs(this.startY - yUp - this.yDiff) > 25) {
        if (this.startY - yUp > this.yDiff) {
          this.currentTapTarget =
            this.currentTapTarget.parentNode.previousElementSibling.firstChild;
          this.currentTapTarget.style.backgroundColor = "#E0E0E0";
          this.$store.commit("remove_element");
        } else {
          if (this.currentTapTarget && this.currentTapTarget.tagName === "SPAN" && this.currentTapTarget.style.display !== "none") {
            if (
              this.currentTapTarget.innerText.length &&
              (!this.$store.state.selected_elements.length ||
                this.currentTapTarget.innerText !==
                  this.$store.state.selected_elements.slice(-1)[0].innerText)
            ) {
              this.currentTapTarget.style.backgroundColor = "yellow";
              this.$store.commit("add_element", this.currentTapTarget);
            }

            if (this.currentTapTarget.parentNode.nextElementSibling && this.currentTapTarget.parentNode.nextElementSibling.innerText.length) {
              this.currentTapTarget = this.currentTapTarget.parentNode.nextElementSibling.firstChild;
            }
          } else {
            this.currentTapTarget = this.currentTapTarget.nextElementSibling? 
            this.currentTapTarget.nextElementSibling : this.currentTapTarget;
          }
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
        parseInt(this.currentTapTarget.dataset.index) - 1
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