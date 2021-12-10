<template>
    <v-touch tag="span"
             v-on:doubletap="doubleTapText"
             :id="this.id"
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
            event.target.style.backgroundColor = "yellow"
            this.$store.commit('select_text')  // selected = true
            this.$store.commit('add_element', event.target)
        },
        // singleTapText: function () {
        //     console.log("you've tapped!")
        // },
    },

    // mounted() {
    //     const vt = this.$refs.hammer // assuming <v-touch ref="hammer">
    //     vt.recognizers['doubletap'].recognizeWith('singletap')
    //     vt.recognizers['singletap'].requireFailure('doubletap')
    //     vt.recognizers['doubletap'].dropRequiredFailure('singletap')
    // }
}
</script>