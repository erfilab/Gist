import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)


export default new Vuex.Store({
    state: {
        selectedNo: 0,
        selected_elements: [],
        
        semanticList: [],
        new_semantic_content: "",
        previous_length: 0,
        current_block_index: 0,
        current_target_block: null,
    },
    getters: {
        selectedElements: state => {
            return state.selected_elements
        },
        newSemanticContent: state => state.new_semantic_content,
        selectedNo: state => state.selectedNo,
        semanticList: state => state.semanticList,
        previous_length: state => state.previous_length,
        current_target_block: state => state.current_target_block,
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
        update_current_index(state, newIndex) {
            state.current_block_index = newIndex
        },
        update_current_target_block(state, newBlock) {
            state.current_target_block = newBlock
        },
    },
    actions: {},
    modules: {}
})