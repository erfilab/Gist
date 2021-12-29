<template>
    <swipe-list
        ref="list"
        class="card"
        :items="mockSwipeList"
        item-key="id"
        id="swipe_text"
    >
        <template v-slot="{ item }">
            <!-- item is the corresponding object from the array -->
            <!-- index is clearly the index -->
            <!-- revealLeft is method which toggles the left side -->
            <!-- revealRight is method which toggles the right side -->
            <!-- close is method which closes an opened side -->
            <div class="card-content">
                <!-- style content how ever you like -->
                <p style="margin-bottom: 0">{{ item }}</p>
            </div>
        </template>
        <!-- right swipe side template and v-slot:right"{ item }" is the item clearly -->
        <!-- remove if you dont wanna have right swipe side  -->
        <template v-slot:right="{item}">
            <div class="swipeout-action red" @click="remove(item)">
                <!-- place icon here or what ever you want -->
                <i class="fa fa-trash"></i>
            </div>
        </template>
        <template v-slot:empty>
            <div>
                <!-- change mockSwipeList to an empty array to see this slot in action  -->
                list is empty ( filtered or just empty )
            </div>
        </template>
    </swipe-list>
</template>

<script>
import {SwipeList} from 'vue-swipe-actions';
import 'vue-swipe-actions/dist/vue-swipe-actions.css';

export default {
    name: 'SwipeText',

    components: {
        SwipeList
    },

    data() {
        return {
            mockSwipeList: []  // the required is a list, we cannot change the type
        };
    },

    computed: {
        isSpeaking_val() {
            return this.$store.state.isSpeaking
        },
    },

    watch: {
        isSpeaking_val() {
            if (this.$store.state.isSpeaking) {
                this.mockSwipeList = []
                let content = ''
                this.$store.state.selected_elements.forEach(ele => {
                    content += ele.innerHTML
                })
                this.mockSwipeList.push(content)
            }
        }
    },

    methods: {
        remove(item) {
            this.mockSwipeList = this.mockSwipeList.filter(i => i !== item);
        }
    },
}
</script>

<style lang="scss">
@import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css");

.swipeout-action {
    display: flex;
    align-items: center;
    padding: 0 2rem;
    cursor: pointer;
}

.card {
    width: 100%;
    background-color: #C5E1A5;
    //margin: 10px 0;
}

.card-content {
    //padding: 0.5rem;
}
</style>