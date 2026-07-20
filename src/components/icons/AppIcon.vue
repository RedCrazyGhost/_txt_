<script setup lang="ts">
import { computed, useAttrs } from "vue";
import { resolveIconClass, type AppIconName } from "./iconRegistry";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    name: AppIconName;
    /** 兼容旧 FA size 修饰：sm / lg / 1x–3x 等 */
    size?: "sm" | "lg" | "1x" | "2x" | "3x";
    fixedWidth?: boolean;
  }>(),
  {
    size: undefined,
    fixedWidth: false
  }
);

const attrs = useAttrs();

const iconClasses = computed(() => {
  const classes = [...resolveIconClass(props.name)];
  if (props.size) classes.push(`fa-${props.size}`);
  if (props.fixedWidth) classes.push("fa-fw");
  return classes;
});
</script>

<template>
  <i class="app-icon" :class="iconClasses" v-bind="attrs" aria-hidden="true"></i>
</template>

<style scoped>
.app-icon {
  vertical-align: -0.125em;
}
</style>
