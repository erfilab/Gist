import Vue from 'vue'
import VueTouch from 'vue-touch'

VueTouch.registerCustomEvent('singletap', {
    type: 'tap',
    taps: 1,
})

VueTouch.registerCustomEvent('doubletap', {
    type: 'tap',
    taps: 2,
})

Vue.use(VueTouch, {name: 'v-touch'})

export default {VueTouch}