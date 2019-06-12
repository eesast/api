# EESAST API

[![Build Status](https://travis-ci.com/eesast/sast-api.svg?branch=master)](https://travis-ci.com/eesast/sast-api)

EESAST 后端 API

## 支持

- 统一登录接口
- Weekly
- 资源预约与借还

## API 接口

查看 [API 文档](https://api.eesast.com/docs/)

## 开发

### 环境

- Node / npm
- Yarn
- Typescript
- MongoDB

### 工具

- VSCode

  - Prettier / TSLint

- MongoDB Compass Community

### 脚本

#### `yarn install`

安装所有 `dependencies` 和 `devDependencies`

#### `yarn start`

启动开发服务器，自动监听源文件更改（数据库需要自行启动）

#### `yarn build`

使用 `tsc` 编译源文件

#### `yarn serve`

启动生产环境服务器
