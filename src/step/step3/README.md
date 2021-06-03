# 三、组件渲染

## 1.React 渲染组件

React 通过`React.createElement`创建元素，通过`ReactDOM.render`将元素渲染到页面。

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

![ReactRenderHello](../../assets/step3-hello.png)

## 2.`ReactDOM.render`做了什么？

`ReactDOM.render`是创建 DOM 元素并将 DOM 挂载到 container 上。根据这样的功能，自定义`render`:

```javascript
function render(element, container) {
  const dom = element.type === "TEXT_ELEMENT" ? document.createTextNode("") : document.createElement(element.type);

  const isProperty = (key) => key !== "children";
  Object.keys(element.props)
    .filter(isProperty)
    .forEach((name) => {
      dom[name] = element.props[name];
    });

  element.props.children
    .filter((child) => child)
    .forEach((child) => {
      render(child, dom);
    });

  container.appendChild(dom);
}
```

将`render`添加到`Didact`对象：

```javascript
const Didact = {
  createElement,
  render,
};
```

## 3.使用自定义的`render`渲染

使用自定义的`render`实现[React 渲染组件](##1.React-渲染组件)中的效果：

```javascript
const element = Didact.createElement(
  "div",
  {
    id: "foo",
  },
  Didact.createElement("h1", null, "Hello"),
  Didact.createElement("b", null, null)
);
const container = document.getElementById("root");
Didact.render(element, container);
```

检验一下`style`等属性是否可以生效：

```javascript
const element = Didact.createElement(
  "div",
  {
    style: "background: salmon",
  },
  Didact.createElement("h1", null, "Hello World"),
  Didact.createElement(
    "h2",
    {
      style: "text-align:right",
    },
    "from Didact"
  )
);
const container = document.getElementById("root");
Didact.render(element, container);
```

![DidactRenderCssElement](../../assets/step3-css.png)

## 4.使用 jsx 的方式编写 Didact 组件

之前了解了 Babel 在编译 jsx 时，调用了`React.createElement`。那么如果将 Babel 编译调用的`React.createElement`替换成`Didact.createElement`，就可以实现使用 jsx 方式编译组件了。

在代码的顶部加入 Babel 编译注解：

```javascript
/** @jsxRuntime classic */
```

在组件上方加入 Babel 编译器注解：

```javascript
/** @jsx Didact.createElement */
const element = (
  <div style="background: salmon">
    <h1>Hello World</h1>
    <h2 style="text-align:right">from Didact</h2>
  </div>
);

const container = document.getElementById("root");
Didact.render(element, container);
```
