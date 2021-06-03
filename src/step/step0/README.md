# 开始

## 1. React 创建简单组件

使用 React 创建一个包含`<h1>`标签的组件：

```javascript
import React from "react";
import ReactDOM from "react-dom";

const element = <h1 title="foo">Hello</h1>;
const container = document.getElementById("root");
ReactDOM.render(element, container);
```

## 2.js 实现

使用 js 实现上面相同的效果：

```javascript
const element = {
  type: "h1",
  props: {
    title: "foo",
    children: "Hello",
  },
};

const container = document.getElementById("root");

const node = document.createElement(element.type);
node["title"] = element.props.title;

const text = document.createTextNode("");
text["nodeValue"] = element.props.children;

node.appendChild(text);
container.appendChild(node);
```
