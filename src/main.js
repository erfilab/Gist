import Vue from 'vue'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import VueTouch from './plugins/vue-touch'
import store from './store'
// import wrap from "@vue/web-component-wrapper";
// import SemanticText from "@/components/SemanticText";

Vue.config.productionTip = false

new Vue({
  router,
  vuetify,
  VueTouch,
  store,
  render: h => h(App)
}).$mount('#app')

// const semanticTextTranscribed = wrap(Vue, SemanticText)
// window.customElements.define('semantic-text-transcribed', semanticTextTranscribed);