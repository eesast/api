# EESAST API

[![Build Status](https://travis-ci.com/eesast/api.svg?branch=master)](https://travis-ci.com/eesast/api)

EESAST 后端 API

## 功能

- 用户验证
- 静态文件权限管理

**其余逻辑均使用 Hasura**

## API 接口

查看[文档](https://eesast.com/api)

## 开发

### 环境

- node 16 / npm
- yarn
- TypeScript
- MongoDB

### 工具

- VSCode 扩展

  - Prettier
  - ESLint

- MongoDB Compass Community

- Postman

### 脚本

#### `yarn install`

安装所有 `dependencies` 和 `devDependencies`

#### `yarn start`

启动开发服务器，自动监听源文件更改（数据库需要自行启动）

#### `yarn debug`

配合 VSCode 调试服务器。操作方式如下：

1. 设置断点；
2. 按下 F5，或在调试窗口点击绿色箭头。

#### `yarn build`

使用 `babel` 编译源文件

#### `yarn serve`

在 `yarn build` 生成的 `build` 文件夹中运行，启动生产环境服务器

#### `yarn lint`

使用 ESLint 进行代码风格检查

#### `yarn typecheck`

检查类型错误
