/* eslint-disable @typescript-eslint/no-var-requires */
console.log(__dirname)
const fs = require('fs')
const path = require('path')

const page = path.resolve(__dirname, '../packages/webpage/dist')
if (!fs.existsSync(page))
  require('child_process').execSync('pnpm build', {
    cwd: path.resolve(__dirname, '../packages/webpage')
  })
copyDir(page, path.resolve(__dirname, '../packages/electron/dist/page'))

// 创建to目录并复制form内所有内容
function copyDir(from, to) {
  if (fs.existsSync(to)) throw Error('文件已存在：' + to)
  fs.mkdirSync(to)
  const files = fs.readdirSync(from)
  files.forEach(f => {
    const fp = path.resolve(from, f)
    const tp = path.resolve(to, f)
    if (fs.statSync(fp).isDirectory()) {
      copyDir(fp, tp)
    } else {
      fs.copyFileSync(fp, tp)
    }
  })
}
