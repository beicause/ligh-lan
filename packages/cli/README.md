# ligh-lan-cli

a server for sharing and editing files in LAN, used by [ligh-lan](https://github.com/beicause/light-lan)

## Usage

Install it from npm

```sh
npm i -g ligh-lan-cli
```

Use its command `lan`

```sh
lan [path]
```

or use its JavaScript API

```javascript
const { server } = require('ligh-lan-cli')

server.serveDir(path, port, hostname)
```
