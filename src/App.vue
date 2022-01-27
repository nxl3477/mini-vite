<template>
  <div class="demo">
    hello vite
    {{count}}

    <button @click="count++">增加</button>
  </div>
</template>
<script>
import { ref } from 'vue'
export default {
  setup() {
    const count = ref(0)
    return {
      count
    }
  },
  mounted () {
  }
}
</script>
<style lang="less">
.demo {

}
</style>