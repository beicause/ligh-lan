# Ligh-LAN

a desktop application based on electron for sharing and editing files in LAN

![app](https://raw.githubusercontent.com/beicause/ligh-lan/master/images/app.png)

## Features

* serve a directory, then by entering the server's url, any devices in the same local area network can see it.
* create, edit, upload and delete files in the shared directory.

## Build

1. Clone this project

```
git clone https://github.com/beicause/ligh_lan
```

2. Install dependencies using pnpm

```
pnpm i
```

3. Build. Then the output will be in `packages/electron/out`

```
pnpm build
```

## Notice

DON'T  share sensitive information unless you know what you are doing. For example, your bank card PIN or your credit card expiry date. 
