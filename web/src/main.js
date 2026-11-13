import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import {
  ElButton,
  ElInput,
  ElForm,
  ElFormItem,
  ElCheckbox,
  ElCheckboxGroup,
  ElSelect,
  ElOption,
  ElDialog,
  ElMenu,
  ElMenuItem,
  ElSkeleton,
  ElSkeletonItem,
  ElContainer,
  ElAside,
  ElMain,
  ElRadioGroup,
  ElRadioButton,
} from 'element-plus'
import '@fontsource-variable/dm-sans'
import 'element-plus/theme-chalk/base.css'
import 'element-plus/theme-chalk/el-overlay.css'
import 'element-plus/theme-chalk/el-popper.css'
import 'element-plus/theme-chalk/el-scrollbar.css'
import 'element-plus/theme-chalk/el-icon.css'
import 'element-plus/theme-chalk/el-button.css'
import 'element-plus/theme-chalk/el-input.css'
import 'element-plus/theme-chalk/el-form.css'
import 'element-plus/theme-chalk/el-checkbox.css'
import 'element-plus/theme-chalk/el-checkbox-group.css'
import 'element-plus/theme-chalk/el-select.css'
import 'element-plus/theme-chalk/el-option.css'
import 'element-plus/theme-chalk/el-dialog.css'
import 'element-plus/theme-chalk/el-menu.css'
import 'element-plus/theme-chalk/el-menu-item.css'
import 'element-plus/theme-chalk/el-skeleton.css'
import 'element-plus/theme-chalk/el-skeleton-item.css'
import 'element-plus/theme-chalk/el-container.css'
import 'element-plus/theme-chalk/el-aside.css'
import 'element-plus/theme-chalk/el-main.css'
import 'element-plus/theme-chalk/el-radio-group.css'
import 'element-plus/theme-chalk/el-radio-button.css'
import 'element-plus/theme-chalk/el-message.css'
import 'element-plus/theme-chalk/el-message-box.css'
import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/user'
import { AUTH_STORAGE_KEY } from './utils/auth-storage'
import { safeDestination } from './router/policy'
import './styles/tokens.css'
import './styles/global.css'

const app = createApp(App)
const pinia = createPinia().use(piniaPluginPersistedstate)
app.use(pinia)
for (const component of [
  ElButton,
  ElInput,
  ElForm,
  ElFormItem,
  ElCheckbox,
  ElCheckboxGroup,
  ElSelect,
  ElOption,
  ElDialog,
  ElMenu,
  ElMenuItem,
  ElSkeleton,
  ElSkeletonItem,
  ElContainer,
  ElAside,
  ElMain,
  ElRadioGroup,
  ElRadioButton,
])
  app.component(component.name, component)

function clearAndReturnToLogin() {
  const store = useUserStore()
  store.clearSession()
  if (router.currentRoute.value.name !== 'login')
    router.replace({
      name: 'login',
      query: { redirect: safeDestination(router.currentRoute.value.fullPath), reason: 'expired' },
    })
}
const storageHandler = (event) => {
  if (event.key === AUTH_STORAGE_KEY && event.newValue === null) clearAndReturnToLogin()
}
window.addEventListener('shiguang:unauthorized', clearAndReturnToLogin)
window.addEventListener('storage', storageHandler)
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    window.removeEventListener('shiguang:unauthorized', clearAndReturnToLogin)
    window.removeEventListener('storage', storageHandler)
  })
app.use(router)
app.mount('#app')
