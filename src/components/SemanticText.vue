<template>
    <div>
        <SemanticBlock
            v-for="(block_i, i) in semantic_block"
            :key="i"
            :semantic_block="block_i"
            :semantic_id="i"
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

    mounted() {
        this.semantic_block = [
            'Once upon a time, there was a king; who used to wear a single horned crown.',
            'He had a lavish palace, three beautiful wives, and seven children; all well qualified in their respective fields.',
            'The king was reaching the retirement age, so he asked his elder son to lead his empire so that he could undergo seclusion.',
            'Now, his Elder Son, Jonathan had set other plans for himself.',
            'So he turned down his father’s offer.',
            'Jonathan was a nature lover; and he wished to live in a thatched house within the deepest parts of the jungle.',
            'The king was disheartened; but he accepted Jonathan’s plea.',
            'He asked Jonathan’s immediate junior brother Sharlie to handle the loads of the throne.',
            'Sharlie accepted; but on a clause – whenever Jonathan would change his mind, Sharlie would return his throne to him.'
        ]
    },
}
</script>