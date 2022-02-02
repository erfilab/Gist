<template>
  <swipe-list
    ref="list"
    class="card"
    :items="mockSwipeList"
    item-key="id"
    id="swipe_text"
  >
    <template v-slot="{ item }">
      <div class="card-content">
        <p style="margin-bottom: 0">{{ item }}</p>
      </div>
    </template>
    <template v-slot:right="{ item }">
      <div class="swipeout-action red" @click="remove(item)">
        <i class="fa fa-trash"></i>
      </div>
    </template>
  </swipe-list>
</template>

<script>
import { SwipeList } from "vue-swipe-actions";
import "vue-swipe-actions/dist/vue-swipe-actions.css";
import { mapGetters } from 'vuex';

export default {
  name: "SwipeText",

  components: {
    SwipeList,
  },

  data() {
    return {
      mockSwipeList: [], // the required is a list, we cannot change the type
    };
  },

  computed: {
    ...mapGetters(["selectedElements"]),
  },

  watch: {
    selectedElements() {
      if (this.selectedElements.length > 0) {
        this.mockSwipeList = [];
        let content = "";
        this.selectedElements.forEach((ele) => {
          content += ele.innerHTML;
        });
        this.mockSwipeList.push(content);
      }
    },
  },

  methods: {
    remove(item) {
      this.mockSwipeList = this.mockSwipeList.filter((i) => i !== item);
      if (this.$store.state.selected) {
        // move the cursor to the next sibling of the last element in the list
        const select_count = this.$store.state.selected_elements.length;
        const cursor_ele = document.getElementById("my_cursor");
        const lastEle = this.$store.state.selected_elements[select_count - 1];
        lastEle.parentNode.nextElementSibling.insertBefore(
          cursor_ele,
          lastEle.parentNode.nextElementSibling.firstChild.nextSibling
            .nextSibling
        );

        const parentNode =
          this.$store.state.selected_elements[0].parentNode.parentNode;
        this.$store.state.selected_elements.forEach((ele) => {
          parentNode.removeChild(ele.parentNode);
        });
        // this.$store.commit("set_delete_old_content", true);
        this.$store.commit("clear_element");
        // this.$store.commit("deselect_text");
      }
    },
  },
};
</script>

<style lang="scss">
@import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css");

.swipeout-action {
  display: flex;
  align-items: center;
  padding: 0 1.6rem;
  cursor: pointer;
}

.card {
  width: 100%;
  background-color: #c5e1a5;
  //margin: 10px 0;
}

.card-content {
  //padding: 0.5rem;
  font-size: large;
}
</style>