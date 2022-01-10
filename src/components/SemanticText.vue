<template>
    <div style="display: inline">
        <SemanticBlock
            v-for="(block_i) in semantic_block"
            :key="block_i.key"
            :semantic_block="block_i.text"
            :semantic_id="block_i.id"
            :semantic_index="block_i.index"
        >
        </SemanticBlock>
    </div>
</template>

<script>
import SemanticBlock from "@/components/SemanticBlock";
import store from '../store/';

export default {
    store,
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

    computed: {
        new_content_val() {
            return this.$store.state.new_semantic_content
        }
    },

    watch: {
        new_content_val() {
            const newContent = this.$store.state.new_semantic_content;
            let currentIndex = this.$store.state.current_block_index;
            const list = newContent.split(/(.*?[.,;?])/g).filter(i => i && i.trim())

            let newList = [];
            let i = 0;
            while (i <= currentIndex) {
                newList.push(this.semantic_block[i])
                i++;
            }

            list.forEach(value => {
                newList.push({
                    text: value,
                    id: this.uuid(),
                    index: i,
                    key: this.uuid()
                })
                i++;
            })

            while (i < list.length + this.semantic_block.length) {
                newList.push({
                    text: this.semantic_block[i - list.length].text,
                    id: this.semantic_block[i - list.length].id,
                    index: i,
                    key: this.uuid()
                })
              i++;
            }
            this.semantic_block = newList;
            // console.log(this.semantic_block)
        }
    },

    mounted() {
        // this.semantic_block = this.text.split(/(?=[.,;])/g)
        const semantic_list = this.text.split(/(.*?[.,;?])/g).filter(i => i && i.trim())

        let index = 0
        semantic_list.forEach(element => {
            this.semantic_block.push({
                text: element,
                id: this.uuid(),
                index: index,
                key: this.uuid()
            })
            index++
        });
    },
}
</script>

