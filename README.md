# EESAST API

[![Build Status](https://travis-ci.com/eesast/api.svg?branch=master)](https://travis-ci.com/eesast/api)

EESAST 后端 API

## 功能

- 登录接口
- 科协公共信息
- 组队系统
- 文件上传与下载
- 队式需求对接
- Weekly
- 资源预约与借还

## API 接口

查看 [API 文档](https://eesast.com/api)

## 开发

### 环境

- node 12 / npm
- yarn
- TypeScript
- MongoDB

### 工具

- VSCode 扩展

  - Prettier
  - ESLint

    在 VSCode 设置中添加以下内容，开启 ESLint 插件对 TypeScript 的支持：

    ```json
    "eslint.autoFixOnSave": true,
    "eslint.validate": [
        "javascript",
        "javascriptreact",
        { "language": "typescript", "autoFix": true },
        { "language": "typescriptreact", "autoFix": true }
    ],
    ```

- MongoDB Compass Community

- Postman

### 脚本

#### `yarn install`

安装所有 `dependencies` 和 `devDependencies`

#### `yarn start`

启动开发服务器，自动监听源文件更改（数据库需要自行启动）

#### `yarn build`

使用 `tsc` 编译源文件

#### `yarn serve`

在 `yarn build` 生成的 `build` 文件夹中运行，启动生产环境服务器

#### `yarn dev:debug`

配合 VSCode 调试服务器。操作方式如下：

- 无需手动执行该命令。只需切换到 VSCode 的调试窗口，运行 `Debug server` 调试配置。
- 或者，先运行该命令，然后运行 `Attach` 调试配置。

#### `yarn test`

运行 mocha 测试

#### `yarn test:debug`

调试测试，对应 VSCode 的 `Debug test` 调试配置。

#### `yarn lint`

使用 ESLint 进行代码风格检查

#### `yarn typecheck`

检查类型错误

#### `yarn prettier`

使用 Prettier 进行代码格式修正
