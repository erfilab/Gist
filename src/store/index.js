import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
    state: {
        selected: false,
        isSpeaking: false,
        selected_elements: [],
        cursor_ele_loc: null,
    },
    mutations: {
        select_text(state) {
            state.selected = true
        },
        deselect_text(state) {
            state.selected = false
        },
        start_speak(state) {
            state.isSpeaking = true
        },
        stop_speak(state) {
            state.isSpeaking = false
        },
        add_element(state, ele) {
            state.selected_elements.push(ele)
        },
        remove_element(state) {
            state.selected_elements.pop(0)
        },
        clear_element(state) {
            state.selected_elements = []
        },
        set_cursor_ele_loc(state, ele_loc) {
            state.cursor_ele_loc = ele_loc
        },
    },
    actions: {
    },
    modules: {
    }
})
