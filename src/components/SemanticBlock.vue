<template>
  <span>
    <v-touch
      tag="span"
      ref="hammer"
      v-on:singletap="singleTapText"
      v-touch="{
        start: (e) => startDrag(e),
        end: (e) => endDrag(e),
        move: (e) => startDraggingHandler(e),
        // down: (e) => swipeEvent(e)
      }"
      :id="this.id"
      :data-index="this.semantic_index"
      style="background-color: #e0e0e0; padding: 5px"
    >
      {{ this.block }}
    </v-touch>
    <span>&nbsp;</span>
  </span>
</template>

<script>
import store from "../store/";
import { mapGetters } from "vuex";

let myTimeInterval;

export default {
  store,
  name: "SemanticBlock",
  props: ["semantic_block", "semantic_id", "semantic_index"],

  data() {
    return {
      block: this.semantic_block, // 把传过来的值赋值给新的变量
      id: this.semantic_id,
      index: this.semantic_index,
      // drag event
      startDragging: false,
      isDragging: false,
      currentTapEvent: null,
      currentTapTarget: null,
      currentTimeAfterTap: 0,
      previousTouchMoveY: 0,
    };
  },
  computed: {
    ...mapGetters(["selectedNo", "semanticList"]),
  },

  methods: {
    set_cursor_location(target) {
      this.$store.commit("set_cursor_ele_loc", target.nextElementSibling);
      this.$store.commit("update_current_index", target.dataset.index);

      const cursor_ele = document.getElementById("my_cursor");
      // cursor_ele.parentNode.removeChild(cursor_ele);
      target.parentNode.insertBefore(
        cursor_ele,
        target.nextElementSibling.nextElementSibling
      );
    },

    // move the cursor
    singleTapText(event) {
      this.$store.commit("clear_element");
      
      // TODO what if tap to the same place
      this.$store.commit("change_location_speaking");
      this.set_cursor_location(event.target);

      this.currentTimeAfterTap = 0;
      if (myTimeInterval) clearInterval(myTimeInterval);
      myTimeInterval = setInterval(this.timer, 400);

      this.currentTapEvent = event;
      const speaking_area = document.getElementById("speaking_area");
      speaking_area.style.display = "content";
      const cursorElement = this.$store.state.cursor_ele_loc;
      cursorElement.parentNode.insertBefore(
        speaking_area,
        cursorElement.nextElementSibling
      );
    },

    timer() {
      this.currentTimeAfterTap += 1;
    },
    startDrag(e) {
      if (this.currentTapEvent) {
        this.$store.commit("clear_element");
        this.startDragging = true;
        this.currentTapEvent.target.style.backgroundColor = "yellow";
        this.$store.commit("add_element", this.currentTapEvent.target);
        this.currentTapEvent = e;

        if (e.target.parentNode.nextElementSibling) {
          this.currentTapTarget =
            e.target.parentNode.nextElementSibling.firstChild;
        }
        clearInterval(myTimeInterval);
      }
    },
    startDraggingHandler(e) {
      if (
        this.currentTapTarget &&
        this.startDragging &&
        e.touchmoveY - this.currentTapEvent.touchmoveY > 25
      ) {
        this.isDragging = true;
        if (
          this.currentTapTarget.innerText.length &&
          (!this.$store.state.selected_elements.length ||
            this.currentTapTarget.innerText !==
              this.$store.state.selected_elements.slice(-1)[0].innerText)
        ) {
          this.currentTapTarget.style.backgroundColor = "yellow";
          this.$store.commit("add_element", this.currentTapTarget);
        }

        if (this.currentTapTarget.parentNode.nextElementSibling) {
          this.currentTapTarget =
            this.currentTapTarget.parentNode.nextElementSibling.firstChild;
        }
        this.currentTapEvent = e;
        // this.currentTapTarget = this.currentTapTarget.parentNode.nextElementSibling.firstChild
      } else if (
        this.currentTapTarget &&
        this.startDragging &&
        e.touchmoveY - this.currentTapEvent.touchmoveY < -20 &&
        this.$store.state.selected_elements.length > 0
      ) {
        this.currentTapTarget =
          this.currentTapTarget.parentNode.previousElementSibling.firstChild;
        this.currentTapTarget.style.backgroundColor = "#E0E0E0";
        this.$store.commit("remove_element");
        this.currentTapEvent = e;
      }
      this.previousTouchMoveY = e.touchmoveY;
    },
    endDrag(event) {
      if (this.startDragging) {
        this.set_cursor_location(
          this.currentTapTarget.parentNode.nextElementSibling
            ? this.currentTapTarget.parentNode.previousElementSibling.firstChild
            : this.currentTapTarget
        );

        // TODO set the timer of doble tap
        if (!this.isDragging) {
          this.$store.commit("clear_element");
          event.target.style.backgroundColor = "yellow";
          this.$store.commit("add_selectedNo", 1);
          this.$store.commit("add_element", event.target);

          // this.set_cursor_location(event);
          this.currentTimeAfterTap = 0;
          this.currentTapEvent = event;
        }
        this.$store.commit("add_selectedNo", 1);
        this.startDragging = false;
        this.currentTapEvent = null;
        this.currentTimeAfterTap = 0;
        this.currentTapTarget = null;
      }
    },
  },

  mounted() {
    const ele = document.getElementById(this.id);
    this.$store.commit("set_cursor_ele_loc", ele.nextElementSibling);
  },

  // mounted() {
  //     const vt = this.$refs.hammer // assuming <v-touch ref="hammer">
  //     vt.recognizers['doubletap'].recognizeWith('singletap')
  //     vt.recognizers['singletap'].requireFailure('doubletap')
  //     vt.recognizers['doubletap'].dropRequiredFailure('singletap')
  // }
};
</script>
