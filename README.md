# sast-app-api

[![Build Status](https://travis-ci.org/eesast/sast-app-api.svg?branch=master)](https://travis-ci.org/eesast/sast-app-api)

SAST App 后端 API

## 支持

- 统一登录接口
- Weekly
- 资源预约与借还

## API 接口

查看 [API 文档](https://api.eesast.com/docs/)

## 开发

### 环境

- Node ^11.7.0
- Typescript ^3.2.2
- MongoDB ^4.0.4

### 工具

- VSCode

  - Prettier / TSLint

- MongoDB Compass Community

### 脚本

#### `npm install`

安装所有 `dependencies` 和 `devDependencies`

#### `npm start`

启动开发服务器，自动监听源文件更改（数据库需要自行启动）

#### `npm run build`

使用 `tsc` 编译源文件

#### `npm run serve`

启动生产环境服务器
