<template>
    <v-touch tag="span"
             v-on:doubletap="doubleTapText"
             v-on:singletap="singleTapText"
             :id="this.id"
             style="background-color: #E0E0E0"
    >
        {{ this.block }}
    </v-touch>
</template>

<script>
export default {
    name: "SemanticBlock",
    props: ['semantic_block', 'semantic_id'],

    data() {
        return {
            block: this.semantic_block,    // 把传过来的值赋值给新的变量
            id: this.semantic_id
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
            const cursor_ele = document.getElementById("my_cursor");
            cursor_ele.parentNode.removeChild(cursor_ele);
            event.target.parentNode.insertBefore(cursor_ele, event.target.nextElementSibling);
        },
    },

    // mounted() {
    //     const vt = this.$refs.hammer // assuming <v-touch ref="hammer">
    //     vt.recognizers['doubletap'].recognizeWith('singletap')
    //     vt.recognizers['singletap'].requireFailure('doubletap')
    //     vt.recognizers['doubletap'].dropRequiredFailure('singletap')
    // }
}
</script>