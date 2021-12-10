<template>
    <swipe-list
        ref="list"
        class="card"
        :disabled="!enabled"
        :items="mockSwipeList"
        item-key="id"
        @swipeout:click="itemClick"
    >
        <template v-slot="{ item }">
            <!-- item is the corresponding object from the array -->
            <!-- index is clearly the index -->
            <!-- revealLeft is method which toggles the left side -->
            <!-- revealRight is method which toggles the right side -->
            <!-- close is method which closes an opened side -->
            <div class="card-content">
                <!-- style content how ever you like -->
                <p>{{ item.description }}</p>
            </div>
        </template>
        <!-- left swipe side template and v-slot:left="{ item }" is the item clearly -->
        <!-- remove if you dont wanna have left swipe side  -->
        <template v-slot:left="{ item, close }">
            <div class="swipeout-action red" title="remove" @click="remove(item)">
                <!-- place icon here or what ever you want -->
                <i class="fa fa-trash"></i>
            </div>
            <div class="swipeout-action purple" @click="close">
                <!-- place icon here or what ever you want -->
                <i class="fa fa-close"></i>
            </div>
        </template>
        <!-- right swipe side template and v-slot:right"{ item }" is the item clearly -->
        <!-- remove if you dont wanna have right swipe side  -->
        <template v-slot:right="{}">
            <div class="swipeout-action blue">
                <!-- place icon here or what ever you want -->
                <i class="fa fa-heart"></i>
            </div>
            <div class="swipeout-action green">
                <!-- place icon here or what ever you want -->
                <i class="fa fa-heart"></i>
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
import { SwipeList } from 'vue-swipe-actions';
import 'vue-swipe-actions/dist/vue-swipe-actions.css';

export default {
    name: 'Home',

    components: {
        SwipeList
    },
    data() {
        return {
            enabled: true,
            mockSwipeList: [
                {
                    id: 0,
                    description: "some description"
                },
            ]
        };
    },
    methods: {
        revealFirstRight() {
            this.$refs.list.revealRight(0);
        },
        revealFirstLeft() {
            this.$refs.list.revealLeft(0);
        },
        closeFirst() {
            this.$refs.list.closeActions(0);
        },
        closeAll() {
            this.$refs.list.closeActions();
        },
        remove(item) {
            this.mockSwipeList = this.mockSwipeList.filter(i => i !== item);
            // console.log(e, 'remove');
        },
        itemClick(e) {
            console.log(e, "item click");
        },
        fbClick(e) {
            console.log(e, "First Button Click");
        },
        sbClick(e) {
            console.log(e, "Second Button Click");
        },
    },
}
</script>

<style lang="scss">
@import url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css");

.swipeout-list {
    display: flex;
    flex-direction: column;
}
.swipeout-action {
    display: flex;
    > div {
        display: flex;
        align-items: center;
        padding: 0 3rem;
        cursor: pointer;
    }
    &.action-panel-right {
        > div {
            background-color: dodgerblue;
            color: white;
            &:hover {
                background-color: darken(dodgerblue, 5%);
            }
        }
    }
    &.action-panel-left {
        > div:nth-of-type(even) {
            background-color: darkorchid;
            color: white;
            &:hover {
                background-color: darken(darkorchid, 5%);
            }
        }
        > div:nth-of-type(odd) {
            background-color: dodgerblue;
            color: white;
            &:hover {
                background-color: darken(dodgerblue, 5%);
            }
        }
    }
}
.swipeout-list-item {
    flex: 1;
    border-bottom: 1px solid lightgray;
    &:last-of-type {
        border-bottom: none;
    }
}
.card {
    width: 100%;
    background-color: white;
    border-radius: 3px;
    box-shadow: none;
    border: 1px solid lightgray;
}
.card-content {
    padding: 1rem;
}
</style>