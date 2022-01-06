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
                 style="background-color: #E0E0E0"
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
    props: ['semantic_block', 'semantic_id'],

    data() {
        return {
            block: this.semantic_block,    // 把传过来的值赋值给新的变量
            id: this.semantic_id,

            // drag event
            dragging: false,
            currentTapEvent: null,
            currentTapTarget: null,
            currentTimeAfterTap: 0,
            previousTouchMoveY: 0,
        }
    },

    methods: {
        doubleTapText: function (event) {
            event.target.style.backgroundColor = "yellow";
            this.$store.commit('select_text');  // selected = true
            this.$store.commit('add_element', event.target);
        },

        // move the cursor
        singleTapText: function (event) {
            // this.$store.commit('set_cursor_ele_loc',
            //     event.target.nextElementSibling ? event.target.nextElementSibling : event.target)
            this.$store.commit('set_cursor_ele_loc', event.target.nextElementSibling);

            const cursor_ele = document.getElementById("my_cursor");
            // cursor_ele.parentNode.removeChild(cursor_ele);
            event.target.parentNode.insertBefore(cursor_ele, event.target.nextElementSibling.nextElementSibling);

            this.currentTimeAfterTap = 0
            if (myTimeInterval) clearInterval(myTimeInterval)
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
                this.currentTapTarget = e.target.nextSibling
                clearInterval(myTimeInterval)
            }
        },
        draggingHandler(e) {
            if (this.currentTapTarget && this.dragging && (e.touchmoveY - this.currentTapEvent.touchmoveY) > 25) {
                console.log('Drag Down', e.touchmoveY - this.previousTouchMoveY)
                this.currentTapTarget = this.currentTapTarget.nextSibling
                this.currentTapTarget.style.backgroundColor = "yellow";
                this.$store.commit('select_text');
                this.$store.commit('add_element', this.currentTapTarget);

                this.currentTapEvent = e
            } else if (this.currentTapTarget && this.dragging && (e.touchmoveY - this.currentTapEvent.touchmoveY) < -20) {
                console.log('Drag Up', e.touchmoveY - this.currentTapEvent.touchmoveY)
                this.currentTapTarget.style.backgroundColor = "#E0E0E0";
                this.$store.commit('deselect_text');
                this.$store.commit('remove_element');
                this.currentTapTarget = this.currentTapTarget.previousSibling

                this.currentTapEvent = e
            }
            this.previousTouchMoveY = e.touchmoveY
        },
        endDrag(e) {
            if (this.dragging) {
                console.log('End', e.target.innerHTML)
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
