<script setup>
import AppName from "./AppName.vue";

const props = defineProps({
  state: { type: Object, required: true }
});

function judgeColorChangeFontColor(color) {
  return color === "light" ? "dark" : "light";
}

function changeAppColor() {
  props.state.webSiteConfig.appColor =
    props.state.webSiteConfig.appColor === "light" ? "dark" : "light";
}

function changeIClass() {
  return props.state.webSiteConfig.appColor === "light"
    ? "far fa-sun fa-spin fa-lg"
    : "fas fa-moon fa-lg";
}

function changeIStyle() {
  return props.state.webSiteConfig.appColor === "light"
    ? "color:var(--bs-warning)"
    : "color:var(--bs-primary)";
}
</script>

<template>
  <nav
    :class="`by-4 navbar navbar-expand-lg navbar-${state.webSiteConfig.appColor} bg-body app-chrome`"
  >
    <div class="container">
      <router-link class="navbar-brand" to="/home">
        <AppName />
      </router-link>
      <i :class="changeIClass()" :style="changeIStyle()" @click="changeAppColor"></i>
      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarNav"
        aria-controls="navbarNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>
      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav" style="margin-left: auto">
          <li class="nav-item" v-for="router in state.webSiteConfig.appRouters" :key="router.to">
            <router-link
              :to="router.to"
              :class="`nav-link ${$route.name === router.name ? 'active' : ''}`"
            >
              {{ router.label || router.name }}
            </router-link>
          </li>
          <li class="nav-item">
            <a
              class="nav-link"
              href="https://github.com/RedCrazyGhost/_txt_"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub 仓库"
              title="GitHub"
            >
              <i class="fab fa-github fa-lg"></i>
            </a>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>
