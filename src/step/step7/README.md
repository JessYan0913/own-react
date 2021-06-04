# 七、函数式组件实现

前面使用了简单组件，在 React 中函数式组件的使用十分频繁。如何在 Didact 中也实现函数式组件？

## 1.在 React 定义函数组件

```javascript
import React from "react";
import ReactDOM from "react-dom";

function App(props) {
  return <h1>Hellow {props.name}</h1>;
}
const element = <App name="world" />;
const container = document.getElementById("root");
ReactDOM.render(element, container);
```

定义了函数`App`，在`App`中返回了需要渲染的组件。同时`App`函数接收一个 props 实现父组件给组件传值。

## 2.在 Didact 中编译函数式组件

函数式组件经过 Babel 编译后，会是什么样？

```javascript
/** @jsx Didact.createElement */
function App(props) {
  return <h1>Hellow {props.name}</h1>;
}
const element = <App name="world" />;
console.log(element);
```

![Step6FunctionElement](https://github.com/JessYan0913/own-react/blob/master/src/assets/step6-functionelement.png)

可见函数式组件与简单组件的不同有：

- 函数式组件的`type`并不是标签名。
- 函数式组件的元素来自函数的返回值。

## 3.实现函数式组件

根据[2.在 Didact 中编译函数式组件](##2.在-Didact-中编译函数式组件)中的打印结果，需要在`Didact.render`中执行组件函数，得到返回的元素后再渲染。

修改`performUnitOfWork`函数，在`performUnitOfWork`中执行组件函数，并处理：

```javascript
function performUnitOfWork(fiber) {
  // if (!fiber.dom) {
  //   fiber.dom = createDom(fiber);
  // }

  // const elements = fiber.props.children;
  // reconcileChildren(fiber, elements);

  const isFunctionComponent = fiber.type instanceof Function;
  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  if (fiber.child) {
    return fiber.child;
  }

  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
}

function updateFunctionComponent(fiber) {
  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
}

function updateHostComponent(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  const elements = fiber.props.children;
  reconcileChildren(fiber, elements);
}
```

由于函数是组件传入的 Fiber 是没有 DOM 节点，我们需要在 DOM 挂载时，沿着 Fiber 树往上找到存在 DOM 节点的节点。

```javascript
function commitWork(fiber) {
  if (!fiber) return;

  // const domParent = fiber.parent.dom;

  let domParentFiber = fiber.parent;
  while(!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber.dom;

  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === "DELETION") {
    domParent.removeChild(fiber.dom);
  }

  commitWork(fiber.child);
  commitWork(fiber.sibling);
}
```
