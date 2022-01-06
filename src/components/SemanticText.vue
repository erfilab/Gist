<template>
    <div style="display: inline">
        <SemanticBlock
            v-for="(block_i, i) in semantic_block"
            :key="i"
            :semantic_block="block_i.text"
            :semantic_id="block_i.id"
        >
        </SemanticBlock>
    </div>
</template>

<script>
import SemanticBlock from "@/components/SemanticBlock";

export default {
    name: "SemanticText",

    components: {
        SemanticBlock
    },
    props: ['semantic_text'],

    data() {
        return {
            text: this.semantic_text,    // 把传过来的值赋值给新的变量
            semantic_block: []
        }
    },

    methods: {
        uuid: function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
    },

    mounted() {
        // this.semantic_block = this.text.split(/(?=[.,;])/g)
        var semantic_list = this.text.split(/(.*?[.,;?])/g).filter(i => i && i.trim())
        semantic_list.forEach(element => {
            this.semantic_block.push({
                text: element,
                id: this.uuid()
            })
        });
    },
}
</script>