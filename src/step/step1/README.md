# 一、jsx 背后的秘密

## 1.React 的 jsx 方式实现

```javascript
import React from "react";
import ReactDOM from "react-dom";

const element = (
  <div id="foo">
    <h1>Hello</h1>
    <b />
  </div>
);
const container = document.getElementById("root");
ReactDOM.render(element, container);
```

## 2.jsx 背后的秘密

`jsx`是 javascript 的语法扩展，可以很好的描述 UI 应该呈现出它应有交互的本质形式。在 React 中`jsx`最终会被 Babel 编译成原生的 javascript 代码，Babel 会调用 React 的`React.createElement`方法编译。

```javascript
import React from "react";
import ReactDOM from "react-dom";

const element = React.createElement(
  "div",
  {
    id: "foo",
  },
  React.createElement("h1", null, "Hello"),
  React.createElement("b", null, null)
);
const container = document.getElementById("root");
ReactDOM.render(element, container);
```
