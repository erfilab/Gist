import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)


export default new Vuex.Store({
    state: {
        selected: false,
        isSpeaking: false,
        selected_elements: [],
        selected_elements_length: 0,
        cursor_ele_loc: null,
        cursor_ele_loc_id: "",
        new_semantic_content: "",
        current_block_index: 0,
        delete_old_content: false,
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
            state.selected_elements.pop()
            if (state.selected_elements.length === 0)
                state.selected = false
        },
        clear_element(state) {
            state.selected_elements = []
        },
        set_selected_elements_length(state, length) {
            state.selected_elements_length = length
        },
        set_cursor_ele_loc(state, ele_loc) {
            state.cursor_ele_loc = ele_loc
        },
        set_cursor_ele_loc_id(state, ele_loc_id) {
            state.cursor_ele_loc_id = ele_loc_id
        },
        set_new_semantic_content(state, newContent) {
            state.new_semantic_content = newContent
        },
        update_current_index(state, newIndex) {
            state.current_block_index = newIndex
        },
        set_delete_old_content(state, status) {
            state.delete_old_content = status
        }
    },
    actions: {
    },
    modules: {
    }
})
