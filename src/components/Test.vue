<template>
    <span>This is a test for ve.vue</span>
</template>

<script>
export default {
    name: "Test",
    props: ['content'],
    mounted() {
        console.log(this.content)
    }
}
</script>