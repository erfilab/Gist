<template>
    <span>
        <v-touch tag="span"
                 ref="hammer"
                 v-on:doubletap="doubleTapText"
                 v-on:singletap="singleTapText"
                 v-touch="{
                    start: (e) => startDrag(e),
                    end: (e) => endDrag(e),
                    move: (e) => draggingHandler(e),
                    // down: (e) => swipeEvent(e)
                   }"
                 :id="this.id"
                 :data-index="this.semantic_index"
                 style="background-color: #E0E0E0; font-size: large"
        >
            {{ this.block }}
        </v-touch>
        <span>&nbsp;</span>
    </span>
</template>

<script>
import store from '../store/';

let myTimeInterval;

export default {
    store,
    name: "SemanticBlock",
    props: ['semantic_block', 'semantic_id', 'semantic_index'],

    data() {
        return {
            block: this.semantic_block,    // 把传过来的值赋值给新的变量
            id: this.semantic_id,
            index: this.semantic_index,
            // drag event
            dragging: false,
            currentTapEvent: null,
            currentTapTarget: null,
            currentTimeAfterTap: 0,
            previousTouchMoveY: 0,
        }
    },

    methods: {
        set_cursor_location(event) {
            this.$store.commit('set_cursor_ele_loc', event.target.nextElementSibling);
            this.$store.commit('update_current_index', event.target.dataset.index);

            const cursor_ele = document.getElementById("my_cursor");
            // cursor_ele.parentNode.removeChild(cursor_ele);
            event.target.parentNode.insertBefore(cursor_ele, event.target.nextElementSibling.nextElementSibling);
        },

        doubleTapText: function (event) {
            event.target.style.backgroundColor = "yellow";
            this.$store.commit('select_text');  // selected = true
            this.$store.commit('add_element', event.target);
            // this.set_cursor_location(event);
        },

        // move the cursor
        singleTapText: function (event) {
            this.set_cursor_location(event);

            this.currentTimeAfterTap = 0
            if (myTimeInterval)
                clearInterval(myTimeInterval)
            myTimeInterval = setInterval(this.timer, 500)
            this.currentTapEvent = event;
        },

        timer() {
            this.currentTimeAfterTap += 1
        },
        // swipeEvent(event) {
        //   if (this.currentTapTarget && this.currentTimeAfterTap <= 2) {
        //     this.currentTapTarget.style.backgroundColor = "yellow";
        //     this.$store.commit('select_text');  // selected = true
        //     this.$store.commit('add_element', this.currentTapTarget);
        //     console.log('Down: ', event, '\nTarget', this.currentTapTarget)
        //   }
        // },
        startDrag(e) {
            if (this.currentTapEvent && this.currentTimeAfterTap <= 2) {
                this.dragging = true
                this.currentTapEvent.target.style.backgroundColor = "yellow"
                this.$store.commit('select_text')
                this.$store.commit('add_element', this.currentTapEvent.target)
                this.currentTapEvent = e
                // this.currentTapTarget = e.target.nextSibling
                this.currentTapTarget = e.target.parentNode.nextElementSibling.firstChild
                clearInterval(myTimeInterval)
            }
        },
        draggingHandler(e) {
            if (this.currentTapTarget &&
                this.dragging &&
                (e.touchmoveY - this.currentTapEvent.touchmoveY) > 25
            ) {
                // console.log('Drag Down', e.touchmoveY - this.previousTouchMoveY)
                this.currentTapTarget.style.backgroundColor = "yellow";
                this.$store.commit('select_text');
                this.$store.commit('add_element', this.currentTapTarget);
                this.currentTapTarget = this.currentTapTarget.parentNode.nextElementSibling.firstChild
                this.currentTapEvent = e
            }
            else if (this.currentTapTarget &&
                this.dragging &&
                (e.touchmoveY - this.currentTapEvent.touchmoveY) < -20 &&
                this.$store.state.selected_elements.length > 0
            ) {
                // console.log('Drag Up', e.touchmoveY - this.currentTapEvent.touchmoveY)
                this.currentTapTarget = this.currentTapTarget.parentNode.previousElementSibling.firstChild
                this.currentTapTarget.style.backgroundColor = "#E0E0E0";
                // this.$store.commit('deselect_text');
                this.$store.commit('remove_element');
                this.currentTapEvent = e
            }
            this.previousTouchMoveY = e.touchmoveY
        },
        endDrag() {
            if (this.dragging) {
                // console.log('End', this.currentTapTarget.innerHTML)
                // const lastDraggedEle = this.currentTapTarget.parentNode.previousElementSibling.firstChild;
                // this.$store.commit('set_cursor_ele_loc', lastDraggedEle)
                // const cursor_ele = document.getElementById("my_cursor");
                // lastDraggedEle.parentNode.insertBefore(cursor_ele, lastDraggedEle.nextElementSibling.nextElementSibling);

                this.dragging = false
                this.currentTapEvent = null
                this.currentTimeAfterTap = 0
            }
        },
    },

    mounted() {
        const ele = document.getElementById(this.id)
        this.$store.commit('set_cursor_ele_loc', ele.nextElementSibling)
    }

    // mounted() {
    //     const vt = this.$refs.hammer // assuming <v-touch ref="hammer">
    //     vt.recognizers['doubletap'].recognizeWith('singletap')
    //     vt.recognizers['singletap'].requireFailure('doubletap')
    //     vt.recognizers['doubletap'].dropRequiredFailure('singletap')
    // }
}
</script>
