import Vue from 'vue'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import VueTouch from './plugins/vue-touch'
import store from './store'

Vue.config.productionTip = false

new Vue({
  router,
  vuetify,
  VueTouch,
  store,
  render: h => h(App)
}).$mount('#app')
