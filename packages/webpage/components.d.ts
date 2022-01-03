declare module 'vue' {
  type ui = typeof import('naive-ui')
  export interface GlobalComponents extends ui {}
}

export {}
