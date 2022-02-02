import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)


export default new Vuex.Store({
    state: {
        selectedNo: 0,
        selected_elements: [],
        
        semanticList: [],

        cursor_ele_loc: null,
        new_semantic_content: "",
        previous_length: 0,
        current_block_index: 0,
    },
    getters: {
        selectedElements: state => {
            return state.selected_elements
        },
        newSemanticContent: state => state.new_semantic_content,
        selectedNo: state => state.selectedNo,
        semanticList: state => state.semanticList,
        previous_length: state => state.previous_length,
    },
    mutations: {
        change_location_speaking(state) {
            state.new_semantic_content = ""
            state.previous_length = 0
        },
        set_previous_length(state, length) {
            state.previous_length = length
        },

        set_semanticList(state, payload) {
            state.semanticList = payload
        },
        add_selectedNo(state, payload) {
            state.selectedNo += payload
        },
        set_new_semantic_content(state, newContent) {
            state.new_semantic_content = newContent
        },

        add_element(state, ele) {
            state.selected_elements.push(ele)
        },
        remove_element(state) {
            state.selected_elements.pop()
        },
        clear_element(state) {
            state.selected_elements = []
        },

        set_cursor_ele_loc(state, ele_loc) {
            state.cursor_ele_loc = ele_loc
        },
        update_current_index(state, newIndex) {
            state.current_block_index = newIndex
        },

    },
    actions: {},
    modules: {}
})