<template>
  <div style="display: inline; line-height: 2em">
    <SemanticBlock
      v-for="(block_i, index) in semanticList"
      :key="block_i.key"
      :semantic_block="block_i.text"
      :semantic_id="block_i.id"
      :semantic_index="index"
      :class="block_i.fadeIn? 'fadingEffect': ''"
    >
    </SemanticBlock>
  </div>
</template>

<script>
import SemanticBlock from "@/components/SemanticBlock";
import store from "../store/";
import { mapGetters } from "vuex";

export default {
  store,
  name: "SemanticText",

  components: {
    SemanticBlock,
  },
  props: ["semantic_text"],

  data() {
    return {
      text: this.semantic_text,
    };
  },

  methods: {
    uuid() {
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
          var r = (Math.random() * 16) | 0,
            v = c === "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        }
      );
    },
  },

  computed: {
    ...mapGetters(["current_target_block", "newSemanticContent", "semanticList", "previous_length"]),
  },

  watch: {
    async newSemanticContent() {
      if (this.newSemanticContent && this.newSemanticContent.length) {
        const currentIndex = this.$store.state.current_block_index;
        // console.log("New content: ", this.newSemanticContent, currentIndex);

        const insertedList = this.newSemanticContent
          .join(" ")
          .split(/(.*?[.,;?])/g)
          .filter((i) => i && i.trim())
          .map((val) => {
            return {
              key: this.uuid(),
              text: val,
              id: this.uuid(),
              fadeIn: false,
            };
          });

        let semantic_block = this.semanticList;
        semantic_block.splice(
            parseInt(currentIndex) + 1,
            this.previous_length,
            ...insertedList
          );
        this.$store.commit("set_semanticList", semantic_block);
        this.$store.commit("set_previous_length", insertedList.length);
        const speaking_area = document.getElementById('speaking_area_lower')
        speaking_area.style.display = 'block'

        const cursor_ele = document.getElementById("my_cursor");
        
        if (this.current_target_block && document.getElementById(this.current_target_block.id)) {
          this.current_target_block.parentNode.insertBefore(
            cursor_ele,
            this.current_target_block
          );

          this.current_target_block.parentNode.insertBefore(
            speaking_area,
            this.current_target_block
          );
        }
        else {
          const inserted_target = document.getElementById('last-element')
          inserted_target.parentNode.insertBefore(
            cursor_ele,
            inserted_target
          );

          inserted_target.parentNode.insertBefore(
            speaking_area,
            inserted_target
          );
        }
      }
    },
  },

  mounted() {
    const semantic_list = this.text
      .split(/(.*?[.,;?])/g)
      .filter((i) => i && i.trim());

    this.$store.commit(
      "set_semanticList",
      semantic_list.map((element) => {
        return {
          text: element,
          id: this.uuid(),
          key: this.uuid(),
          fadeIn: true,
        };
      })
    );
  },
};
</script>


<style>
.fadingEffect {
  opacity: 1;
  width: 100%;
  animation: fadeInOpacity .2s ease-in alternate 1;
}

@keyframes fadeInOpacity {
  0% {
    opacity: 0;
    width: 0%;
  }
  100% {
    opacity: 1;
    width: 100%;
  }
}
</style>
